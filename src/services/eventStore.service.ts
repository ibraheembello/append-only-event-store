import fs from 'fs';
import fsp from 'fs/promises';
import readline from 'readline';
import { generateId } from '../utils/id';

/** Where a single event's JSON line lives inside events.log, measured in BYTES. */
export interface IndexEntry {
  offset: number; // byte position where the JSON line starts
  length: number; // byte length of the JSON line (excludes the trailing "\n")
}

export interface StoredEvent {
  id: string;
  createdAt: string;
  [key: string]: unknown;
}

/**
 * The log file IS the database.
 *
 * - Writes append one JSON object per line and record its byte (offset, length)
 *   in an in-memory Map. We never overwrite or delete.
 * - Reads seek directly to (offset, length) and parse just that slice — no scan.
 * - On startup, recover() replays the log to rebuild the Map from the file alone.
 *
 * All offsets/lengths are measured in BYTES (via Buffer.byteLength) so that
 * events containing multi-byte unicode are indexed and read back correctly.
 */
export class EventStore {
  private readonly logFile: string;
  private readonly index = new Map<string, IndexEntry>();
  private byteOffset = 0; // total bytes written so far == current file size

  private appendHandle: fsp.FileHandle | null = null;
  private readHandle: fsp.FileHandle | null = null;

  // Appends are serialized through this promise chain so that each write is
  // assigned a correct, non-overlapping offset even under concurrent requests.
  private writeChain: Promise<unknown> = Promise.resolve();

  constructor(logFile: string) {
    this.logFile = logFile;
  }

  /**
   * Stream events.log line by line, rebuilding the in-memory index from byte
   * offsets. Returns the number of events recovered.
   */
  async recover(): Promise<number> {
    // Make sure the file exists without truncating it (append "" is a no-op write).
    await fsp.appendFile(this.logFile, '');
    const stat = await fsp.stat(this.logFile);

    let recovered = 0;
    let offset = 0;

    if (stat.size > 0) {
      const stream = fs.createReadStream(this.logFile, { encoding: 'utf8' });
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

      for await (const line of rl) {
        const lineBytes = Buffer.byteLength(line, 'utf8');
        if (line.trim().length > 0) {
          try {
            const event = JSON.parse(line) as StoredEvent;
            if (event && typeof event.id === 'string') {
              this.index.set(event.id, { offset, length: lineBytes });
              recovered++;
            }
          } catch {
            // A corrupt or partial trailing line (e.g. a crash mid-write) is skipped.
          }
        }
        offset += lineBytes + 1; // +1 for the "\n" we always append after each line
      }
    }

    this.byteOffset = stat.size;
    this.appendHandle = await fsp.open(this.logFile, 'a'); // append-only writes
    this.readHandle = await fsp.open(this.logFile, 'r'); // positioned reads
    return recovered;
  }

  /**
   * Stamp the event with a UUID + createdAt, append it as one JSON line, and
   * update the index. Returns the full stored event.
   */
  async append(body: Record<string, unknown>): Promise<StoredEvent> {
    const event: StoredEvent = {
      ...body,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };

    const result = this.writeChain.then(async () => {
      const line = JSON.stringify(event);
      const buf = Buffer.from(line + '\n', 'utf8');
      const length = Buffer.byteLength(line, 'utf8');
      const offset = this.byteOffset;

      await this.appendHandle!.write(buf);
      this.byteOffset += buf.length;
      this.index.set(event.id, { offset, length });
      return event;
    });

    // Keep the chain alive even if a write rejects, so later writes still run.
    this.writeChain = result.catch(() => undefined);
    return result;
  }

  /**
   * Look the id up in the index and read exactly `length` bytes at `offset`.
   * Returns null when the id is unknown. Never scans the file.
   */
  async read(id: string): Promise<StoredEvent | null> {
    const entry = this.index.get(id);
    if (!entry) return null;

    const buffer = Buffer.alloc(entry.length);
    await this.readHandle!.read(buffer, 0, entry.length, entry.offset);
    return JSON.parse(buffer.toString('utf8')) as StoredEvent;
  }

  /** { total events indexed, total bytes in the log }. */
  stats(): { total: number; bytes: number } {
    return { total: this.index.size, bytes: this.byteOffset };
  }
}
