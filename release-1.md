# 🚀 CAMPAIGNS COMMAND CENTER — RELEASE v1.0.0

**Campaigns** is a local-first, zero-latency desktop tactical command center built for personal campaign planning, mission execution, and Obsidian Markdown notes integration.

---

## 🌟 Key Highlights in v1.0.0

### ⚡ Engine & Architecture Performance
- **Local SQLite Engine (`sql.js`)**: Pure JS/WASM SQLite database running safely in-memory with 500ms debounced disk flushes (`saveDbToDisk`) and `before-quit` exit synchronization hooks.
- **Obsidian Markdown Integration**: Automatically scaffolds and syncs `.md` strategy notes inside your Obsidian Vault under `Obsidian/Adhipati/Campaigns/`.
- **Auto-Healing File Sync**: Automatically regenerates deleted or missing `.md` notes from SQLite database records when opened.
- **Zero Network Footprint**: Fonts bundled locally via `@fontsource` (`Outfit` & `Inter`). Disables GPU shader disk cache locks for minimal CPU, GPU, and RAM usage on Windows laptops.

### 🛡️ Core Theater States
1. **ARSENAL (Intel & Strategizing)**: Log raw campaign ideas, strategic plans, and duplicate strategizing campaigns in one click.
2. **EXECUTION (Active Theater)**: Track active campaigns with strict deadlines, target dates, priority tags, and subtasks.
3. **BREACH (Overdue Recovery)**: Automatic startup breach detection transfers overdue campaigns to Breach with native Windows desktop OS notifications. Supports up to 2 tactical reschedule permits per campaign.
4. **ARCHIVE (Victory & Aborted)**: Historical victory logs with completion dates, days spent, and final operational outcome notes.

### ⌨️ Keyboard Power-User Controls
- `Tab` / `Shift + Tab` — Single-key theater cycling (`Execution` ↔ `Arsenal` ↔ `Breach` ↔ `Archive`).
- `J` / `K` or `↓` / `↑` — High-speed card & subtask list navigation with smooth-scroll highlighting.
- `Space` — Cycle subtask stage status (`Initiated` → `Doing` → `Completed`).
- `Enter` — Rapid subtask creation with continuous input focus retention.
- `1` / `2` / `3` — Instant priority selection (`1`: High, `2`: Medium, `3`: Low) in creation/edit dialogs.
- `Ctrl + P` — Cycle priority filters (`ALL` / `HIGH` / `MEDIUM` / `LOW`).
- `Double-Click` — Double-click any campaign card title to open its `.md` briefing note directly in your default editor.
- `Ctrl + Shift + T` — Classification Tags Manager with bulk **PURGE ALL TAGS** tool.
- `Ctrl + Shift + C` — Independent Workspace & SQLite Database path relocation dialog with automatic data migration.
- `Ctrl + /` or `Ctrl + ?` — Complete in-app Keyboard Shortcut Cheat Sheet guide.

---

## 📁 Default Storage Paths
- **Strategies Workspace (`.md`)**: `%USERPROFILE%\Obsidian\Adhipati\Campaigns\`
- **SQLite Database (`campaigns.sqlite`)**: `%LOCALAPPDATA%\Campaigns\Database\campaigns.sqlite`

---

## 🛠️ Installation & Usage
1. Download `Campaigns Setup 1.0.0.exe` from the GitHub Release assets.
2. Run the installer and choose your installation directory.
3. Launch **Campaigns** from your Desktop shortcut or Start Menu.
