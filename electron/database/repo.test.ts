import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { closeDatabase, getSqlite, openDatabase, validateSprintLaneDatabase } from './client'
import { archiveProject, createProject, listProjects, updateProject } from './projectRepo'
import { createTask, deleteTask, listTasks, updateTask } from './taskRepo'

let dir: string
let file: string

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sprintlane-'))
  file = path.join(dir, 'sprintlane.db')
  openDatabase(file)
})
afterEach(() => {
  closeDatabase()
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('persistence', () => {
  it('project and task survive closing and reopening the database', async () => {
    const p = await createProject({ name: 'Fusiondesk', description: '', priority: 'High' })
    await createTask({ projectId: p.id, title: 'Redesign pricing', priority: 'Critical' })
    closeDatabase()
    openDatabase(file)
    const projects = await listProjects()
    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe('Fusiondesk')
    expect(await listTasks(p.id)).toMatchObject([{ title: 'Redesign pricing', priority: 'Critical', status: 'Pending' }])
  })
})

describe('tasks & progress', () => {
  it('parent follows subtasks and project progress counts top-level only', async () => {
    const p = await createProject({ name: 'P', description: '', priority: 'Medium' })
    const a = await createTask({ projectId: p.id, title: 'A' })
    await createTask({ projectId: p.id, title: 'B' })
    const s1 = await createTask({ projectId: p.id, parentTaskId: a.id, title: 's1' })
    const s2 = await createTask({ projectId: p.id, parentTaskId: a.id, title: 's2' })

    await updateTask({ id: s1.id, status: 'Completed' })
    expect((await listProjects())[0].stats.progress).toBe(0)

    await updateTask({ id: s2.id, status: 'Completed' })
    const [proj] = await listProjects()
    expect(proj.stats).toMatchObject({ total: 2, completed: 1, progress: 50 })
    const tasks = await listTasks(p.id)
    expect(tasks.find((t) => t.id === a.id)?.status).toBe('Completed')
    expect(tasks.find((t) => t.id === a.id)?.completedAt).not.toBeNull()

    await updateTask({ id: s2.id, status: 'Pending' })
    expect((await listTasks(p.id)).find((t) => t.id === a.id)?.status).toBe('In Progress')
  })

  it('completing a parent completes its subtasks; deleting cascades', async () => {
    const p = await createProject({ name: 'P', description: '', priority: 'Medium' })
    const a = await createTask({ projectId: p.id, title: 'A' })
    await createTask({ projectId: p.id, parentTaskId: a.id, title: 's1' })
    await updateTask({ id: a.id, status: 'Completed' })
    expect((await listTasks(p.id)).every((t) => t.status === 'Completed')).toBe(true)
    await deleteTask(a.id)
    expect(await listTasks(p.id)).toHaveLength(0)
  })

  it('rejects nested subtasks and empty titles', async () => {
    const p = await createProject({ name: 'P', description: '', priority: 'Medium' })
    const a = await createTask({ projectId: p.id, title: 'A' })
    const s = await createTask({ projectId: p.id, parentTaskId: a.id, title: 's' })
    await expect(createTask({ projectId: p.id, parentTaskId: s.id, title: 'x' })).rejects.toThrow()
    await expect(createTask({ projectId: p.id, title: '   ' })).rejects.toThrow()
  })

  it('marks overdue open tasks Delayed and un-delays when the due date moves', async () => {
    const p = await createProject({ name: 'P', description: '', priority: 'Medium' })
    const t = await createTask({ projectId: p.id, title: 'Late', dueDate: '2000-01-01' })
    expect((await listTasks(p.id))[0].status).toBe('Delayed')
    const done = await createTask({ projectId: p.id, title: 'Done', dueDate: '2000-01-01', status: 'Completed' })
    expect((await listTasks(p.id)).find((x) => x.id === done.id)?.status).toBe('Completed')
    await updateTask({ id: t.id, dueDate: '2999-01-01' })
    expect((await listTasks(p.id)).find((x) => x.id === t.id)?.status).toBe('Pending')
  })
})

describe('projects', () => {
  it('archives and restores with archivedAt', async () => {
    const p = await createProject({ name: 'P', description: '', priority: 'Medium' })
    const archived = await archiveProject(p.id)
    expect(archived).toMatchObject({ status: 'Archived' })
    expect(archived.archivedAt).not.toBeNull()
    const restored = await updateProject({ id: p.id, status: 'Active' })
    expect(restored.archivedAt).toBeNull()
  })
})

describe('backup validation', () => {
  it('accepts a VACUUM INTO snapshot and rejects foreign files', async () => {
    await createProject({ name: 'P', description: '', priority: 'Medium' })
    const snap = path.join(dir, 'snap.db')
    getSqlite().prepare('VACUUM INTO ?').run(snap)
    expect(validateSprintLaneDatabase(snap)).toBeNull()

    const junk = path.join(dir, 'junk.db')
    fs.writeFileSync(junk, 'not a database')
    expect(validateSprintLaneDatabase(junk)).toMatch(/not a SQLite/)

    const other = path.join(dir, 'other.db')
    const { DatabaseSync } = await import('node:sqlite')
    const c = new DatabaseSync(other)
    c.exec('CREATE TABLE foo (id INTEGER)')
    c.close()
    expect(validateSprintLaneDatabase(other)).toMatch(/not a SprintLane/)
  })
})
