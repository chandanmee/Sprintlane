import { describe, expect, it } from 'vitest'
import { projectStats, taskProgress } from './progress'
import type { Task } from './types'

const t = (id: string, status: Task['status'], parentTaskId: string | null = null): Task => ({
  id, projectId: 'p', parentTaskId, title: id, description: '', status, priority: 'Medium',
  dueDate: null, createdAt: '', updatedAt: '', completedAt: null,
})

describe('progress', () => {
  it('task without subtasks is 0 or 100', () => {
    expect(taskProgress(t('a', 'Completed'), [t('a', 'Completed')])).toBe(100)
    expect(taskProgress(t('a', 'In Progress'), [t('a', 'In Progress')])).toBe(0)
  })
  it('task with subtasks uses completed subtasks', () => {
    const all = [t('a', 'Pending'), t('b', 'Completed', 'a'), t('c', 'Completed', 'a'), t('d', 'Pending', 'a')]
    expect(taskProgress(all[0], all)).toBe(67)
  })
  it('project counts top-level tasks only', () => {
    const all = [t('a', 'Completed'), t('b', 'Delayed'), t('s1', 'Completed', 'b'), t('s2', 'Completed', 'b')]
    expect(projectStats(all)).toMatchObject({ total: 2, completed: 1, delayed: 1, progress: 50 })
  })
  it('empty project is 0%', () => expect(projectStats([]).progress).toBe(0))
})
