import fs from 'node:fs'
import path from 'node:path'
import { app, BrowserWindow, dialog } from 'electron'
import type { BackupResult, DatabaseInfo, ImportResult } from '../../shared/types'
import {
  closeDatabase,
  getDatabasePath,
  getSqlite,
  openDatabase,
  validateSprintLaneDatabase,
} from '../database/client'
import { handle } from './project.ipc'

const FILTERS = [{ name: 'SprintLane database', extensions: ['db', 'sqlite'] }]

export const backupsDir = () => path.join(app.getPath('userData'), 'backups')

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

/** Writes a consistent single-file copy of the live database (VACUUM INTO refuses to overwrite). */
function snapshotTo(target: string): void {
  fs.rmSync(target, { force: true })
  getSqlite().prepare('VACUUM INTO ?').run(target)
}

function removeSidecars(file: string): void {
  fs.rmSync(`${file}-wal`, { force: true })
  fs.rmSync(`${file}-shm`, { force: true })
  fs.rmSync(`${file}-journal`, { force: true })
}

function count(table: string): number {
  return (getSqlite().prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n
}

async function exportBackup(win: BrowserWindow | null): Promise<BackupResult> {
  const opts = {
    title: 'Export SprintLane backup',
    defaultPath: `SprintLane-backup-${new Date().toISOString().slice(0, 10)}.db`,
    filters: FILTERS,
  }
  const res = win ? await dialog.showSaveDialog(win, opts) : await dialog.showSaveDialog(opts)
  if (res.canceled || !res.filePath) return { ok: false, canceled: true }
  try {
    if (path.resolve(res.filePath) === path.resolve(getDatabasePath())) {
      return { ok: false, error: 'Choose a location other than the live database file.' }
    }
    snapshotTo(res.filePath)
    return { ok: true, path: res.filePath }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

async function importBackup(win: BrowserWindow | null): Promise<ImportResult> {
  const openOpts = { title: 'Import SprintLane backup', filters: FILTERS, properties: ['openFile' as const] }
  const picked = win ? await dialog.showOpenDialog(win, openOpts) : await dialog.showOpenDialog(openOpts)
  if (picked.canceled || picked.filePaths.length === 0) return { ok: false, canceled: true }
  const source = picked.filePaths[0]

  const problem = validateSprintLaneDatabase(source)
  if (problem) return { ok: false, error: problem }

  const confirmOpts = {
    type: 'warning' as const,
    title: 'Replace current data?',
    message: 'Importing will replace all current projects and tasks with the contents of this backup.',
    detail: `A safety backup of your current data is saved automatically first.\n\nFile: ${source}`,
    buttons: ['Cancel', 'Replace my data'],
    defaultId: 0,
    cancelId: 0,
  }
  const confirm = win ? await dialog.showMessageBox(win, confirmOpts) : await dialog.showMessageBox(confirmOpts)
  if (confirm.response !== 1) return { ok: false, canceled: true }

  const live = getDatabasePath()
  const safety = path.join(backupsDir(), `pre-import-${stamp()}.db`)
  const staged = `${live}.import`
  try {
    fs.mkdirSync(backupsDir(), { recursive: true })
    snapshotTo(safety)
    fs.copyFileSync(source, staged)
    // Bring an older backup up to date on the staged copy before it goes live.
    openDatabase(staged)
    closeDatabase()
    removeSidecars(staged)
    removeSidecars(live)
    fs.renameSync(staged, live)
    openDatabase(live)
    return { ok: true, safetyBackupPath: safety }
  } catch (err) {
    fs.rmSync(staged, { force: true })
    removeSidecars(staged)
    try {
      if (fs.existsSync(safety)) {
        removeSidecars(live)
        fs.copyFileSync(safety, live)
      }
      openDatabase(live)
    } catch {
      /* the original file is still on disk; the safety copy is in the backups folder */
    }
    return { ok: false, error: `Import failed and your data was restored: ${(err as Error).message}` }
  }
}

export function registerBackupIpc(): void {
  handle(
    'backup:info',
    (): DatabaseInfo => ({
      path: getDatabasePath(),
      sizeBytes: fs.statSync(getDatabasePath()).size,
      projects: count('projects'),
      tasks: count('tasks'),
      backupsDir: backupsDir(),
    }),
  )
  handle('backup:export', () => exportBackup(BrowserWindow.getFocusedWindow()))
  handle('backup:import', () => importBackup(BrowserWindow.getFocusedWindow()))
}
