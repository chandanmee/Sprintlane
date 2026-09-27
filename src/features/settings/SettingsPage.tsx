import { Download, LogOut, Upload } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { AppSettings, DatabaseInfo } from '@shared/types'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input, Label } from '@/components/ui/field'
import { useStore } from '@/lib/store'
import { formatBytes } from '@/lib/utils'

export function SettingsPage() {
  const { notify, reset } = useStore()
  const [info, setInfo] = useState<DatabaseInfo | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => window.sprintlane.backup.info().then(setInfo).catch(() => setInfo(null)), [])
  useEffect(() => {
    void refresh()
    void window.sprintlane.settings.get().then(setSettings)
  }, [refresh])

  async function saveSettings(patch: Partial<AppSettings>) {
    setSettings((s) => (s ? { ...s, ...patch } : s)) // optimistic, so the toggle feels instant
    setSettings(await window.sprintlane.settings.update(patch))
  }

  async function doExport() {
    setBusy(true)
    const res = await window.sprintlane.backup.export()
    setBusy(false)
    if (res.ok) notify('success', `Backup saved to ${res.path}`)
    else if (!res.canceled) notify('error', res.error ?? 'Export failed')
  }

  async function doImport() {
    setBusy(true)
    const res = await window.sprintlane.backup.import()
    setBusy(false)
    if (res.ok) {
      await reset()
      await refresh()
      notify('success', `Backup imported. Your previous data was saved to ${res.safetyBackupPath}`)
    } else if (!res.canceled) {
      notify('error', res.error ?? 'Import failed')
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" subtitle="Manage your local data" />

      <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">Local database</h2>
        {info ? (
          <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
            <dt className="text-slate-500">Location</dt>
            <dd className="break-all font-mono text-xs">{info.path}</dd>
            <dt className="text-slate-500">Size</dt>
            <dd>{formatBytes(info.sizeBytes)}</dd>
            <dt className="text-slate-500">Contents</dt>
            <dd>
              {info.projects} projects, {info.tasks} tasks (including subtasks)
            </dd>
            <dt className="text-slate-500">Safety backups</dt>
            <dd className="break-all font-mono text-xs">{info.backupsDir}</dd>
          </dl>
        ) : (
          <p className="text-sm text-slate-500">Loading…</p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-semibold">Notifications</h2>
        <p className="mb-4 text-sm text-slate-500">
          Windows notifications for tasks due soon and Critical tasks that haven't been started. SprintLane keeps
          running in the system tray when you close the window, so reminders keep working — right-click the tray icon,
          or use Quit below, to close it completely.
        </p>
        {settings && (
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.notificationsEnabled}
                onChange={(e) => void saveSettings({ notificationsEnabled: e.target.checked })}
              />
              Notify me about upcoming deadlines and Critical pending tasks
            </label>
            <div className="flex items-center gap-2">
              <Label htmlFor="s-days" className="mb-0 shrink-0">
                Remind this many days before a task is due
              </Label>
              <Input
                id="s-days"
                type="number"
                min={0}
                max={14}
                value={settings.reminderDays}
                disabled={!settings.notificationsEnabled}
                onChange={(e) => void saveSettings({ reminderDays: Number(e.target.value) })}
                className="w-20"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.launchAtLogin}
                onChange={(e) => void saveSettings({ launchAtLogin: e.target.checked })}
              />
              Launch SprintLane when Windows starts
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const ok = await window.sprintlane.settings.testNotification()
                if (!ok) notify('error', "Windows reported notifications aren't supported on this system.")
              }}
            >
              Send test notification
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-semibold">Backup &amp; restore</h2>
        <p className="mb-4 text-sm text-slate-500">
          Your data never leaves this computer. Export a copy of the database, or restore one. Importing always saves a
          safety backup of your current data first and asks before replacing anything.
        </p>
        <div className="flex gap-3">
          <Button onClick={doExport} disabled={busy}>
            <Download className="h-4 w-4" /> Export Backup
          </Button>
          <Button variant="outline" onClick={doImport} disabled={busy}>
            <Upload className="h-4 w-4" /> Import Backup
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-semibold">Application</h2>
        <p className="mb-4 text-sm text-slate-500">
          Closing the window leaves SprintLane running in the tray so reminders keep working. Quit here to close it
          completely.
        </p>
        <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => window.sprintlane.app.quit()}>
          <LogOut className="h-4 w-4" /> Quit SprintLane
        </Button>
      </section>
      </div>
    </div>
  )
}
