import { boolean, index, jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  paid: boolean('paid').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const resources = pgTable(
  'resources',
  {
    userId: text('user_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    id: text('id').notNull(),
    data: jsonb('data').$type<unknown>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.kind, t.id] }),
    index('resources_user_kind_created').on(t.userId, t.kind, t.createdAt, t.id),
  ],
);
export const requests = pgTable(
  'idempotency_requests',
  {
    userId: text('user_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    fingerprint: text('fingerprint').notNull(),
    response: jsonb('response').$type<unknown>().notNull(),
    invalidated: boolean('invalidated').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })],
);
export const usageLedger = pgTable(
  'coach_usage_ledger',
  {
    userId: text('user_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    requestId: text('request_id').notNull(),
    bucket: text('bucket').notNull(),
    outcome: text('outcome').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.requestId] })],
);
