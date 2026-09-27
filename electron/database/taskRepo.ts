import { and, asc, eq, inArray, isNotNull, lt } from 'drizzle-orm'
import { todayISO } from '../../shared/progress'
import {
  taskCreateSchema,
  taskUpdateSchema,
  type Task,
  type TaskCreateInput,
  type TaskUpdateInput,
} from '../../shared/types'
import { getDb } from './client'
import { tasks } from './schema'

const now = () => new Date().toISOString()

/** Open tasks whose due date has passed become Delayed, so delayed work is visible everywhere. */
export async function syncOverdue(): Promise<void> {
  await getDb()
    .update(tasks)
    .set({ status: 'Delayed', updatedAt: now() })
    .where(
      and(inArray(tasks.status, ['Pending', 'In Progress']), isNotNull(tasks.dueDate), lt(tasks.dueDate, todayISO())),
    )
}

export async function getTask(id: string): Promise<Task> {
  const [row] = await getDb().select().from(tasks).where(eq(tasks.id, id))
  if (!row) throw new Error('Task not found')
  return row
}

export async function listAllTasks(): Promise<Task[]> {
  await syncOverdue()
  return getDb().select().from(tasks)
}

export async function listTasks(projectId: string): Promise<Task[]> {
  await syncOverdue()
  return getDb().select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(asc(tasks.createdAt))
}

/** A parent follows its subtasks: all done -> Completed, one reopened -> back to In Progress. */
async function reconcileParent(parentId: string | null): Promise<void> {
  if (!parentId) return
  const db = getDb()
  const subs = await db.select().from(tasks).where(eq(tasks.parentTaskId, parentId))
  if (subs.length === 0) return
  const parent = await getTask(parentId)
  const allDone = subs.every((s) => s.status === 'Completed')
  if (allDone && parent.status !== 'Completed') {
    await db.update(tasks).set({ status: 'Completed', completedAt: now(), updatedAt: now() }).where(eq(tasks.id, parentId))
  } else if (!allDone && parent.status === 'Completed') {
    await db.update(tasks).set({ status: 'In Progress', completedAt: null, updatedAt: now() }).where(eq(tasks.id, parentId))
  }
}

export async function createTask(raw: TaskCreateInput): Promise<Task> {
  const input = taskCreateSchema.parse(raw)
  const db = getDb()
  const parentTaskId = input.parentTaskId ?? null
  if (parentTaskId) {
    const parent = await getTask(parentTaskId)
    if (parent.projectId !== input.projectId) throw new Error('Subtask must belong to the same project')
    if (parent.parentTaskId) throw new Error('Subtasks cannot have their own subtasks')
  }
  const ts = now()
  const [row] = await db
    .insert(tasks)
    .values({
      projectId: input.projectId,
      parentTaskId,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate ?? null,
      createdAt: ts,
      updatedAt: ts,
      completedAt: input.status === 'Completed' ? ts : null,
    })
    .returning()
  await reconcileParent(parentTaskId)
  return getTask(row.id)
}

export async function updateTask(raw: TaskUpdateInput): Promise<Task> {
  const input = taskUpdateSchema.parse(raw)
  const db = getDb()
  const current = await getTask(input.id)
  const ts = now()
  const patch: Partial<typeof tasks.$inferInsert> = { updatedAt: ts }
  if (input.title !== undefined) patch.title = input.title
  if (input.description !== undefined) patch.description = input.description
  if (input.priority !== undefined) patch.priority = input.priority
  if (input.dueDate !== undefined) patch.dueDate = input.dueDate

  let status = input.status
  // Moving a delayed task's deadline into the future un-delays it unless the caller says otherwise.
  if (
    status === undefined &&
    current.status === 'Delayed' &&
    input.dueDate !== undefined &&
    (input.dueDate === null || input.dueDate >= todayISO())
  ) {
    status = 'Pending'
  }
  if (status !== undefined) {
    patch.status = status
    patch.completedAt = status === 'Completed' ? (current.completedAt ?? ts) : null
  }
  await db.update(tasks).set(patch).where(eq(tasks.id, input.id))

  // Completing a parent completes its subtasks so progress stays consistent.
  if (status === 'Completed' && current.status !== 'Completed' && !current.parentTaskId) {
    await db
      .update(tasks)
      .set({ status: 'Completed', completedAt: ts, updatedAt: ts })
      .where(and(eq(tasks.parentTaskId, input.id), inArray(tasks.status, ['Pending', 'In Progress', 'Delayed'])))
  }
  if (status !== undefined) await reconcileParent(current.parentTaskId)
  await syncOverdue()
  return getTask(input.id)
}

export async function deleteTask(id: string): Promise<void> {
  const task = await getTask(id)
  await getDb().delete(tasks).where(eq(tasks.id, id)) // subtasks cascade
  await reconcileParent(task.parentTaskId)
}
