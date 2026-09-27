import fs from 'node:fs'
import path from 'node:path'
import { appSettingsSchema, type AppSettings, type AppSettingsInput } from '../shared/types'

const DEFAULTS: AppSettings = {
  notificationsEnabled: true,
  reminderDays: 1,
  launchAtLogin: true,
}

let filePath = ''
let cache: AppSettings = DEFAULTS

/** Must be called once at startup with a writable directory (e.g. app.getPath('userData')). */
export function initAppSettings(dir: string): AppSettings {
  fs.mkdirSync(dir, { recursive: true })
  filePath = path.join(dir, 'preferences.json')
  cache = { ...DEFAULTS }
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    cache = { ...DEFAULTS, ...appSettingsSchema.parse(raw) }
  } catch {
    // Missing or corrupt preferences file: fall back to defaults rather than failing startup.
  }
  return cache
}

export function getSettings(): AppSettings {
  return cache
}

export function updateSettings(patch: AppSettingsInput): AppSettings {
  cache = { ...cache, ...appSettingsSchema.parse(patch) }
  fs.writeFileSync(filePath, JSON.stringify(cache, null, 2))
  return cache
}
