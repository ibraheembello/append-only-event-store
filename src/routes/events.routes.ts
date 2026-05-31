import { Router } from 'express';
import { EventsController } from '../controllers/events.controller';

export const buildEventsRouter = (controller: EventsController): Router => {
  const router = Router();

  router.post('/events', controller.create);
  router.get('/stats', controller.stats);
  router.get('/events/:id', controller.getById);

  return router;
};
