import { app } from 'electron'
import { getSettings, updateSettings } from '../appSettings'
import { sendTestNotification } from '../notifications'
import { markQuitting } from '../tray'
import { handle } from './project.ipc'

/** Keeps the Windows startup entry in sync whenever launchAtLogin changes. */
function applyLaunchAtLogin(enabled: boolean): void {
  app.setLoginItemSettings({ openAtLogin: enabled, args: ['--hidden'] })
}

export function registerSettingsIpc(): void {
  handle('settings:get', () => getSettings())
  handle('settings:update', (patch) => {
    const settings = updateSettings(patch as never)
    applyLaunchAtLogin(settings.launchAtLogin)
    return settings
  })
  handle('app:quit', () => {
    markQuitting()
    app.quit()
  })
  handle('settings:testNotification', () => sendTestNotification())
}

export { applyLaunchAtLogin }
