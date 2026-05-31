import { Request, Response } from 'express';
import { EventStore } from '../services/eventStore.service';

export class EventsController {
  constructor(private readonly store: EventStore) {}

  /** POST /events — stamp, append, return 201 with the full event. */
  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const event = await this.store.append(body);
      res.status(201).json(event);
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /** GET /events/:id — seek via the index, 404 if unknown. */
  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const event = await this.store.read(req.params.id);
      if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }
      res.status(200).json(event);
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /** GET /stats — { total, bytes }. */
  stats = (_req: Request, res: Response): void => {
    res.status(200).json(this.store.stats());
  };
}
