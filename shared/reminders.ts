import { todayISO } from './progress'
import type { Task } from './types'

/** Adds `days` calendar days to a YYYY-MM-DD date string. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/**
 * Open tasks due within `reminderDays` (inclusive of today). Assumes `syncOverdue` has already
 * run, so anything still Pending/In Progress here is not yet overdue.
 */
export function dueSoonTasks(tasks: Task[], reminderDays: number, today = todayISO()): Task[] {
  const horizon = addDays(today, reminderDays)
  return tasks.filter(
    (t) => (t.status === 'Pending' || t.status === 'In Progress') && !!t.dueDate && t.dueDate >= today && t.dueDate <= horizon,
  )
}

/** Critical-priority tasks nobody has started yet. */
export function criticalPendingTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.priority === 'Critical' && t.status === 'Pending')
}

/** Tasks that just became (or still are) overdue. */
export function delayedTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status === 'Delayed')
}
