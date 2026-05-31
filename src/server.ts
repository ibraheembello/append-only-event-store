import { config } from './config';
import { EventStore } from './services/eventStore.service';
import { createApp } from './app';

const start = async (): Promise<void> => {
  const store = new EventStore(config.logFile);

  // Recover BEFORE accepting traffic so reads work immediately after restart.
  const recovered = await store.recover();
  console.log(
    `[recovery] Rebuilt index from ${config.logFile} — recovered ${recovered} event(s).`,
  );

  const app = createApp(store);
  app.listen(config.port, () => {
    console.log(`[server] Event store listening on http://localhost:${config.port}`);
  });
};

start().catch((err) => {
  console.error('[fatal] Failed to start server:', err);
  process.exit(1);
});
