import express, { Application } from 'express';
import { EventStore } from './services/eventStore.service';
import { EventsController } from './controllers/events.controller';
import { buildEventsRouter } from './routes/events.routes';

export const createApp = (store: EventStore): Application => {
  const app = express();

  app.use(express.json());

  // Allow any origin, as required.
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  const controller = new EventsController(store);
  app.use('/', buildEventsRouter(controller));

  return app;
};
