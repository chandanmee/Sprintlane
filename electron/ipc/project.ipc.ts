import { ipcMain } from 'electron'
import { ZodError } from 'zod'
import { archiveProject, createProject, listProjects, updateProject } from '../database/projectRepo'

/** Turns validation failures into a readable message before it crosses the IPC boundary. */
export function handle<A extends unknown[], R>(channel: string, fn: (...args: A) => Promise<R> | R): void {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return await fn(...(args as A))
    } catch (err) {
      if (err instanceof ZodError) throw new Error(err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '))
      throw err
    }
  })
}

export function registerProjectIpc(): void {
  handle('projects:list', () => listProjects())
  handle('projects:create', (input) => createProject(input as never))
  handle('projects:update', (input) => updateProject(input as never))
  handle('projects:archive', (id) => archiveProject(id as string))
}
