import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Priority, ProjectStatus, TaskStatus } from '@shared/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export const priorityStyles: Record<Priority, string> = {
  Low: 'bg-slate-100 text-slate-600 ring-slate-200',
  Medium: 'bg-sky-50 text-sky-700 ring-sky-200',
  High: 'bg-orange-100 text-orange-800 ring-orange-300 font-semibold',
  Critical: 'bg-red-600 text-white ring-red-700 font-bold',
}

export const priorityAccent: Record<Priority, string> = {
  Low: 'border-l-slate-200',
  Medium: 'border-l-sky-300',
  High: 'border-l-orange-500',
  Critical: 'border-l-red-600',
}

export const taskStatusStyles: Record<TaskStatus, string> = {
  Pending: 'bg-slate-100 text-slate-700 ring-slate-300',
  'In Progress': 'bg-blue-50 text-blue-700 ring-blue-300',
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-300',
  Delayed: 'bg-red-50 text-red-700 ring-red-400 font-semibold',
}

export const projectStatusStyles: Record<ProjectStatus, string> = {
  Active: 'bg-blue-50 text-blue-700 ring-blue-300',
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-300',
  Archived: 'bg-slate-100 text-slate-500 ring-slate-300',
}

const priorityWeight: Record<Priority, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }

/** Open work first (highest priority, earliest deadline), completed work last. */
export function compareTasks(a: { status: TaskStatus; priority: Priority; dueDate: string | null; createdAt: string }, b: typeof a) {
  const done = Number(a.status === 'Completed') - Number(b.status === 'Completed')
  if (done) return done
  const pri = priorityWeight[a.priority] - priorityWeight[b.priority]
  if (pri) return pri
  if (a.dueDate !== b.dueDate) return (a.dueDate ?? '9999') < (b.dueDate ?? '9999') ? -1 : 1
  return a.createdAt.localeCompare(b.createdAt)
}
