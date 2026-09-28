import { and, asc, eq, sql } from 'drizzle-orm';
import type { z } from 'zod';
import type { Database, Transaction } from './connection.js';
import { accounts, resources, requests, usageLedger } from './schema.js';
import { ApiError } from '../errors.js';
export type ResourceKind =
  | 'profile'
  | 'plan'
  | 'session'
  | 'metric'
  | 'assessment'
  | 'burning'
  | 'message'
  | 'proposal'
  | 'usage';
export class UserStore {
  constructor(
    private tx: Transaction,
    readonly userId: string,
    readonly paid: boolean,
  ) {}
  private where(kind: ResourceKind, id?: string) {
    return and(
      eq(resources.userId, this.userId),
      eq(resources.kind, kind),
      id === undefined ? undefined : eq(resources.id, id),
    );
  }
  async get<S extends z.ZodType>(
    kind: ResourceKind,
    id: string,
    schema: S,
  ): Promise<z.output<S> | undefined> {
    const [row] = await this.tx
      .select({ data: resources.data })
      .from(resources)
      .where(this.where(kind, id));
    if (!row) return undefined;
    const result = schema.safeParse(row.data);
    if (!result.success)
      throw new Error(`Stored ${kind} failed validation`, { cause: result.error });
    return result.data;
  }
  async require<S extends z.ZodType>(
    kind: ResourceKind,
    id: string,
    schema: S,
  ): Promise<z.output<S>> {
    const value = await this.get(kind, id, schema);
    if (!value) throw new ApiError(404, 'NOT_FOUND', '요청한 데이터를 찾을 수 없습니다.');
    return value;
  }
  async list<S extends z.ZodType>(kind: ResourceKind, schema: S): Promise<z.output<S>[]> {
    const rows = await this.tx
      .select({ data: resources.data })
      .from(resources)
      .where(this.where(kind))
      .orderBy(asc(resources.createdAt), asc(resources.id));
    return rows.map(({ data }) => {
      const result = schema.safeParse(data);
      if (!result.success)
        throw new Error(`Stored ${kind} failed validation`, { cause: result.error });
      return result.data;
    });
  }
  async put(kind: ResourceKind, id: string, data: unknown) {
    await this.tx
      .insert(resources)
      .values({ userId: this.userId, kind, id, data })
      .onConflictDoUpdate({
        target: [resources.userId, resources.kind, resources.id],
        set: { data },
      });
  }
  async clear(kind: ResourceKind) {
    await this.tx.delete(resources).where(this.where(kind));
  }
  async invalidateRequests() {
    await this.tx
      .update(requests)
      .set({ invalidated: true, response: {} })
      .where(eq(requests.userId, this.userId));
  }
  async ledger(requestId: string, bucket: string, outcome: string, now: Date) {
    await this.tx
      .insert(usageLedger)
      .values({ userId: this.userId, requestId, bucket, outcome, createdAt: now });
  }
}
export class Repository {
  constructor(readonly db: Database) {}
  async health() {
    await this.db.execute(sql`select 1 from accounts limit 0`);
  }
  async run<T>(
    userId: string,
    work: (store: UserStore) => Promise<T>,
    request?: { key: string; fingerprint: string },
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.insert(accounts).values({ id: userId }).onConflictDoNothing();
      // Lock one account for the whole transaction: all state changes and the replay receipt commit together.
      const [account] = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.id, userId))
        .for('update');
      if (request) {
        const [cached] = await tx
          .select()
          .from(requests)
          .where(and(eq(requests.userId, userId), eq(requests.key, request.key)));
        if (cached) {
          if (cached.invalidated)
            throw new ApiError(
              409,
              'REQUEST_INVALIDATED',
              '초기화 이전 요청은 다시 사용할 수 없습니다. 최신 데이터를 조회해주세요.',
            );
          if (cached.fingerprint !== request.fingerprint)
            throw new ApiError(
              409,
              'IDEMPOTENCY_CONFLICT',
              '같은 요청 키를 다른 요청에 사용할 수 없습니다.',
            );
          return cached.response as T;
        }
      }
      const value = await work(new UserStore(tx, userId, account.paid));
      if (request) await tx.insert(requests).values({ userId, ...request, response: value });
      return value;
    });
  }
}
