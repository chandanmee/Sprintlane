import { contextBridge, ipcRenderer } from 'electron'
import type { SprintLaneApi } from '../shared/types'

const call = (channel: string) => (...args: unknown[]) => ipcRenderer.invoke(channel, ...args)

const api: SprintLaneApi = {
  projects: {
    list: call('projects:list') as SprintLaneApi['projects']['list'],
    create: call('projects:create') as SprintLaneApi['projects']['create'],
    update: call('projects:update') as SprintLaneApi['projects']['update'],
    archive: call('projects:archive') as SprintLaneApi['projects']['archive'],
  },
  tasks: {
    list: call('tasks:list') as SprintLaneApi['tasks']['list'],
    create: call('tasks:create') as SprintLaneApi['tasks']['create'],
    update: call('tasks:update') as SprintLaneApi['tasks']['update'],
    delete: call('tasks:delete') as SprintLaneApi['tasks']['delete'],
  },
  backup: {
    info: call('backup:info') as SprintLaneApi['backup']['info'],
    export: call('backup:export') as SprintLaneApi['backup']['export'],
    import: call('backup:import') as SprintLaneApi['backup']['import'],
  },
  settings: {
    get: call('settings:get') as SprintLaneApi['settings']['get'],
    update: call('settings:update') as SprintLaneApi['settings']['update'],
    testNotification: call('settings:testNotification') as SprintLaneApi['settings']['testNotification'],
  },
  app: {
    quit: call('app:quit') as SprintLaneApi['app']['quit'],
    onNavigate: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, path: string) => callback(path)
      ipcRenderer.on('navigate', listener)
      return () => ipcRenderer.removeListener('navigate', listener)
    },
  },
}

contextBridge.exposeInMainWorld('sprintlane', api)
