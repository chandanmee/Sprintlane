import fs from 'node:fs'
import path from 'node:path'
import { app, BrowserWindow, Menu, shell } from 'electron'
import { initAppSettings } from './appSettings'
import { closeDatabase, openDatabase } from './database/client'
import { registerBackupIpc } from './ipc/backup.ipc'
import { registerProjectIpc } from './ipc/project.ipc'
import { applyLaunchAtLogin, registerSettingsIpc } from './ipc/settings.ipc'
import { registerTaskIpc } from './ipc/task.ipc'
import { startNotificationScheduler } from './notifications'
import { createTray, destroyTray, isQuitting, markQuitting } from './tray'

app.setName('SprintLane')
app.setAppUserModelId('com.sprintlane.app') // Windows groups/labels toasts and taskbar entries by this id.

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()

const startHidden = process.argv.includes('--hidden') // set via the "launch at login" startup entry

let mainWindow: BrowserWindow | null = null
let stopScheduler: (() => void) | null = null

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
  mainWindow = win
  win.once('ready-to-show', () => {
    if (!startHidden) win.show()
  })
  // Closing the window hides it to the tray instead of quitting, so reminders keep working.
  win.on('close', (event) => {
    if (isQuitting) return
    event.preventDefault()
    win.hide()
  })
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })
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

  const settings = initAppSettings(app.getPath('userData'))
  applyLaunchAtLogin(settings.launchAtLogin)

  // Data lives in %APPDATA%\SprintLane\data, never in the install directory, so updates keep it.
  const dataDir = path.join(app.getPath('userData'), 'data')
  fs.mkdirSync(dataDir, { recursive: true })
  openDatabase(path.join(dataDir, 'sprintlane.db'))

  registerProjectIpc()
  registerTaskIpc()
  registerBackupIpc()
  registerSettingsIpc()
  createWindow()
  createTray(() => mainWindow)
  stopScheduler = startNotificationScheduler(() => mainWindow)

  app.on('second-instance', () => {
    if (!mainWindow) {
      createWindow()
      return
    }
    mainWindow.show()
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // Keep running in the tray; the app only quits via the tray menu or Settings > Quit.
})
app.on('before-quit', () => {
  markQuitting()
  stopScheduler?.()
  destroyTray()
  closeDatabase()
})
