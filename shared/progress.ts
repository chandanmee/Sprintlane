import type { ProjectStats, Task } from './types'

const pct = (done: number, total: number) => (total === 0 ? 0 : Math.round((done / total) * 100))

/** Task without subtasks: 100 if completed else 0. With subtasks: completed subtasks / total. */
export function taskProgress(task: Task, all: Task[]): number {
  const subs = all.filter((t) => t.parentTaskId === task.id)
  if (subs.length === 0) return task.status === 'Completed' ? 100 : 0
  return pct(subs.filter((s) => s.status === 'Completed').length, subs.length)
}

/** Project progress uses top-level tasks only. */
export function projectStats(tasks: Task[]): ProjectStats {
  const top = tasks.filter((t) => t.parentTaskId === null)
  const count = (s: Task['status']) => top.filter((t) => t.status === s).length
  const completed = count('Completed')
  return {
    total: top.length,
    pending: count('Pending'),
    inProgress: count('In Progress'),
    delayed: count('Delayed'),
    completed,
    progress: pct(completed, top.length),
  }
}

export function todayISO(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isOverdue(task: Pick<Task, 'dueDate' | 'status'>, today = todayISO()): boolean {
  return !!task.dueDate && task.status !== 'Completed' && task.dueDate < today
}
