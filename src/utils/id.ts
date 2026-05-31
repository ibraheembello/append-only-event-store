import { randomUUID } from 'crypto';

/** Generate a UUID v4 using the Node standard library (no dependency needed). */
export const generateId = (): string => randomUUID();
