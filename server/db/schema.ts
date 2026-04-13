import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'
import type { RecordingRawData, RecordingStatus } from '../types/domain'

export const users = pgTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  age: integer('age'),
  sex: varchar('sex', { length: 20 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const projects = pgTable('projects', {
  id: varchar('id', { length: 36 }).primaryKey(),
  title: varchar('title', { length: 180 }).notNull(),
  description: varchar('description', { length: 2000 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const projectUsers = pgTable(
  'project_users',
  {
    projectId: varchar('project_id', { length: 36 })
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.projectId, table.userId] }),
    projectIdx: index('project_users_project_id_idx').on(table.projectId),
    userIdx: index('project_users_user_id_idx').on(table.userId),
  }),
)

export const recordings = pgTable(
  'recordings',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    projectId: varchar('project_id', { length: 36 })
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    durationMs: integer('duration_ms'),
    rawData: jsonb('raw_data')
      .$type<RecordingRawData>()
      .notNull()
      .default(sql`'{"samples": []}'::jsonb`),
    status: varchar('status', { length: 20 })
      .$type<RecordingStatus>()
      .notNull()
      .default('recording'),
    signalType: varchar('signal_type', { length: 100 }).notNull(),
    sampleRate: integer('sample_rate').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index('recordings_project_id_idx').on(table.projectId),
    userIdx: index('recordings_user_id_idx').on(table.userId),
    statusIdx: index('recordings_status_idx').on(table.status),
    startedAtIdx: index('recordings_started_at_idx').on(table.startedAt),
  }),
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert

export type ProjectUser = typeof projectUsers.$inferSelect
export type NewProjectUser = typeof projectUsers.$inferInsert

export type Recording = typeof recordings.$inferSelect
export type NewRecording = typeof recordings.$inferInsert
