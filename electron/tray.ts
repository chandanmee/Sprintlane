import fs from 'node:fs'
import path from 'node:path'
import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron'

let tray: Tray | null = null
/** Set right before a real quit so the window's `close` handler doesn't just hide it instead. */
export let isQuitting = false

export function markQuitting(): void {
  isQuitting = true
}

/** Vite copies `public/*` into `dist/` at build time; in dev the file sits at the repo's `public/`. */
function resolveIconPath(): string | undefined {
  const candidates = [path.join(__dirname, '../dist/icon.png'), path.join(__dirname, '../public/icon.png')]
  return candidates.find((p) => fs.existsSync(p))
}

export function createTray(getWindow: () => BrowserWindow | null): Tray {
  const iconPath = resolveIconPath()
  const icon = iconPath ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty()
  tray = new Tray(icon.isEmpty() ? icon : icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('SprintLane')

  const showWindow = () => {
    const win = getWindow()
    if (!win) return
    win.show()
    if (win.isMinimized()) win.restore()
    win.focus()
  }

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open SprintLane', click: showWindow },
      { type: 'separator' },
      {
        label: 'Quit SprintLane',
        click: () => {
          markQuitting()
          app.quit()
        },
      },
    ]),
  )
  tray.on('click', showWindow)
  return tray
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
