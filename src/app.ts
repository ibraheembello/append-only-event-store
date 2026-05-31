import express, { Application } from 'express';
import swaggerUi from 'swagger-ui-express';
import { EventStore } from './services/eventStore.service';
import { EventsController } from './controllers/events.controller';
import { buildEventsRouter } from './routes/events.routes';
import { openapiSpec } from './docs/openapi';

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

  // Swagger UI for manual endpoint testing (documentation layer only).
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

  const controller = new EventsController(store);
  app.use('/', buildEventsRouter(controller));

  return app;
};
