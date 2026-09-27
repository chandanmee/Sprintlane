import { BrowserWindow, Notification } from 'electron'
import { todayISO } from '../shared/progress'
import { criticalPendingTasks, delayedTasks, dueSoonTasks } from '../shared/reminders'
import type { Task } from '../shared/types'
import { getSettings } from './appSettings'
import { listAllTasks } from './database/taskRepo'

const CHECK_INTERVAL_MS = 15 * 60 * 1000

/** key -> the day (YYYY-MM-DD) it was last shown, so a restart-free run doesn't repeat itself. */
const notifiedToday = new Map<string, string>();

function shouldNotify(key: string, today: string): boolean {
  if (notifiedToday.get(key) === today) return false
  notifiedToday.set(key, today)
  return true
}

function taskPath(task: Task): string {
  return task.parentTaskId
    ? `/projects/${task.projectId}/tasks/${task.parentTaskId}`
    : `/projects/${task.projectId}/tasks/${task.id}`
}

function notify(title: string, body: string, onClick: () => void): void {
  if (!Notification.isSupported()) return
  const n = new Notification({ title, body })
  n.on('click', onClick)
  n.show()
}

/** Lets Settings confirm notifications actually reach the desktop, independent of any task data. */
export function sendTestNotification(): boolean {
  if (!Notification.isSupported()) return false
  notify('SprintLane', 'Notifications are working — you\'ll get reminders like this one.', () => {})
  return true
}

function focusAndNavigate(getWindow: () => BrowserWindow | null, path: string): void {
  const win = getWindow()
  if (!win) return
  win.show()
  if (win.isMinimized()) win.restore()
  win.focus()
  win.webContents.send('navigate', path)
}

function dueLabel(dueDate: string, today: string): string {
  if (dueDate === today) return 'today'
  return `on ${dueDate}`
}

export async function checkAndNotify(getWindow: () => BrowserWindow | null): Promise<void> {
  const settings = getSettings()
  if (!settings.notificationsEnabled) return

  const today = todayISO()
  for (const [key, day] of notifiedToday) if (day !== today) notifiedToday.delete(key)

  const tasks = await listAllTasks()

  for (const task of dueSoonTasks(tasks, settings.reminderDays, today)) {
    if (!shouldNotify(`due:${task.id}`, today)) continue
    notify('Due soon', `"${task.title}" is due ${dueLabel(task.dueDate!, today)}.`, () =>
      focusAndNavigate(getWindow, taskPath(task)),
    )
  }

  for (const task of criticalPendingTasks(tasks)) {
    if (!shouldNotify(`critical:${task.id}`, today)) continue
    notify('Critical task pending', `"${task.title}" is Critical priority and hasn't been started.`, () =>
      focusAndNavigate(getWindow, taskPath(task)),
    )
  }

  const delayed = delayedTasks(tasks)
  if (delayed.length > 0 && shouldNotify('delayed-summary', today)) {
    const names = delayed
      .slice(0, 3)
      .map((t) => t.title)
      .join(', ')
    const rest = delayed.length > 3 ? ` and ${delayed.length - 3} more` : ''
    notify(`${delayed.length} task${delayed.length > 1 ? 's are' : ' is'} overdue`, `${names}${rest}`, () =>
      focusAndNavigate(getWindow, '/projects'),
    )
  }
}

export function startNotificationScheduler(getWindow: () => BrowserWindow | null): () => void {
  const timer = setInterval(() => void checkAndNotify(getWindow), CHECK_INTERVAL_MS)
  // Give the window a moment to finish loading before the first check.
  const initial = setTimeout(() => void checkAndNotify(getWindow), 8000)
  return () => {
    clearInterval(timer)
    clearTimeout(initial)
  }
}
