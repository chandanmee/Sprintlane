# SprintLane

**Stop Stalling. Start Moving.**

SprintLane is a local-first Windows desktop app for tracking projects, tasks and subtasks — priorities, due dates,
progress and delayed work — with everything stored in a local SQLite file. **No account, no server, no internet
connection required.**

Built with Electron, React, TypeScript, Tailwind CSS and Drizzle ORM. See
[`SprintLane_Build_Specification_v1.0.0.docx`](SprintLane_Build_Specification_v1.0.0.docx) for the full product spec this
implements.

> Screenshots below use placeholder example data ("Website Redesign", "Mobile App Launch", "Team Wiki") — not real
> project data.

## Screenshots

| Dashboard | Projects |
| --- | --- |
| ![Dashboard](docs/screenshots/01-dashboard.png) | ![Projects](docs/screenshots/02-projects.png) |

| Project detail | Task detail |
| --- | --- |
| ![Project detail](docs/screenshots/03-project-detail.png) | ![Task detail](docs/screenshots/04-task-detail.png) |

| Settings |
| --- |
| ![Settings](docs/screenshots/05-settings.png) |

## Features

- **Projects** — create, edit, archive, set status (Active / Completed / Archived) and priority.
- **Tasks** — title, description, status (Pending / In Progress / Completed / Delayed), priority (Low / Medium / High /
  Critical), due date.
- **Subtasks** — one level of children per task, completed independently.
- **Automatic progress** — task and project completion percentages recalculate as work changes; overdue open tasks
  are automatically marked Delayed.
- **Dashboard** — total projects, pending/delayed/completed counts, and progress across active projects at a glance.
- **Filtering** — All / Pending / In Progress / Delayed / Completed, per project.
- **Backup & restore** — export a database snapshot, import one back with validation and an automatic safety backup
  before anything is replaced.
- **Desktop notifications** — native Windows toasts for tasks due soon and Critical-priority tasks that haven't been
  started; SprintLane runs from the system tray so reminders keep working after you close the window.
- **Local-first** — all data lives in a SQLite file in your Windows user profile; nothing leaves the machine.

## Getting started

Requirements: Node.js 20+ and npm on Windows.

```bash
npm install
npm run dev
```

This starts Vite and launches the Electron window with hot reload.

### Other commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server + Electron with hot reload |
| `npm run build` | Typecheck and build renderer + main/preload |
| `npm start` | Run the built app (`npm run build` first) |
| `npm test` | Unit + database integration tests |
| `npm run typecheck` | Type-check only, no build |
| `npm run db:generate` | Generate a SQL migration after editing `electron/database/schema.ts` |
| `npm run dist` | Build the Windows installer into `release/` |

## Project structure

```
sprintlane/
├── electron/               # Main process (never rendered, no DOM)
│   ├── main.ts              # App lifecycle, window/tray creation, wires everything up
│   ├── preload.ts           # Narrow, typed contextBridge API exposed to the renderer
│   ├── appSettings.ts        # Reads/writes preferences.json (notifications, launch at login)
│   ├── notifications.ts      # Periodic scheduler that raises Windows toasts
│   ├── tray.ts                # System tray icon, context menu, quit flag
│   ├── database/
│   │   ├── client.ts         # Opens the SQLite file, runs migrations, validates backups
│   │   ├── schema.ts         # Drizzle table definitions (source of truth for the schema)
│   │   ├── projectRepo.ts    # Project CRUD + stats
│   │   ├── taskRepo.ts       # Task/subtask CRUD, progress and overdue rules
│   │   └── migrations/       # Generated SQL migrations (npm run db:generate)
│   └── ipc/                 # ipcMain.handle registrations per domain
├── src/                     # Renderer (React) — never touches SQLite directly
│   ├── app/routes/           # Route table
│   ├── features/             # dashboard/, projects/, tasks/, settings/
│   ├── components/           # ui/ (buttons, fields, dialogs) and layout/ (shell, page header)
│   └── lib/                  # zustand store, utils
├── shared/                  # Used by both renderer and main
│   ├── types.ts               # Domain types + zod validation schemas
│   ├── progress.ts            # Progress-percentage rules (unit tested)
│   └── reminders.ts           # Due-soon / critical-pending selection rules (unit tested)
└── docs/screenshots/         # README images
```

## Architecture

- **Renderer** (`src/`) never touches SQLite — it only calls `window.sprintlane`, the API exposed by the preload
  script.
- **Preload** (`electron/preload.ts`) exposes a narrow, typed IPC surface (`projects:*`, `tasks:*`, `backup:*`) via
  `contextBridge`. `contextIsolation` is on and `nodeIntegration` is off.
- **Main** (`electron/`) owns the database: IPC handlers, repositories, Drizzle schema, migrations, backup/restore.
- **Shared** (`shared/`) holds the zod schemas, types and progress rules used by both sides, so validation and
  progress math can't drift between the UI and the database layer.

### Database

SQLite via Node's built-in `node:sqlite` (bundled with Electron), driven through Drizzle ORM's `sqlite-proxy` driver.
This avoids native modules entirely, so no Python or Visual Studio build tools are required to install or build the
project. Migrations are plain SQL files in `electron/database/migrations`, bundled into the main process and tracked
in a `__migrations` table so they only ever run once.

The database lives at `%APPDATA%\SprintLane\data\sprintlane.db` (resolved through Electron's `app.getPath`, never
hard-coded), outside the install directory — so app updates and uninstalls never touch user data.

### Behaviour worth knowing

- **Progress** — a task with no subtasks is 0% or 100%; with subtasks, it's completed/total. A project's progress is
  completed **top-level** tasks / total top-level tasks (subtasks never double-count).
- **Delayed tasks** — any open task past its due date is automatically marked Delayed; moving the due date forward
  un-delays it.
- **Parent/subtask sync** — completing every subtask completes the parent; reopening any subtask reopens the parent;
  completing a parent completes all of its subtasks.
- **Backup** — export uses `VACUUM INTO` for a consistent single-file snapshot. Import validates the selected file
  first (SQLite header, integrity check, expected tables, not from a newer app version), asks for confirmation,
  writes a safety backup to `%APPDATA%\SprintLane\backups`, then swaps the database — rolling back automatically if
  anything fails.

### Notifications

Closing the window hides it to the system tray instead of quitting (`electron/tray.ts`) — SprintLane only exits via
the tray menu or Settings > Quit. Every 15 minutes (and once ~8s after launch) `electron/notifications.ts` checks the
database and raises a native Windows toast for:

- an open task due within the configured reminder window (default: today or tomorrow),
- a **Critical**-priority task that's still **Pending** (never started), and
- a daily summary the first time any tasks are Delayed.

Clicking a toast focuses the window and navigates straight to that task. Each one only fires once per day
(tracked in memory, so a restart can repeat it, but a running instance won't spam you). All of this is configurable —
or fully disable-able — from Settings, along with whether SprintLane launches at Windows login
(`app.setLoginItemSettings`, started with `--hidden` so it doesn't pop a window at boot).

## Testing

```bash
npm test
```

Covers the progress-percentage rules (`shared/progress.test.ts`), the reminder-selection rules
(`shared/reminders.test.ts`), preferences persistence (`electron/appSettings.test.ts`), and the repositories
end-to-end against a real temporary SQLite file (`electron/database/repo.test.ts`): persistence across reopen,
subtask/parent sync, cascade delete, the overdue rule and backup-file validation.

## License

[MIT](LICENSE) © Chandan Kumar Pradhan
