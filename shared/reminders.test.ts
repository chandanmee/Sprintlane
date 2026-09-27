import { describe, expect, it } from 'vitest'
import { addDays, criticalPendingTasks, delayedTasks, dueSoonTasks } from './reminders'
import type { Task } from './types'

const t = (over: Partial<Task>): Task => ({
  id: over.id ?? 'a', projectId: 'p', parentTaskId: null, title: over.id ?? 'a', description: '',
  status: 'Pending', priority: 'Medium', dueDate: null, createdAt: '', updatedAt: '', completedAt: null, ...over,
})

describe('addDays', () => {
  it('adds days, rolling over month/year boundaries', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('dueSoonTasks', () => {
  const today = '2026-06-10'
  it('includes open tasks due today through the reminder horizon', () => {
    const tasks = [
      t({ id: 'today', dueDate: '2026-06-10' }),
      t({ id: 'in-range', dueDate: '2026-06-11' }),
      t({ id: 'too-far', dueDate: '2026-06-15' }),
    ]
    expect(dueSoonTasks(tasks, 1, today).map((x) => x.id)).toEqual(['today', 'in-range'])
  })
  it('excludes completed tasks, tasks with no due date, and already-overdue (Delayed) tasks', () => {
    const tasks = [
      t({ id: 'done', dueDate: '2026-06-10', status: 'Completed' }),
      t({ id: 'no-date', dueDate: null }),
      t({ id: 'overdue', dueDate: '2026-06-01', status: 'Delayed' }),
    ]
    expect(dueSoonTasks(tasks, 5, today)).toEqual([])
  })
})

describe('criticalPendingTasks', () => {
  it('only flags Critical priority tasks that are still Pending', () => {
    const tasks = [
      t({ id: 'a', priority: 'Critical', status: 'Pending' }),
      t({ id: 'b', priority: 'Critical', status: 'In Progress' }),
      t({ id: 'c', priority: 'High', status: 'Pending' }),
    ]
    expect(criticalPendingTasks(tasks).map((x) => x.id)).toEqual(['a'])
  })
})

describe('delayedTasks', () => {
  it('returns tasks with Delayed status', () => {
    const tasks = [t({ id: 'a', status: 'Delayed' }), t({ id: 'b', status: 'Pending' })]
    expect(delayedTasks(tasks).map((x) => x.id)).toEqual(['a'])
  })
})
