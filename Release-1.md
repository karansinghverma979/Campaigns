# 🚀 CAMPAIGNS COMMAND CENTER — RELEASE v1.0.0
### *Tactical Task Manager, Architecture Genesis & Obsidian Synchronization*

**Campaigns** is a local-first, zero-latency desktop tactical command center built for personal campaign planning, mission execution, and Obsidian Markdown notes integration.

---

## 📑 TABLE OF CONTENTS
1. [Executive Overview](#-executive-overview)
2. [Engine & Architecture Performance](#-engine--architecture-performance)
3. [Core Theater States](#-core-theater-states)
4. [Keyboard Power-User Controls](#-keyboard-power-user-controls)
5. [Storage Architecture & Workspace Scaffolding](#-storage-architecture--workspace-scaffolding)
6. [Development Environment & Live Launch](#-development-environment--live-launch)
7. [Installation & Packaging](#-installation--packaging)

---

## 🌐 EXECUTIVE OVERVIEW

Version 1.0.0 marks the foundational release of **Campaigns**, providing a high-impact, keyboard-driven interface to manage complex, multi-stage operations with automatic Obsidian markdown syncing and local SQLite persistence.

- **Ultra-Fast Native Performance**: Built on Svelte 5 with fine-grained reactivity (Runes), Vite, and Electron.
- **Design Standard**: High-impact heavy typography (`Outfit` & `Inter`), custom dark tactical palette, and Windows rounded styling.
- **Bi-Directional Knowledge Alignment**: Bridges structured database records with human-readable Markdown notes in Obsidian.

---

## ⚡ ENGINE & ARCHITECTURE PERFORMANCE

- **Local SQLite Engine (`sql.js` / WASM & In-Memory Persistence)**:
  - Pure JS/WASM SQLite database running safely with 500ms debounced disk flushes (`saveDbToDisk`).
  - Strict `before-quit` synchronization hooks preventing any data loss upon closing.
- **Obsidian Markdown Integration**:
  - Automatically scaffolds and syncs `.md` strategy notes inside your Obsidian Vault under `Obsidian/Adhipati/Campaigns/`.
- **Auto-Healing File Sync**:
  - Automatically regenerates deleted or missing `.md` notes directly from SQLite database records when accessed.
- **Zero Network Footprint**:
  - Fully offline; fonts bundled locally via `@fontsource` (`Outfit` & `Inter`).
  - Disables GPU shader disk cache locks for minimal CPU, GPU, and RAM overhead on Windows systems.

---

## 🛡️ CORE THEATER STATES

1. **ARSENAL (Intel & Strategizing)**: Log raw campaign ideas, strategic plans, and duplicate strategizing campaigns in one click.
2. **EXECUTION (Active Theater)**: Track active campaigns with strict deadlines, target dates, priority tags, and subtasks.
3. **BREACH (Overdue Recovery)**: Automatic startup breach detection transfers overdue campaigns to Breach with native Windows desktop OS notifications. Supports up to 2 tactical reschedule permits per campaign.
4. **ARCHIVE (Victory & Aborted)**: Historical victory logs with completion dates, days spent, and final operational outcome notes.

---

## ⌨️ KEYBOARD POWER-USER CONTROLS

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

## 📁 STORAGE ARCHITECTURE & WORKSPACE SCAFFOLDING

On first boot, the engine automatically initializes the required directory structures and database schemas:
- **Strategies Workspace (`.md`)**: `%USERPROFILE%\Obsidian\Adhipati\Campaigns\` (or configured custom directory).
- **SQLite Database (`campaigns.sqlite`)**: `%LOCALAPPDATA%\Campaigns\Database\campaigns.sqlite`.
- **Automatic Directory Scaffolding**: Ensures parent folders and workspace subdirectories exist prior to file writes.

---

## 💻 DEVELOPMENT ENVIRONMENT & LIVE LAUNCH

- **Runtime & Build Tools**: Node.js, Vite 6, Svelte 5, Electron 34.
- **Direct Live Launch**:
  - `npm start` / `npm run dev`: Boots the Electron desktop application directly attached to the local Vite dev server with instant Hot Module Replacement (HMR).
  - Automatically verifies and scaffolds the `./Strategies` workspace directory inside `userData` during development boot.

---

## 🛠️ INSTALLATION & PACKAGING

1. Download `Campaigns Setup 1.0.0.exe` from the Release assets.
2. Run the installer and select your preferred installation directory.
3. Launch **Campaigns** from the Desktop shortcut or Start Menu.

