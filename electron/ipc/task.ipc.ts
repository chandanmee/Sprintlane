import { createTask, deleteTask, listTasks, updateTask } from '../database/taskRepo'
import { handle } from './project.ipc'

export function registerTaskIpc(): void {
  handle('tasks:list', (projectId) => listTasks(projectId as string))
  handle('tasks:create', (input) => createTask(input as never))
  handle('tasks:update', (input) => updateTask(input as never))
  handle('tasks:delete', (id) => deleteTask(id as string))
}
