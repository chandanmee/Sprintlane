import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getSettings, initAppSettings, updateSettings } from './appSettings'

let dir: string

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sprintlane-settings-'))
})
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

describe('appSettings', () => {
  it('starts with sensible defaults when no preferences file exists', () => {
    const settings = initAppSettings(dir)
    expect(settings).toEqual({ notificationsEnabled: true, reminderDays: 1, launchAtLogin: true })
  })

  it('persists updates and survives re-initialization', () => {
    initAppSettings(dir)
    updateSettings({ reminderDays: 3, notificationsEnabled: false })
    expect(getSettings()).toMatchObject({ reminderDays: 3, notificationsEnabled: false, launchAtLogin: true })

    const reloaded = initAppSettings(dir)
    expect(reloaded).toMatchObject({ reminderDays: 3, notificationsEnabled: false })
  })

  it('falls back to defaults if the preferences file is corrupt', () => {
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'preferences.json'), '{not valid json')
    expect(initAppSettings(dir)).toEqual({ notificationsEnabled: true, reminderDays: 1, launchAtLogin: true })
  })

  it('rejects out-of-range values', () => {
    initAppSettings(dir)
    expect(() => updateSettings({ reminderDays: 99 })).toThrow()
  })
})
