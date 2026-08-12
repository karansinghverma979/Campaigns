# ⚔️ CAMPAIGNS COMMAND CENTER

> **A high-performance, local-first, zero-latency desktop tactical command center engineered for personal campaign management, mission execution tracking, and seamless Obsidian Markdown vault integration.**

---

## 📌 TABLE OF CONTENTS
1. [Overview & Philosophy](#-overview--philosophy)
2. [UI Architecture & Screen-by-Screen Manual](#-ui-architecture--screen-by-screen-manual)
   - [Navigation & System Navbar](#1-navigation--system-navbar)
   - [Theater 1: Execution (Active Theater)](#2-theater-1-execution-active-theater)
   - [Theater 2: Arsenal (Intel & Strategizing)](#3-theater-2-arsenal-intel--strategizing)
   - [Theater 3: Breach (Overdue Recovery)](#4-theater-3-breach-overdue-recovery)
   - [Theater 4: Archive (Victory & Aborted)](#5-theater-4-archive-victory--aborted)
   - [Modal Windows & Dialog Protocols](#6-modal-windows--dialog-protocols)
3. [Keyboard Power-User Shortcuts](#-keyboard-power-user-shortcuts)
4. [Storage Engine & Data Architecture](#-storage-engine--data-architecture)
   - [Embedded WASM SQLite Database](#embedded-wasm-sqlite-database)
   - [Obsidian Markdown Vault Synchronization](#obsidian-markdown-vault-synchronization)
   - [Auto-Healing File System Protocols](#auto-healing-file-system-protocols)
5. [Technology Stack & System Design](#-technology-stack--system-design)
6. [Cloning & Local Environment Setup](#-cloning--local-environment-setup)
7. [Building Standalone Executable & Installers](#-building-standalone-executable--installers)
8. [Developer Extensions & Future Customization](#-developer-extensions--future-customization)

---

## 🛡️ OVERVIEW & PHILOSOPHY

**Campaigns** is designed specifically as a single-user tactical command center running directly on local desktop hardware. Unlike traditional cloud task managers that introduce network latency and subscription bloat, Campaigns operates completely offline with instant UI rendering, local SQLite storage, and deep Markdown integration.

- **Local-First & Zero Network Overhead**: All data remains 100% on your machine.
- **Obsidian Vault Native**: Every campaign automatically maintains a structured `.md` briefing document inside your personal Obsidian Vault.
- **Hardware-Accelerated Efficiency**: Optimized CSS compositor layers, debounced disk flushes, and lazy component rendering ensure minimum CPU, GPU, and RAM usage on Windows laptops.

---

## 🖥️ UI ARCHITECTURE & SCREEN-BY-SCREEN MANUAL

### 1. Navigation & System Navbar

The top navigation bar acts as the main flight deck of the application.

![Navbar Screenshot](01_navbar.png)

- **Brand Action Button (`CAMPAIGNS`)**: Displays a spinning status indicator during active database reads. Clicking this button or pressing `Ctrl + R` forces a full system resynchronization with your local Strategies directory.
- **Theater Tabs**:
  - `EXECUTION` (`Ctrl + 1`): Blue theme. Main active operational workspace.
  - `ARSENAL` (`Ctrl + 2`): Purple theme. Raw intel ideas and strategic planning workspace.
  - `BREACH` (`Ctrl + 3`): Red theme. Displays overdue campaigns with a pulsing alert badge.
  - `ARCHIVE` (`Ctrl + 4`): Green/Grey theme. Completed victory logs and aborted campaign records.
- **System Action Controls**:
  - `Storage Config` (`Ctrl + Shift + C`): Open workspace & DB folder relocation settings.
  - `Tags Manager` (`Ctrl + Shift + T`): Manage classification tags and bulk purge unused tags.
  - `Help Guide` (`Ctrl + /`): Open the interactive keyboard shortcut cheat sheet.
  - `Window Controls`: Custom Minimize, Maximize, and Close buttons.

---

### 2. Theater 1: Execution (Active Theater)

The primary theater for campaigns actively underway.

![Execution Theater Screenshot](02_execution.png)

#### UI Elements:
- **Search Bar**: Real-time debounced filtering by campaign title. Supports instant focus via `/` or `Ctrl + F` and clear/unfocus via `Escape`.
- **Priority Filter Pills**: Instant filtering by `ALL`, `HIGH`, `MEDIUM`, or `LOW`. Cycle filters via `Ctrl + P`.
- **Sort Control Dropdown**: Sort active cards by `Deadline Date`, `Creation Date`, or `Campaign Name` in ascending/descending order.
- **Active Campaign Cards**:
  - **Priority Accent Bar**: Red top gradient for High, Amber for Medium, Blue for Low.
  - **Clickable Tag Pills**: Click any tag pill on a card to instantly isolate campaigns matching that tag.
  - **Double-Click Title**: Double-clicking the card title automatically launches its corresponding `.md` note in your default Markdown editor.
  - **Subtask Progress Counter**: Shows real-time completion ratio (e.g. `2/5 Subtasks`).
  - **Reschedule Badge**: Displays remaining reschedule permits (`Rescheduled 1/2` or `2/2`).

---

### 3. Theater 2: Arsenal (Intel & Strategizing)

The staging ground where new campaign ideas are logged and strategized before deployment.

![Arsenal Theater Screenshot](03_arsenal.png)

#### UI Elements:
- **Log New Intel Button**: Opens the campaign creation dialog (`Ctrl + N`).
- **Raw Intel Column**:
  - Holds un-deployed raw ideas and initial notes.
  - **Stage Move Button (`M` or `S`)**: Instantly transfers raw intel into the Strategizing column.
  - **Purge Button (`P`)**: Triggers a 60-second purge countdown with cancel safety.
- **Strategizing Column**:
  - Holds campaigns undergoing strategic outline development.
  - **Duplicate Campaign Button**: Cyan-coded button to clone a strategizing campaign along with all its tags and subtasks.
  - **Deploy to Execution (`D`)**: Opens the target deadline picker to deploy the campaign into active Execution.

---

### 4. Theater 3: Breach (Overdue Recovery)

The recovery theater for campaigns that have passed their deadline date without completion.

![Breach Recovery Screenshot](04_breach.png)

#### UI Elements:
- **Startup Auto-Detection**: Automatically evaluates deadlines on app launch. Any overdue Execution campaign is automatically transferred to Breach.
- **Native OS Alert**: Triggers a Windows desktop OS notification on app launch when campaigns breach.
- **Emergency Reschedule (`R`)**: Open the reschedule dialog to grant an extension (max 2 extensions per campaign).
- **Emergency Abort**: Move the breached campaign to Archive as Aborted.

---

### 5. Theater 4: Archive (Victory & Aborted)

The historical log of completed missions and suspended operations.

![Archive Screenshot](05_archive.png)

#### UI Elements:
- **Victory Log**: Green-accented cards showing completed campaigns with final completion dates, total days spent, and victory summary notes.
- **Aborted Log**: Grey-accented cards recording suspended operations and justification logs.
- **Permanent Purge**: Clean up historical records from database storage.

---

### 6. Modal Windows & Dialog Protocols

- **Log New Intel Modal (`Ctrl + N`)**: Create new campaigns with title, priority (`1`/`2`/`3` hotkeys), target tags, and initial subtasks.
- **Campaign Detail & Subtask Window**:
  - `J` / `K` keyboard selection across subtask items.
  - `Space` key to cycle subtask status (`Initiated` → `Doing` → `Completed`).
  - `Enter` key continuous subtask quick-add with automatic input focus retention.
  - Inline title editing (`F2` or `E`).
- **Classification Tags Manager (`Ctrl + Shift + T`)**: View system tag statistics, create tags, and perform bulk **PURGE ALL TAGS**.
- **Storage Configuration Modal (`Ctrl + Shift + C`)**: Independent path relocation for Strategies `.md` folder and SQLite database file with automatic data copy migration.

---

## ⌨️ KEYBOARD POWER-USER SHORTCUTS

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| <kbd>Tab</kbd> / <kbd>Shift + Tab</kbd> | Global | Cycle active theater tabs (`Execution` ↔ `Arsenal` ↔ `Breach` ↔ `Archive`) |
| <kbd>Ctrl</kbd> + <kbd>1</kbd> .. <kbd>4</kbd> | Global | Jump directly to Theater 1, 2, 3, or 4 |
| <kbd>Ctrl</kbd> + <kbd>F</kbd> or <kbd>/</kbd> | Global | Focus Search Bar |
| <kbd>Esc</kbd> | Global | Clear search bar / Blur input / Close active modal window |
| <kbd>Ctrl</kbd> + <kbd>P</kbd> | Global | Cycle Priority Filter (`ALL` → `HIGH` → `MEDIUM` → `LOW`) |
| <kbd>J</kbd> / <kbd>K</kbd> or <kbd>↓</kbd> / <kbd>↑</kbd> | Theater Cards | Navigate & highlight task cards with auto-scroll |
| <kbd>Double-Click</kbd> | Card Title | Open `.md` briefing note in default Markdown viewer |
| <kbd>M</kbd> / <kbd>S</kbd> | Raw Intel Card | Move Raw Intel to Strategizing stage |
| <kbd>B</kbd> | Strategizing Card | Move Strategizing card back to Raw Intel |
| <kbd>D</kbd> / <kbd>R</kbd> | Card | Open Deployment / Reschedule modal picker |
| <kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd> | Modals | Select Priority (`1`: High, `2`: Medium, `3`: Low) |
| <kbd>J</kbd> / <kbd>K</kbd> | Subtask Window | Navigate & highlight subtask rows |
| <kbd>Space</kbd> | Subtask Window | Cycle subtask status (`Initiated` → `Doing` → `Completed`) |
| <kbd>Enter</kbd> | Subtask Input | Add subtask and retain input focus for rapid entry |
| <kbd>Ctrl</kbd> + <kbd>N</kbd> | Global | Open Log New Intel creator |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd> | Global | Open Storage Configuration Modal |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd> | Global | Open System Tags Manager |
| <kbd>Ctrl</kbd> + <kbd>/</kbd> or <kbd>Ctrl</kbd> + <kbd>?</kbd> | Global | Toggle In-App Help Guide & Cheat Sheet |

---

## 💾 STORAGE ENGINE & DATA ARCHITECTURE

```
                                  ┌─────────────────────────────┐
                                  │   Campaigns Desktop App     │
                                  │   (Electron + Svelte 5)     │
                                  └──────────────┬──────────────┘
                                                 │
                        ┌────────────────────────┴────────────────────────┐
                        ▼                                                 ▼
        ┌───────────────────────────────┐                 ┌───────────────────────────────┐
        │  Embedded WASM SQLite Engine  │                 │  Obsidian Markdown Sync       │
        │  (campaigns.sqlite)           │                 │  (.md Files in Vault)         │
        └───────────────┬───────────────┘                 └───────────────┬───────────────┘
                        │                                                 │
                        ▼                                                 ▼
    %LOCALAPPDATA%\Campaigns\Database\               %USERPROFILE%\Obsidian\Adhipati\Campaigns\
```

### Embedded WASM SQLite Database
- **Engine**: Pure JavaScript/WASM `sql.js` engine operating entirely in RAM with zero native C++ compiler dependencies.
- **Disk Synchronization**: Changes are buffered in RAM and written to disk via 500ms debounced flushes (`saveDbToDisk`).
- **Exit Hooks**: Electron `before-quit` and `will-quit` lifecycle events force an immediate synchronous binary write (`flushDbToDisk`).
- **Optimization**: Startup triggers `PRAGMA optimize;` to keep indices compressed and query execution plans sharp.

### Obsidian Markdown Vault Synchronization
- **Scaffolding**: Automatically creates structured subdirectories inside your Obsidian Vault:
  - `Strategies/Arsenal/RawIntel/`
  - `Strategies/Arsenal/Strategizing/`
  - `Strategies/Execution/`
  - `Strategies/Breach/`
  - `Strategies/Archive/Victory/`
  - `Strategies/Archive/Aborted/`
- **Frontmatter**: Each `.md` note contains YAML frontmatter compatible with Obsidian Dataview:
  ```yaml
  ---
  title: "ZERO DAY PATCH DEPLOYMENT"
  priority: "High"
  state: "Execution"
  stage: "Active"
  deadline: "2026-08-25"
  tags:
    - Adhipati
    - Campaign
    - PATCH
  ---
  ```

### Auto-Healing File System Protocols
- If a `.md` note is manually deleted or renamed outside the application in Windows File Explorer, opening the strategy note automatically regenerates the file from the SQLite database state.
- Relocating the database file via `Ctrl + Shift + C` automatically copies the existing `.sqlite` binary file to the new destination to prevent data loss.

---

## 🛠️ TECHNOLOGY STACK & SYSTEM DESIGN

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Desktop Shell** | Electron v43+ | Cross-platform Chromium & Node.js wrapper |
| **Frontend Framework** | Svelte 5 | Reactive Runes state engine (`$state`, `$derived`, `$effect`) |
| **Build Tooling** | Vite v6+ | Hot Module Replacement (HMR) & production asset bundler |
| **Database Engine** | `sql.js` (SQLite WASM) | In-memory binary database engine |
| **Typography** | `@fontsource` (Outfit & Inter) | 100% offline local font bundles |
| **Iconography** | `lucide-svelte` | Clean, lightweight SVG vector icons |
| **Packaging** | `electron-builder` | Standalone NSIS Windows installer packager |

---

## 💻 CLONING & LOCAL ENVIRONMENT SETUP

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Step-by-Step Setup
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/campaigns.git
   cd campaigns
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run Application in Development Mode**:
   ```bash
   npm run dev
   ```
   *Launches Vite dev server on `http://localhost:5173` and boots Electron shell with hot reload.*

---

## 📦 BUILDING STANDALONE EXECUTABLE & INSTALLERS

### 1. Web Bundle Production Build
Compiles frontend assets into `dist/`:
```bash
npm run build
```

### 2. Standalone Windows NSIS Installer (.exe)
Generates standalone setup installer and portable executable inside `release/`:
```bash
npm run app:build
```

#### Output Artifacts:
- **NSIS Installer**: `release/Campaigns Setup 1.0.0.exe`
- **Unpacked Portable Directory**: `release/win-unpacked/Campaigns.exe`

---

## 🚀 DEVELOPER EXTENSIONS & FUTURE CUSTOMIZATION

### Adding Custom State Pipelines
State configurations are centralized in [`src/lib/store.svelte.js`](file:///C:/Users/karan/Void/Campaigns/src/lib/store.svelte.js). Derived getters compute active theater collections automatically:
```js
executionTasks = $derived(this.tasks.filter(t => t.state === 'Execution'));
arsenalTasks   = $derived(this.tasks.filter(t => t.state === 'Arsenal'));
breachTasks    = $derived(this.tasks.filter(t => t.state === 'Breach'));
archiveTasks   = $derived(this.tasks.filter(t => t.state === 'Archive'));
```

### Modifying Markdown Templates
Markdown frontmatter generator formatting is controlled by `syncMarkdownFile()` in [`electron/main.js`](file:///C:/Users/karan/Void/Campaigns/electron/main.js).

---

## 📜 LICENSE

Distributed under the MIT License. See `LICENSE` for details.
