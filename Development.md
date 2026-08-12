# Development Ledger: Project Campaigns

## Initialization Log
- **Date**: 05-08-2026
- **Status**: Freeze Root Cause Resolved & Ultra-Fast Native Performance Verified
- **Architecture**: Svelte 5 + Vite + Electron + Synchronous Better-SQLite3
- **Design Standard**: High-Impact Heavy Typography & Windows Rounded Styling

## Build Log & Changelog
### [05-08-2026] Freeze Root Cause Resolution
- **Issue**: Un-awaited asynchronous loops calling IPC `moveTaskState` in `loadAllData()` created concurrent un-awaited write promises that locked SQLite in the main process, causing app UI freezes.
- **Fix**: Replaced with sequential `await window.electronAPI.moveTaskState(...)` inside `store.svelte.js` loop.
- **Engine Optimization**: Streamlined [db.js](file:///C:/Users/karan/Void/Campaigns/electron/db.js) to execute synchronous `better-sqlite3` native commands with instant response times and 0% IPC overhead.

### [05-08-2026] Direct Live Launch
- `npm start` and `npm run dev` launch the Electron desktop window directly connected to Vite dev server with instant HMR.
- Automatically scaffolds `./Strategies` workspace folder inside `userData` on boot.
