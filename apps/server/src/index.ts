import { serve } from '@hono/node-server';
import { resolve } from 'node:path';
import { createApp } from './app.js';
import { createAuthenticator } from './auth.js';
import { readConfig } from './config.js';
import { connectDatabase } from './db/connection.js';
import { Repository } from './db/store.js';
import { MockCoach } from './services/coach.js';
const config = readConfig();
const connection = await connectDatabase({
  driver: config.DATABASE_DRIVER,
  url: config.DATABASE_URL,
  dataDir: resolve(config.PGLITE_DATA_DIR),
});
if (config.DATABASE_DRIVER === 'pglite') await connection.migrate();
const repository = new Repository(connection.db);
await repository.health();
const app = createApp({
  repository,
  authenticate: createAuthenticator(config),
  origins: config.origins,
  coach: config.COACH_MODE === 'mock' ? new MockCoach() : undefined,
  logging: true,
});
const server = serve({ fetch: app.fetch, hostname: config.HOST, port: config.PORT }, (info) =>
  console.log(
    `HEYAZ API http://${config.HOST}:${info.port} (${config.AUTH_MODE}, ${config.DATABASE_DRIVER}, coach=${config.COACH_MODE})`,
  ),
);
let closing = false;
const close = () => {
  if (closing) return;
  closing = true;
  const timeout = setTimeout(() => process.exit(1), 20000);
  timeout.unref();
  server.close(() => {
    void connection
      .close()
      .then(() => {
        clearTimeout(timeout);
        process.exit(0);
      })
      .catch(() => process.exit(1));
  });
};
process.on('SIGINT', close);
process.on('SIGTERM', close);
