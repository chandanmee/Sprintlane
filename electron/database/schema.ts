import { randomUUID } from 'node:crypto'
import { index, sqliteTable, text, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import type { Priority, ProjectStatus, TaskStatus } from '../../shared/types'

const id = () => text('id').primaryKey().$defaultFn(() => randomUUID())

export const projects = sqliteTable('projects', {
  id: id(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  status: text('status').$type<ProjectStatus>().notNull().default('Active'),
  priority: text('priority').$type<Priority>().notNull().default('Medium'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  archivedAt: text('archived_at'),
})

export const tasks = sqliteTable(
  'tasks',
  {
    id: id(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    parentTaskId: text('parent_task_id').references((): AnySQLiteColumn => tasks.id, {
      onDelete: 'cascade',
    }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    status: text('status').$type<TaskStatus>().notNull().default('Pending'),
    priority: text('priority').$type<Priority>().notNull().default('Medium'),
    dueDate: text('due_date'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    completedAt: text('completed_at'),
  },
  (t) => [index('tasks_project_idx').on(t.projectId), index('tasks_parent_idx').on(t.parentTaskId)],
)
