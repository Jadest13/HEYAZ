import { resolve } from 'node:path';
import { readConfig } from '../config.js';
import { connectDatabase } from './connection.js';
const config = readConfig();
const connection = await connectDatabase({
  driver: config.DATABASE_DRIVER,
  url: config.DATABASE_URL,
  dataDir: resolve(config.PGLITE_DATA_DIR),
});
try {
  await connection.migrate();
  console.log('Database migrations applied.');
} finally {
  await connection.close();
}
