import { Download, Upload } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { DatabaseInfo } from '@shared/types'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { useStore } from '@/lib/store'
import { formatBytes } from '@/lib/utils'

export function SettingsPage() {
  const { notify, reset } = useStore()
  const [info, setInfo] = useState<DatabaseInfo | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => window.sprintlane.backup.info().then(setInfo).catch(() => setInfo(null)), [])
  useEffect(() => {
    void refresh()
  }, [refresh])

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
      </div>
    </div>
  )
}
