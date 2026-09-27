import fs from 'node:fs'
import path from 'node:path'
import { app, BrowserWindow, Menu, shell } from 'electron'
import { closeDatabase, openDatabase } from './database/client'
import { registerBackupIpc } from './ipc/backup.ipc'
import { registerProjectIpc } from './ipc/project.ipc'
import { registerTaskIpc } from './ipc/task.ipc'

app.setName('SprintLane')

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'SprintLane',
    icon: path.join(__dirname, process.env.VITE_DEV_SERVER_URL ? '../public/icon.png' : '../dist/icon.png'),
    backgroundColor: '#f8fafc',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  win.once('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    void win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    void win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

if (gotLock) void app.whenReady().then(() => {
  Menu.setApplicationMenu(null)

  // Data lives in %APPDATA%\SprintLane\data, never in the install directory, so updates keep it.
  const dataDir = path.join(app.getPath('userData'), 'data')
  fs.mkdirSync(dataDir, { recursive: true })
  openDatabase(path.join(dataDir, 'sprintlane.db'))

  registerProjectIpc()
  registerTaskIpc()
  registerBackupIpc()
  createWindow()

  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => app.quit())
app.on('before-quit', () => closeDatabase())
