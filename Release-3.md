# ⚔️ CAMPAIGNS COMMAND CENTER — RELEASE v3.0.0
### *Tactical Mutability Lockdown, Directive Integrity Protocol & Subtask Lifecycle 3.0*

---

## 📑 TABLE OF CONTENTS
1. [Executive Overview](#-executive-overview)
2. [Strike Directives: Tactical Mutability & Abort Lockdown](#-strike-directives-tactical-mutability--abort-lockdown)
3. [Undated Strike Directives & Tactical Holding Bay](#-undated-strike-directives--tactical-holding-bay)
4. [Task Windows: Subtask Mutability & FAILED Protocol](#-task-windows-subtask-mutability--failed-protocol)
5. [Smart Inline Syntax & Instant Keyboard Creation](#-smart-inline-syntax--instant-keyboard-creation)
6. [Edge Cases, Error Handling & What-If Matrix](#-edge-cases-error-handling--what-if-matrix)
7. [Subtask Lifecycle & State Matrix](#-subtask-lifecycle--state-matrix)
8. [Markdown Strategies Protocol 3.0](#-markdown-strategies-protocol-30)
9. [Verification System of Strategies](#-verification-system-of-strategies)
10. [Store Telemetry & Statistics Engine](#-store-telemetry--statistics-engine)
11. [Comprehensive Changelog Ledger](#-comprehensive-changelog-ledger)

---

## 🌐 EXECUTIVE OVERVIEW

**Campaigns v3.0.0** introduces a zero-data-loss **Tactical Mutability Lockdown**, **Undated Strike Directives Holding Bay**, **Zero-Mouse Rapid Creation Workflow**, and **Strategies Verification System** across both the **STRIKES Theater** and **Campaign Task Windows**. 

In high-discipline tactical operations, historical actions and committed efforts must never be silently erased once initiated. Version 3.0 implements strict state-governed mutations for both Strike Directives and Granular Subtasks:
- **Strike Directive Integrity**: Strikes can **ONLY** be permanently deleted if they reside in the `STANDBY` status. Once engaged, pending, aborted, or neutralized, the action button dynamically morphs into an **Abort Directive (`A`)** button, locking the strike into historical logs without losing telemetry.
- **Undated Strike Directives (`status = 'UNDATED'`)**: Dedicated holding bay for spontaneous ideas and unanchored tasks. Capture thoughts with zero cognitive scheduling friction, toggle date modes via UI or inline syntax (`@undated`, `@unplanned`, `@later`), and deploy to Today or any calendar target with a single click.
- **Subtask Lifecycle Integrity**: Subtasks can **ONLY** be permanently deleted if they are in the `Initiated` status. Once work commences (`Doing`) or has concluded (`Completed`), the delete action dynamically transforms into a **`FAILED` (`F`)** button, preserving the mission record.
- **Auto-Focus & Smart Inline Syntax**: Creation modals automatically autofocus the title input on launch (`Ctrl+N`). Typing `#High`, `#Med`, `#Low`, `@undated`, and date tags (`@DD`, `@DD-MM`, `@DD-MM-YYYY`) in task and strike titles automatically sets priority and target dates without touching the mouse.
- **Live Visual UI Feedback**: Instant responsive badges and dynamic card glows react in real time as tags are typed or edited.
- **Strategies Verification System**: Built-in verification protocol ensuring zero corruption, sentinel boundary preservation, and bi-directional SQLite-to-Obsidian alignment.

---

## 🎯 STRIKE DIRECTIVES: TACTICAL MUTABILITY & ABORT LOCKDOWN

In [`src/States/Strikes/Strikes.svelte`](file:///C:/Users/karan/Void/Campaigns/src/States/Strikes/Strikes.svelte), operational directives follow strict mutation rules:

```
                  ┌──────────────────────────────┐
                  │       STANDBY Strike         │
                  └──────────────┬───────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
      [ Trash Button (🗑️) ]            [ Status Transition ]
                 │                               │
        Permanent Deletion                       ▼
                                   ┌───────────────────────────┐
                                   │ ENGAGED / PENDING / etc.  │
                                   └─────────────┬─────────────┘
                                                 │
                                                 ▼
                                        [ Abort Button (A) ]
                                                 │
                                                 ▼
                                      Status Marked: ABORTED
```

### 1. 🛡️ Dynamic Action Button Morphing
- **`STANDBY` Status**: Renders the compact Delete button (`<Trash2 size={15} />`), allowing full deletion of unengaged plans.
- **Non-`STANDBY` Statuses (`ENGAGED`, `PENDING`, `NEUTRALIZED`, `ABORTED`)**: The delete button dynamically converts into the compact **Abort (`A`)** button (`.action-icon-btn.abort`), maintaining identical dimensions (32px × 32px) and layout alignment.
- **Abort Action**: Clicking the Abort button immediately transitions the strike status to `ABORTED` with toast notification (`⛔ Strike directive marked ABORTED.`). If already aborted, the button is disabled to prevent redundant writes.

### 2. ⌨️ Keyboard Navigation Safety Guards
- When navigating strikes via arrow keys, pressing `Delete` or `X`:
  - If focused strike is in `STANDBY`: Prompts `"Delete strike "<Title>"? This cannot be undone."` and executes permanent deletion.
  - If focused strike is non-`STANDBY` and active: Prompts `"Abort strike directive "<Title>"?"` and marks it `ABORTED`.
  - If already `ABORTED`: Displays tactical block toast.

---

## 📦 UNDATED STRIKE DIRECTIVES & TACTICAL HOLDING BAY

Version 3.0 introduces a dedicated **Undated Strike Directives Holding Bay** to eliminate cognitive friction when capturing high-velocity thoughts, ideas, and unplanned micro-missions without forcing an artificial execution date.

```
┌────────────────────────────────────────────────────────────────────────┐
│  ⚡ STRIKES COMMAND                                                     │
│  [ Day ] [ 3 Days ] [ Week ] [ Schedule ] │ [ 📦 4 UNDATED ] [ 📜 BLUEPRINTS ] [ ⏳ 2 PENDING ] │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. 🗄️ Dedicated Database Status (`status = 'UNDATED'`)
- Stored directly in the SQLite `Strikes` table with `status = 'UNDATED'` and `execution_date = ''`.
- **Temporal Isolation**: Automatically excluded from calendar-based views (`Day`, `3 Days`, `Week`, `Schedule`) and immune to midnight auto-PENDING expiration triggers.

### 2. 🚀 Expanded Tactical Holding Bay Modal Window (1080px × 88vh)
Accessible via the `[ 📦 N UNDATED ]` tactical pill in the Strikes header:
- **Maximum Content Capacity**: Enlarged viewport (1080px wide × 88vh high) displaying full titles, priority pill indicators, full notes preview, subtask link tags, and creation dates.
- **In-Modal Instant Search**: Real-time keyword filtering across directive titles and operational notes.
- **Priority Filter Badges**: Fast-filter undated strikes by `ALL`, `🔴 HIGH`, `🟡 MED`, or `🔵 LOW`.
- **1-Click Today Deployment (`⚡ TODAY`)**: Instantly transitions `status = 'UNDATED'` ➔ `status = 'STANDBY'` with `execution_date = todayFormatted`, immediately placing the directive onto today's live tactical radar.
- **Custom Target Date Scheduling (`📅 SCHEDULE`)**: Expands an integrated `Calendar2X` date drawer to schedule and deploy the directive to any target date.
- **Direct Edit & Purge**: Full editing support (`✏️`) and permanent database deletion (`🗑️`) directly from within the holding bay.

### 3. ⌨️ Smart Inline Syntax (`@floating`, `@undated`, `@unplanned`, `@later`, `@none`)
- Typing `@floating`, `@float`, `@undated`, `@unplanned`, `@later`, or `@none` in the strike title input:
  - Dynamically activates Undated mode.
  - Renders live UI feedback badge: `📦 UNDATED DIRECTIVE`.
  - Automatically disables the date picker.
  - Strips the `@floating` / `@undated` token on submit and routes the directive directly into the holding bay.

### 4. 👻 Inline Ghost Autocomplete & Tab Completion Protocol
- As the operator types `#` or `@` tokens in the directive title input:
  - An intelligent **inline ghost overlay** renders dynamically ahead of the user's cursor (`#h` ➔ `#High`, `@f` ➔ `@floating`, `@t` ➔ `@today`, `@u` ➔ `@undated`, `@tom`, `@nextmon`).
  - Renders a synchronized, sleek `[Tab ⇥]` badge directly inside the input.
  - Pressing **`Tab`** instantly accepts and completes the token with trailing spacing, automatically triggering real-time syntax parsing and date/priority assignment with zero friction.

### 5. 🖱️ Visual Mode Toggle
- Inside the Strike Creation & Edit modals, an interactive **`[ 📦 MAKE UNDATED ]`** button toggles between calendar scheduling and the undated holding bay.

---

## 📋 TASK WINDOWS: SUBTASK MUTABILITY & FAILED PROTOCOL

Across all campaign task manifest windows ([`ExecutionTaskWindow.svelte`](file:///C:/Users/karan/Void/Campaigns/src/States/Execution/ExecutionTaskView/ExecutionTaskWindow.svelte), [`BreachTaskWindow.svelte`](file:///C:/Users/karan/Void/Campaigns/src/States/Breach/BreachTaskView/BreachTaskWindow.svelte), [`ArsenalTaskView.svelte`](file:///C:/Users/karan/Void/Campaigns/src/States/Arsenal/ArsenalTaskView/ArsenalTaskView.svelte), and [`ArchiveTaskWindow.svelte`](file:///C:/Users/karan/Void/Campaigns/src/States/Archive/ArchiveTaskView/ArchiveTaskWindow.svelte)):

### 1. 🚫 Strict Deletion Gating
- A subtask is **strictly deletable** only when `status === 'Initiated'` (or null).
- Attempting to delete a subtask in any other status triggers a safety lock: `"Tactical Lock: Only Initiated subtasks can be deleted. Non-initiated subtasks can only be marked Failed."`.

### 2. ⚡ Dynamic `FAILED` (`F`) Button
- When a subtask enters `Doing`, `Completed`, or `Failed`, the delete button automatically morphs into the **FAILED (`F`)** button:
  - **Visual Identifier**: Compact 30px circular button with bold red `F` symbol (`.subtask-fail-btn`).
  - **Action**: Calls `failSubtask(subtaskId)` which updates the database record via IPC to `status = 'Failed'` and refreshes all parent campaign counters.
  - **State Lock**: If the subtask is already marked `Failed`, the button remains disabled with tooltip `"Subtask Already Marked Failed"`.

### 3. 🏷️ Multi-Stage Status Pill Badges
Subtask statuses are visually rendered across all task windows with dedicated color schemes:
- **`INITIATED`** (`Square`): Slate / muted outline (`#94a3b8`).
- **`DOING`** (`Clock`): Amber high-visibility indicator (`#f59e0b`).
- **`COMPLETED`** (`CheckSquare`): Emerald green finalized badge (`#34d399`).
- **`FAILED`** (`XOctagon`): Crimson red failure badge (`#ef4444`).

---

## ⚡ SMART INLINE SYNTAX & INSTANT KEYBOARD CREATION

Release 3 brings complete keyboard-first rapid data entry across both Campaign and Strike creation:

### 1. 🎯 Auto-Focus Action on Modal Mount
- When pressing `Ctrl+N`, `Plus`, or `N`, the creation modal triggers the Svelte lifecycle focus action `use:focusTitleInput`, placing the cursor immediately into the title input box without requiring any mouse clicks.

### 2. 🏷️ Smart Priority Tag Extraction (`#High`, `#Med`, `#Low`)
- **Task Creation Window (`ArsenalTaskCreation.svelte`)**:
  - Typing `#High` (or `#high`, `#HIGH`) automatically activates the **High Priority** card and live pill badge.
  - Typing `#Med` (or `#Medium`) automatically activates **Medium Priority**.
  - Typing `#Low` automatically activates **Low Priority**.
  - On submit (`Enter`), the `#tag` is cleanly stripped so the task is saved with a pristine title.
- **Strike Creation Window (`Strikes.svelte`)**:
  - Typing `#High`, `#Med`, `#Low` in the strike title dynamically sets `newStrikePriority` and lights up the Priority Level dropdown.
  - On dispatch (`Enter`), the hashtag is extracted and cleanly stripped.

### 3. 📅 Advanced Natural Language & Numeric Date Syntax (`@date`)
- **Strike Creation Window (`Strikes.svelte`) & ChronosMath Engine**:
  - **Relative Day Keywords**:
    - `@tom` / `@tomorrow` / `@tmrw` / `@next` / `@nextday` ➔ Tomorrow (+1 day)
    - `@over` / `@overmorrow` / `@ovm` ➔ Day after tomorrow (+2 days)
    - `@today` / `@tod` ➔ Today (+0 days)
  - **Upcoming Weekday Shortcuts**:
    - `@mon` / `@monday` / `@nextmon` / `@nextmonday` ➔ Upcoming Monday
    - `@tue` / `@tues` / `@tuesday` / `@nexttue` / `@nexttuesday` ➔ Upcoming Tuesday
    - `@wed` / `@wednesday` / `@nextwed` / `@nextwednesday` ➔ Upcoming Wednesday
    - `@thu` / `@thur` / `@thurs` / `@thursday` / `@nextthu` / `@nextthursday` ➔ Upcoming Thursday
    - `@fri` / `@friday` / `@nextfri` / `@nextfriday` ➔ Upcoming Friday
    - `@sat` / `@saturday` / `@nextsat` / `@nextsaturday` ➔ Upcoming Saturday
    - `@sun` / `@sunday` / `@nextsun` / `@nextsunday` ➔ Upcoming Sunday
  - **Relative Offset Shifts**:
    - `@+3` / `@+3d` / `@in3d` / `@in3days` ➔ Relative +N days
    - `@+1w` / `@in1w` / `@in2weeks` ➔ Relative +N weeks (+N*7 days)
    - `@+1m` / `@in1m` / `@in1month` ➔ Relative +N months
  - **Calendar Bounds & Weekends**:
    - `@weekend` / `@thisweekend` ➔ Upcoming Saturday
    - `@nextweekend` ➔ Next week's Saturday
    - `@nextmonth` / `@1st` ➔ 1st day of next calendar month
    - `@monthend` / `@eom` ➔ Last day of current calendar month
  - **Numeric Calendar Dates**:
    - `@DD`: Automatically resolves against the current month and year (e.g. `@31` -> `31-08-2026`).
    - `@DD-MM` or `@DD/MM`: Automatically resolves against the current year (e.g. `@01-09` -> `01-09-2026`).
    - `@DD-MM-YYYY` or `@DD/MM/YYYY`: Resolves complete explicit calendar dates (e.g. `@01-10-2026`).
  - **Temporal Integrity Guard**: Every extracted date is strictly validated with `ChronosMath.isValidCalendarDate` and `!parsedDate.isPast`. Setting a past date is rejected with a Tactical Block notification.
  - On dispatch (`Enter`), all valid date tokens are cleanly parsed and stripped from the directive title.

---

## 🔍 EDGE CASES, ERROR HANDLING & WHAT-IF MATRIX

| What-If Scenario | Behavioral Rule & Error Handling | UI & Data State Result |
|---|---|---|
| **Multiple `#` Priority Tags** (e.g. `Task #Low #High`) | The **last declared priority tag** takes precedence. | Priority set to **High**. All `#tag` tokens are stripped from the final saved title. |
| **Natural Language Date Tag** (e.g. `Audit @tom #High`) | Resolves `@tom` to tomorrow's date. | Target Execution Date set to tomorrow. Title saved cleanly as `Audit`. |
| **Weekday Shortcut** (e.g. `Planning @nextmon`) | Resolves `@nextmon` to the upcoming Monday. | Target Execution Date set to Monday date. |
| **Non-Priority `#` Hashtags** (e.g. `Task #Security #High`) | Only recognized priority tokens (`#high`, `#med`, `#medium`, `#low`) mutate the priority card. | Priority set to **High**. `#Security` is preserved or passed to classification. |
| **Multiple `@` Date Tags** (e.g. `Strike @tom @nextmon`) | The **last valid date token** takes precedence. | Execution Date set to upcoming Monday. All `@date` tokens are stripped on submit. |
| **Invalid Calendar Date** (e.g. `Strike @31-02`) | Strict calendar bounds check (`isValidCalendarDate`) rejects impossible dates (e.g. Feb 31). | Ignored gracefully without crashing. Fallback remains today's date or user selection. |
| **Past Date Typed** (e.g. `Strike @10-08-2026`) | Checked against `ChronosMath.isPast`. Target execution date is locked against mutating into the past. | Live UI badge alerts: `⚠️ PAST DATE BLOCKED: 10-08-2026`. Submit blocks past scheduling. |
| **Email Address in Title** (e.g. `Send email to test@domain.com`) | Non-date tokens (e.g. `@domain.com`) fail date keyword resolution and are ignored. | Email addresses are preserved intact without accidental date parsing. |
| **User Deletes/Backspaces Tag** | Real-time `oninput` handler detects removal and clears live badges dynamically. | Live UI feedback pills disappear and previous priority/date is restored. |

---

## 🔄 SUBTASK LIFECYCLE & STATE MATRIX

| Initial State | Available Operations | Action Button Rendered | Next State on Action Click |
|---|---|---|---|
| **Initiated** | Edit Title, Move Up, Delete, Cycle Status (`Doing`) | `<Trash2 />` (Delete) | *Purged from Database* |
| **Doing** | Edit Title, Move Up, Mark Failed, Cycle Status (`Completed`) | `<span class="fail-btn-symbol">F</span>` (Fail) | **`Failed`** |
| **Completed** | Edit Title, Move Up, Status Locked (Finalized Success) | *None (Locked Success)* | *Immutable Record* |
| **Failed** | Edit Title, Move Up, Status Locked (Finalized Failure) | `<span class="fail-btn-symbol">F</span>` (Disabled) | *Immutable Record* |

---

## 📄 MARKDOWN STRATEGIES PROTOCOL 3.0

The Strategy Markdown builder in [`electron/main.js`](file:///C:/Users/karan/Void/Campaigns/electron/main.js) now accurately serializes `Failed` subtasks into standard GFM markdown syntax:

```markdown
## Tactical Subtasks
- [x] Configure SQLite foreign key indexes (COMPLETED)
- [ ] Initial architectural spike for live sync (DOING)
- [ ] ~~Legacy electron-store storage adapter~~ (FAILED)
- [ ] Implement automated backup daemon
```

When reviewed in Obsidian or external editors:
- **Completed** tasks show a checked checkbox with `(COMPLETED)`.
- **Doing** tasks show an unchecked checkbox with `(DOING)`.
- **Failed** tasks show a strikethrough title with `(FAILED)` tag.
- **Initiated** tasks show a standard unchecked checkbox.

---

## 🛡️ VERIFICATION SYSTEM OF STRATEGIES

Campaigns v3.0 features a dedicated interactive verification system accessible via [`StorageConfigModal.svelte`](file:///C:/Users/karan/Void/Campaigns/src/components/StorageConfigModal.svelte) and IPC handler `verify-strategies-integrity`:

1. **6-Tier Directory Hierarchy Verification**:
   Verifies existence of all stage directories: `Arsenal/RawIntel`, `Arsenal/Strategizing`, `Execution`, `Breach`, `Archive/Victory`, `Archive/Aborted`. Missing directories are auto-repaired.
2. **Immutable Task ID Verification**:
   Scans the first 2048 bytes of markdown headers using `findExistingMarkdownById` to verify task ownership independently of filesystem naming.
3. **Sentinel Notes Protection Verification**:
   Guarantees that user notes below `<!-- @@CAMPAIGNS_NOTES_START@@ -->` remain 100% untouched during all state shifts, renames, and batch synchronization runs.
4. **On-Demand Materialization Gate**:
   Ensures disk hygiene by preventing creation of empty strategy files until explicitly opened by the operator.
5. **Interactive Diagnostic Audit**:
   Clicking **"VERIFY INTEGRITY"** runs a real-time audit reporting:
   - Scanned files count
   - Valid & synced files count
   - Notes-protected files count
   - Directory health status

---

## 📊 STORE TELEMETRY & STATISTICS ENGINE

In [`src/lib/store.svelte.js`](file:///C:/Users/karan/Void/Campaigns/src/lib/store.svelte.js):
- `updateTaskSubtaskStats(taskId, subtasks)` now automatically tracks `t.subtask_failed`:
  ```javascript
  t.subtask_total = subtasks.length;
  t.subtask_completed = subtasks.filter(s => s.status === 'Completed').length;
  t.subtask_doing = subtasks.filter(s => s.status === 'Doing').length;
  t.subtask_failed = subtasks.filter(s => s.status === 'Failed').length;
  ```
- `verifyStrategies()` provides programmatic auditing across the application.
- Retains real-time in-place patching to prevent DOM recreation when subtask stages transition.

---

## 📝 COMPREHENSIVE CHANGELOG LEDGER

| Component | File | Changes Implemented |
|---|---|---|
| **Strikes View** | [`Strikes.svelte`](file:///C:/Users/karan/Void/Campaigns/src/States/Strikes/Strikes.svelte) | - Gated `handleDelete` strictly to `STANDBY` strikes.<br>- Added `handleAbortStrike` handler.<br>- Converted delete button into Abort (`A`) button for non-`STANDBY` strikes.<br>- Added `use:focusTitleInput` auto-focus on modal open.<br>- Added smart inline `#High`, `#Med`, `#Low` priority tag detection with live UI pill badge.<br>- Added smart inline `@DD`, `@DD-MM`, `@DD-MM-YYYY` date parsing with strict past-date lock and live UI pill badge.<br>- Added **Tactical Undated Directives Holding Bay Modal (1080px × 88vh)** with in-modal search, priority filtering, and expandable custom date scheduler drawer.<br>- Added prominent `[ 📦 N UNDATED ]` tactical header badge.<br>- Added modern **Inline Ghost Autocomplete & Tab Completion Engine** (`[Tab ⇥]`) for `#` and `@` tokens (`#High`, `#Med`, `#Low`, `@floating`, `@undated`, `@today`, `@tom`, `@nextmon`).<br>- Added `[ 📦 MAKE UNDATED ]` mode toggle in Strike creation & edit modals.<br>- Added smart inline `@floating`, `@float`, `@undated`, `@unplanned`, `@later`, `@none` syntax detection with live UI feedback badge.<br>- Added 1-click **Deploy to Today** action (`deployUndatedToToday`).<br>- Handled multi-tag precedence (last-tag wins).<br>- Added clean title stripping helper `cleanStrikeTitle`. |
| **Task Creation** | [`ArsenalTaskCreation.svelte`](file:///C:/Users/karan/Void/Campaigns/src/States/Arsenal/ArsenalTaskCreation/ArsenalTaskCreation.svelte) | - Added inline `#High`, `#Med`, `#Low` priority tag detection on title input with live UI pill badge.<br>- Handled multi-tag precedence (last-tag wins).<br>- Cleaned title on submit.<br>- Ensured autofocus on modal open. |
| **Chronos Math** | [`ChronosMath.js`](file:///C:/Users/karan/Void/Campaigns/src/lib/ChronosMath.js) | - Enhanced `parseSubtaskDate` to scan all `@date` occurrences via global regex.<br>- Added multi-date resolution choosing the last valid calendar date.<br>- Added `allMatchedTexts` for complete string cleaning. |
| **Storage Config** | [`StorageConfigModal.svelte`](file:///C:/Users/karan/Void/Campaigns/src/components/StorageConfigModal.svelte) | - Added **"VERIFY INTEGRITY"** button and live audit diagnostic card. |
| **Electron Backend** | [`electron/main.js`](file:///C:/Users/karan/Void/Campaigns/electron/main.js) | - Implemented `verify-strategies-integrity` IPC handler.<br>- Updated `buildMarkdownContent` to format `Failed` subtasks as `- [ ] ~~${subTitle}~~ (FAILED)`. |
| **Preload Bridge** | [`electron/preload.cjs`](file:///C:/Users/karan/Void/Campaigns/electron/preload.cjs) | - Added `verifyStrategiesIntegrity` IPC bridge. |
| **Store Engine** | [`src/lib/store.svelte.js`](file:///C:/Users/karan/Void/Campaigns/src/lib/store.svelte.js) | - Added `verifyStrategies()` store method.<br>- Added `t.subtask_failed` counter to `updateTaskSubtaskStats`.<br>- Added `deployUndatedStrike(id, targetDate)` store helper.<br>- Protected `UNDATED` status from auto-PENDING expiration check. |

---
*Campaigns v3.0.0 — Engineered for absolute data integrity and unyielding operational discipline.*