import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { expect, it } from 'vitest';
import { profileSchema } from '@heyaz/contracts';
import { connectDatabase } from './connection.js';
import { Repository } from './store.js';
import { seed } from '../seed.js';
async function removeTestDirectory(root: string, folder: string) {
  const resolved = resolve(await realpath(folder));
  if (!resolved.startsWith(`${resolve(root)}${sep}heyaz-server-test-`))
    throw new Error('Unexpected test directory');
  await rm(resolved, { recursive: true });
}
it('persists committed data and replay receipts across database restart', async () => {
  const root = await realpath(tmpdir());
  const folder = await mkdtemp(join(root, 'heyaz-server-test-'));
  const dataDir = join(folder, 'nested', 'postgres');
  let connection: Awaited<ReturnType<typeof connectDatabase>> | undefined;
  try {
    connection = await connectDatabase({ driver: 'pglite', dataDir });
    await connection.migrate();
    const request = { key: 'test-request', fingerprint: 'test-fingerprint' };
    const first = await new Repository(connection.db).run(
      'persisted-user',
      async (store) => {
        await seed(store, new Date('2026-09-08T01:00:00Z'));
        const profile = await store.require('profile', 'current', profileSchema);
        profile.name = '다시 시작';
        await store.put('profile', 'current', profile);
        return { saved: true };
      },
      request,
    );
    await connection.close();
    connection = undefined;
    connection = await connectDatabase({ driver: 'pglite', dataDir });
    await connection.migrate();
    const repository = new Repository(connection.db);
    const profile = await repository.run('persisted-user', (store) =>
      store.require('profile', 'current', profileSchema),
    );
    expect(profile.name).toBe('다시 시작');
    const replay = await repository.run(
      'persisted-user',
      async () => {
        throw new Error('Must replay without executing');
      },
      request,
    );
    expect(replay).toEqual(first);
  } finally {
    await connection?.close();
    await removeTestDirectory(root, folder);
  }
}, 30000);
