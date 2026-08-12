<div align="center">

# ⚔️ CAMPAIGNS COMMAND CENTER
### *High-Performance, Zero-Latency Tactical Desktop Command Center*

[![Engine](https://img.shields.io/badge/Engine-SQLite_WASM-8b5cf6?style=for-the-badge&logo=sqlite&logoColor=white)](#-storage-engine--data-architecture)
[![UI Framework](https://img.shields.io/badge/Frontend-Svelte_5_Runes-ff3e00?style=for-the-badge&logo=svelte&logoColor=white)](#-technology-stack--architecture)
[![Shell](https://img.shields.io/badge/Desktop-Electron_v43-47848f?style=for-the-badge&logo=electron&logoColor=white)](#-technology-stack--architecture)
[![Vault](https://img.shields.io/badge/Integration-Obsidian_Markdown-7c3aed?style=for-the-badge&logo=obsidian&logoColor=white)](#-obsidian-markdown-vault-integration)
[![License](https://img.shields.io/badge/License-MIT-10b981?style=for-the-badge)](#-license)

---

**Developed & Engineered by [Karan Singh Verma](https://github.com/karansinghverma979)**  
*Built for personal mission planning, real-time campaign execution, and automated Markdown strategy vault synchronization.*

---

</div>

<br/>

## 🌐 OVERVIEW & EXECUTIVE SUMMARY

**Campaigns Command Center** is a state-of-the-art, local-first tactical mission management platform engineered specifically for power users. Running directly on your Windows desktop with zero network dependencies, Campaigns combines the raw query speed of an embedded WASM **SQLite Database** with the fluid, reactive state engine of **Svelte 5 (Runes)** and the note-taking depth of **Obsidian Markdown Vaults**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 CAMPAIGNS COMMAND CENTER                               │
├──────────────────────────┬───────────────────────────┬─────────────────────────────────┤
│   🚀 LOCAL-FIRST LATENCY │  🛡️ 4 OPERATIONAL THEATERS │  📄 OBSIDIAN VAULT SYNC        │
│   Zero network calls;    │  Execution, Arsenal,      │  Automatic bi-directional       │
│   instant UI updates.    │  Breach, and Archive.     │  YAML frontmatter sync.         │
└──────────────────────────┴───────────────────────────┴─────────────────────────────────┘
```

---

## ⚡ TECH STACK & SYSTEM ARCHITECTURE

<div align="center">

| Layer | Core Technology | Architectural Purpose |
| :--- | :--- | :--- |
| **Desktop Shell** | ![Electron](https://img.shields.io/badge/Electron_v43-3178C6?style=flat-square&logo=electron&logoColor=white) | Cross-platform Chromium environment with IPC context bridge security |
| **UI Framework** | ![Svelte 5](https://img.shields.io/badge/Svelte_5.20-FF3E00?style=flat-square&logo=svelte&logoColor=white) | Reactive Runes state engine (`$state`, `$derived`, `$effect`) |
| **Bundler** | ![Vite 6](https://img.shields.io/badge/Vite_v6.4-646CFF?style=flat-square&logo=vite&logoColor=white) | Ultra-fast HMR and optimized production asset chunking |
| **Database** | ![SQLite](https://img.shields.io/badge/SQLite_sql.js-003B57?style=flat-square&logo=sqlite&logoColor=white) | In-memory WASM binary database with 500ms debounced disk flushes |
| **Typography** | ![Fontsource](https://img.shields.io/badge/@fontsource_Outfit_&_Inter-000000?style=flat-square) | 100% offline local typography; zero startup HTTP requests |
| **Vector Icons** | ![Lucide](https://img.shields.io/badge/Lucide_Svelte-F59E0B?style=flat-square) | Crisp, GPU-accelerated tactical SVG iconography |
| **Packaging** | ![Electron Builder](https://img.shields.io/badge/Electron_Builder-202020?style=flat-square) | Standalone Windows NSIS executable installer builder |

</div>

---

## 🎛️ CORE CAPABILITIES & DEVELOPER SKILLS

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                SYSTEM CAPABILITIES MATRIX                              │
├──────────────────────────────────┬─────────────────────────────────────────────────────┤
│ ⚡ Zero-Lag RAM Engine            │ WASM SQLite database buffers all writes in memory   │
│ 🎯 Instant Keyboard Navigation   │ Complete hands-free J/K navigation & 1/2/3 hotkeys  │
│ 🔔 Windows Native Alerts         │ Desktop breach notifications for overdue deadlines  │
│ 🏷️ Classification Tag Manager     │ Multi-select tag filtering with bulk purge tools    │
│ 🔄 Auto-Healing File System      │ Self-regenerates missing Markdown files from DB    │
│ 🎨 Hardware Compositing          │ Minimal CPU/GPU load via isolated CSS blur layers  │
└──────────────────────────────────┴─────────────────────────────────────────────────────┘
```

---

## 🖥️ UI ARCHITECTURE & SCREEN-BY-SCREEN MANUAL

### 1. Navigation & System Navbar

The main control bar at the top of the viewport handles theater switching, storage settings, and live system status tracking.

![Navbar Screenshot](01_navbar.png)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [⚔️ CAMPAIGNS]  │  [🔥 EXECUTION]  [🧠 ARSENAL]  [⚠️ BREACH]  [📦 ARCHIVE]  │  [⚙️] [🏷️] [❓] │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Brand Refresh (`CAMPAIGNS`)**: Displays a spinning indicator during active database operations. Pressing `Ctrl + R` forces a full system resynchronization.
- **Dynamic Window Title**: Sets the OS window title dynamically (e.g. `Campaigns — 4 Active Execution | 2 Arsenal | 0 Breach`).
- **Theater Tabs**:
  - `EXECUTION` (`Ctrl + 1`): Blue theme. Main active operational theater.
  - `ARSENAL` (`Ctrl + 2`): Purple theme. Staging ground for raw ideas and strategizing outlines.
  - `BREACH` (`Ctrl + 3`): Red theme. Displays overdue campaigns with a pulsing alert badge.
  - `ARCHIVE` (`Ctrl + 4`): Green/Grey theme. Historical victory logs and aborted operations.

---

### 2. Theater 1: Execution (Active Theater)

The operational command center for campaigns actively in progress.

![Execution Theater Screenshot](02_execution.png)

#### Features & Controls:
- **Search Bar**: Debounced title filtering with instant focus (`/` or `Ctrl + F`) and clear/blur (`Escape`).
- **Priority Filter Pills**: Instant filter toggles for `ALL`, `HIGH`, `MEDIUM`, or `LOW`. Cycle filters via `Ctrl + P`.
- **Card Accent Borders**: Priority-coded top border gradients (Red for High, Amber for Medium, Blue for Low).
- **Clickable Tag Pills**: Click any tag pill on a card to instantly filter campaigns matching that tag.
- **Double-Click Title**: Double-clicking a campaign title opens its Markdown briefing note directly in your default editor.

---

### 3. Theater 2: Arsenal (Intel & Strategizing)

The strategic planning theater where new ideas are logged, outlined, and cloned.

![Arsenal Theater Screenshot](03_arsenal.png)

#### Features & Controls:
- **Log New Intel (`Ctrl + N`)**: Open the campaign creation dialog.
- **Raw Intel Column**:
  - Un-deployed campaign ideas.
  - **Move to Strategizing (`M` or `S`)**: Transfer raw intel into the Strategizing column.
  - **Purge (`P`)**: Trigger 60-second purge countdown with cancellation safety.
- **Strategizing Column**:
  - Detailed strategy outline development.
  - **Duplicate Button**: Cyan-coded button to clone a strategizing campaign along with all tags and subtasks.
  - **Deploy to Execution (`D`)**: Set deadline date and launch into active Execution.

---

### 4. Theater 3: Breach (Overdue Recovery)

The crisis recovery theater for campaigns that pass target deadlines without completion.

![Breach Recovery Screenshot](04_breach.png)

#### Features & Controls:
- **Auto Breach Detection**: Evaluates campaign deadlines on app launch and automatically transfers overdue items to Breach.
- **Desktop Alert**: Triggers native Windows desktop notifications on startup when breaches occur.
- **Reschedule Permit System (`R`)**: Reschedule deadline dates (capped at 2 extensions per campaign).

---

### 5. Theater 4: Archive (Victory & Aborted)

The permanent log of finished campaigns and suspended operations.

![Archive Screenshot](05_archive.png)

#### Features & Controls:
- **Victory Log**: Green-accented cards recording completed campaigns, target dates, total days spent, and victory notes.
- **Aborted Log**: Grey-accented cards recording suspended operations with operational justification logs.

---

## ⌨️ KEYBOARD SHORTCUTS CHEAT SHEET

<div align="center">

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

</div>

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

### 1. Embedded WASM SQLite Database
- **Zero-Dependency Engine**: Built using pure JavaScript/WASM `sql.js` running in RAM.
- **Debounced Disk Writes**: Changes are written to disk via 500ms debounced flushes (`saveDbToDisk`).
- **Exit Synchronization**: Electron `before-quit` and `will-quit` lifecycle hooks execute a synchronous disk write (`flushDbToDisk`).

### 2. Obsidian Markdown Vault Integration
- **Default Path**: `%USERPROFILE%\Obsidian\Adhipati\Campaigns\`
- **YAML Frontmatter**: Automatically generated and synchronized for Obsidian Dataview compatibility:
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

---

## 💻 CLONING & LOCAL SETUP

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

```bash
# 1. Clone Repository
git clone https://github.com/karansinghverma979/Campaigns.git
cd Campaigns

# 2. Install Dependencies
npm install

# 3. Launch Development Server
npm run dev
```

---

## 📦 BUILDING PRODUCTION EXECUTABLES

```bash
# Web Asset Production Bundle
npm run build

# Standalone Windows Setup Installer (.exe)
npm run app:build
```

#### Generated Outputs:
- **NSIS Windows Installer**: `release/Campaigns Setup 1.0.0.exe`
- **Portable Directory**: `release/win-unpacked/Campaigns.exe`

---

## 👨‍💻 DEVELOPER CREDITS & AUTHOR

<div align="center">

### **Karan Singh Verma**
*Lead Architect & Software Engineer*

[![GitHub](https://img.shields.io/badge/GitHub-karansinghverma979-181717?style=for-the-badge&logo=github)](https://github.com/karansinghverma979)

---

## 📜 LICENSE

This project is licensed under the **MIT License** — see the `LICENSE` file for details.

</div>
