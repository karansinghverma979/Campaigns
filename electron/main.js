import { app, BrowserWindow, ipcMain, dialog, shell, Notification, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase, getDb, flushDbToDisk } from './db.js';

// Debounce map for markdown file writes — stores task, strategiesPath, and timer
const markdownDebounceTimers = new Map();

function flushPendingMarkdownSyncs() {
  for (const [key, item] of markdownDebounceTimers.entries()) {
    clearTimeout(item.timer);
    try {
      syncMarkdownFile(item.strategiesPath, item.task);
    } catch (e) {
      console.error(`Error flushing markdown sync for task ${key}:`, e);
    }
  }
  markdownDebounceTimers.clear();
}

app.on('before-quit', () => {
  try { flushPendingMarkdownSyncs(); } catch (e) {}
  try { flushDbToDisk(); } catch (e) {}
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Disable GPU shader disk cache locks on Windows
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

let mainWindow = null;
const configPath = path.join(app.getPath('userData'), 'config.json');

function debouncedSyncMarkdown(strategiesPath, task, delay = 500) {
  if (!task || !task.id) return;
  const key = task.id;
  if (markdownDebounceTimers.has(key)) {
    clearTimeout(markdownDebounceTimers.get(key).timer);
  }
  const timer = setTimeout(() => {
    syncMarkdownFile(strategiesPath, task);
    markdownDebounceTimers.delete(key);
  }, delay);
  markdownDebounceTimers.set(key, { timer, task, strategiesPath });
}

function getDefaultStrategiesPath() {
  return path.join(app.getPath('home'), 'Obsidian', 'Adhipati', 'Campaigns');
}

function getDefaultDbPath() {
  // Store SQLite database safely in AppData/Local/Campaigns/Database/campaigns.sqlite
  return path.join(app.getPath('appData'), 'Campaigns', 'Database', 'campaigns.sqlite');
}

let cachedConfig = null;

function getConfig() {
  if (cachedConfig) return cachedConfig;
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && parsed.strategiesPath) {
        if (!parsed.dbPath) {
          parsed.dbPath = getDefaultDbPath();
          saveConfig(parsed);
        }
        cachedConfig = parsed;
        return cachedConfig;
      }
    }
  } catch (e) {
    console.error('Error reading config.json:', e);
  }
  // Standard default paths: Obsidian Vault for Strategies, AppData for SQLite DB
  cachedConfig = {
    strategiesPath: getDefaultStrategiesPath(),
    dbPath: getDefaultDbPath(),
    isConfigured: true
  };
  saveConfig(cachedConfig);
  return cachedConfig;
}

function saveConfig(config) {
  try {
    cachedConfig = { ...config };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing config.json:', e);
  }
}

function sanitizeFilename(title) {
  return title.replace(/[/\\?%*:|"<>]/g, '-').replace(/^-+|-+$/g, '').trim();
}

// Returns the subfolder path (relative to strategiesPath) based on state + stage
function getFolderForState(state, stage) {
  switch (state) {
    case 'Arsenal':
      return (stage === 'Strategizing') ? path.join('Arsenal', 'Strategizing') : path.join('Arsenal', 'RawIntel');
    case 'Execution': return 'Execution';
    case 'Breach':    return 'Breach';
    case 'Archive':
      return (stage === 'Aborted') ? path.join('Archive', 'Aborted') : path.join('Archive', 'Victory');
    default:
      return path.join('Arsenal', 'RawIntel');
  }
}

/**
 * Scan all markdown files across all known state folders to find one whose
 * YAML frontmatter contains "Task Id: <id>". Returns the absolute file path
 * or null if not found. This is the single source of truth that prevents
 * duplicate files when a task is renamed or its stage changes.
 */
function findExistingMarkdownById(strategiesPath, taskId) {
  const allFolders = [
    path.join('Arsenal', 'RawIntel'),
    path.join('Arsenal', 'Strategizing'),
    'Execution',
    'Breach',
    path.join('Archive', 'Victory'),
    path.join('Archive', 'Aborted'),
  ];
  const idTag = `Task Id: ${taskId}`;
  for (const folder of allFolders) {
    const dir = path.join(strategiesPath, folder);
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const fullPath = path.join(dir, file);
        try {
          // Read first 2048 bytes — safely captures large YAML frontmatter with many tags/fields
          const fd = fs.openSync(fullPath, 'r');
          const buf = Buffer.alloc(2048);
          const bytesRead = fs.readSync(fd, buf, 0, 2048, 0);
          fs.closeSync(fd);
          const head = buf.toString('utf-8', 0, bytesRead);
          if (head.includes(idTag)) return fullPath;
        } catch (_) {}
      }
    } catch (_) {}
  }
  return null;
}

let activeDbPath = null;

async function scaffoldStrategiesDir(strategiesPath, dbPath) {
  if (strategiesPath) {
    const folders = [
      path.join('Arsenal', 'RawIntel'),
      path.join('Arsenal', 'Strategizing'),
      'Execution',
      'Breach',
      path.join('Archive', 'Victory'),
      path.join('Archive', 'Aborted'),
    ];
    for (const folder of folders) {
      const fullPath = path.join(strategiesPath, folder);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
  }
  const resolvedDbPath = dbPath || getDefaultDbPath();
  if (activeDbPath !== resolvedDbPath) {
    const res = await initDatabase(resolvedDbPath);
    if (!res.success) {
      throw new Error('Database initialization failed: ' + res.error);
    }
    activeDbPath = resolvedDbPath;
  }
}

function getFormattedToday() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function parseDDMMYYYY(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  return new Date(parts[2], parts[1] - 1, parts[0]);
}

function calculateDaysSpent(startDateStr, endDateStr) {
  const start = parseDDMMYYYY(startDateStr);
  const end = parseDDMMYYYY(endDateStr);
  if (!start || !end) return 1;
  const diffMs = end.getTime() - start.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return (days < 0 ? 0 : days) + 1; // Both days included
}

function buildMarkdownContent(task, dbTags = [], subtasks = [], existingUserNotes = '') {
  if (!task) return '';
  // Build tags list: Default ["Adhipati", "Campaign"] + DB tags
  const tagSet = new Set(['Adhipati', 'Campaign']);
  if (dbTags && Array.isArray(dbTags)) {
    for (const t of dbTags) {
      if (t && t.tag_name) tagSet.add(String(t.tag_name).trim());
    }
  }
  const tagsList = Array.from(tagSet);

  if (!existingUserNotes) {
    existingUserNotes = '*(Record strategic planning, technical notes, and operational logs here)*';
  }

  // Build Portion 1: Obsidian Native YAML Properties Frontmatter
  let yamlLines = ['---'];
  yamlLines.push(`Task Id: ${task.id || ''}`);
  
  // Tags property right after Task Id (always includes Adhipati & Campaign)
  yamlLines.push('Tags:');
  for (const tag of tagsList) {
    yamlLines.push(`  - ${tag}`);
  }

  yamlLines.push(`Origin Date: ${task.origin_date || ''}`);
  yamlLines.push(`Modification Date: ${task.modification_date || task.origin_date || ''}`);
  yamlLines.push(`Priority: ${task.priority || 'Medium'}`);
  yamlLines.push(`State: ${task.state || 'Arsenal'}`);
  yamlLines.push(`Stage: ${task.stage || 'RawIntel'}`);
  
  if (task.deadline) yamlLines.push(`Deadline: ${task.deadline}`);
  if (task.initiated_at) yamlLines.push(`Initiated Date: ${task.initiated_at}`);
  if (task.reschedule_count && task.reschedule_count > 0) yamlLines.push(`Reschedule Time: ${task.reschedule_count}`);
  if (task.reschedule_1) yamlLines.push(`Reschedule 1: ${task.reschedule_1}`);
  if (task.reschedule_2) yamlLines.push(`Reschedule 2: ${task.reschedule_2}`);
  if (task.ended_date) yamlLines.push(`Ended Date: ${task.ended_date}`);
  if (task.days_spent !== undefined && task.days_spent !== null) yamlLines.push(`Days Spent: ${task.days_spent}`);
  if (task.end_note && typeof task.end_note === 'string') {
    yamlLines.push(`Tactical End Note: "${task.end_note.replace(/"/g, '\\"')}"`);
  }
  yamlLines.push('---');

  // Build Portion 2: Tactical Subtasks
  let subtaskLines = [];
  subtaskLines.push('## Tactical Subtasks');
  if (subtasks && Array.isArray(subtasks) && subtasks.length > 0) {
    for (const st of subtasks) {
      if (!st) continue;
      const subTitle = st.title ? String(st.title).trim() : 'Untitled Subtask';
      if (st.status === 'Completed') {
        subtaskLines.push(`- [x] ${subTitle} (COMPLETED)`);
      } else if (st.status === 'Doing') {
        subtaskLines.push(`- [ ] ${subTitle} (DOING)`);
      } else if (st.status === 'Failed') {
        subtaskLines.push(`- [ ] ~~${subTitle}~~ (FAILED)`);
      } else {
        subtaskLines.push(`- [ ] ${subTitle}`);
      }
    }
  } else {
    subtaskLines.push('*(No tactical subtasks logged yet)*');
  }

  // Build Full Markdown Content
  return [
    yamlLines.join('\n'),
    '',
    subtaskLines.join('\n'),
    '',
    '## Strategies & Operational Notes',
    NOTES_SENTINEL,
    existingUserNotes,
    ''
  ].join('\n');
}

// Sentinel line that acts as a hard boundary between app-managed content (above)
// and user freeform notes (below). The app ONLY reads/writes above this line.
const NOTES_SENTINEL = '<!-- @@CAMPAIGNS_NOTES_START@@ DO NOT EDIT OR REMOVE THIS LINE -->';

async function writeTaskMarkdown(strategiesPath, task, dbTags = [], subtasks = [], { onDemand = false } = {}) {
  if (!strategiesPath || !task || !task.id) return;
  try {
    const folder = getFolderForState(task.state || 'Arsenal', task.stage || 'RawIntel');
    const rawSafe = sanitizeFilename(task.title || '');
    const safeTitle = rawSafe || `task_${task.id}`;
    const desiredFileName = `${safeTitle}.md`;
    const desiredPath = path.join(strategiesPath, folder, desiredFileName);

    // --- STEP 1: Find existing file by Task Id in frontmatter (across all folders) ---
    const existingPath = findExistingMarkdownById(strategiesPath, task.id);

    // --- STEP 2: Read user notes from wherever the file currently lives (BEFORE any move/delete) ---
    let existingUserNotes = '';
    const sourcePathForNotes = existingPath || desiredPath;
    if (fs.existsSync(sourcePathForNotes)) {
      try {
        const fileContent = await fs.promises.readFile(sourcePathForNotes, 'utf-8');
        const sentinelIdx = fileContent.indexOf(NOTES_SENTINEL);
        if (sentinelIdx !== -1) {
          existingUserNotes = fileContent.substring(sentinelIdx + NOTES_SENTINEL.length).trimStart();
        }
      } catch (_) {}
    }

    // --- STEP 3: ON-DEMAND GATE ---
    // If no file exists anywhere yet and this is not an on-demand open, do nothing.
    const fileAlreadyExists = !!existingPath || fs.existsSync(desiredPath);
    if (!fileAlreadyExists && !onDemand) return;

    // --- STEP 4: Ensure destination folder exists ---
    const folderPath = path.dirname(desiredPath);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // --- STEP 5: If file moved to a new path, rename (move) it atomically ---
    // renameSync is atomic on same-volume. If it fails (cross-volume), use
    // copyFileSync + unlinkSync so source is only removed after copy succeeds.
    if (existingPath && existingPath !== desiredPath) {
      try {
        fs.renameSync(existingPath, desiredPath);
      } catch (_) {
        try {
          fs.copyFileSync(existingPath, desiredPath);
          fs.unlinkSync(existingPath);
        } catch (__) {
          // If even copy fails, we still have the source intact — proceed to overwrite desiredPath
        }
      }
    }

    // --- STEP 6: Write the updated content (with preserved user notes) ---
    const fullContent = buildMarkdownContent(task, dbTags, subtasks, existingUserNotes);
    await fs.promises.writeFile(desiredPath, fullContent, 'utf-8');

  } catch (err) {
    console.error(`Error writing markdown file for task ${task.id}:`, err);
  }
}

async function syncMarkdownFile(strategiesPath, task, opts = {}) {
  try {
    if (!strategiesPath || !task || !task.id) return;
    const db = getDb();
    const dbTags = db.prepare('SELECT tag_name FROM Tags WHERE task_id = ?').all(task.id);
    const subtasks = db.prepare('SELECT * FROM Subtasks WHERE task_id = ? ORDER BY id ASC').all(task.id);
    await writeTaskMarkdown(strategiesPath, task, dbTags, subtasks, opts);
  } catch (err) {
    console.error('Error syncing markdown file:', err);
  }
}

async function moveOrRenameMarkdownFile(strategiesPath, oldTitle, oldState, oldStage, taskData) {
  try {
    const oldFolder = getFolderForState(oldState, oldStage);
    const oldFileName = `${sanitizeFilename(oldTitle)}.md`;
    const oldPath = path.join(strategiesPath, oldFolder, oldFileName);

    // Use ID-based lookup as primary strategy to find the real current file
    const existingPath = findExistingMarkdownById(strategiesPath, taskData.id);

    // Delete the old-named file if it's in the wrong location
    if (existingPath && existingPath !== oldPath) {
      // already tracked — sync will move it
    } else if (fs.existsSync(oldPath)) {
      // will be handled during writeTaskMarkdown's stale-copy deletion
    }

    // Sync to desired location (writeTaskMarkdown handles moving/renaming via ID scan)
    await syncMarkdownFile(strategiesPath, taskData);
  } catch (err) {
    console.error('Error moving/renaming markdown file:', err);
    await syncMarkdownFile(strategiesPath, taskData);
  }
}

function updateTaskModificationDate(taskId) {
  try {
    const today = getFormattedToday();
    const db = getDb();
    const cfg = getConfig();
    db.prepare('UPDATE Tasks SET modification_date = ? WHERE id = ?').run(today, taskId);
    const task = db.prepare('SELECT * FROM Tasks WHERE id = ?').get(taskId);
    if (task && cfg.strategiesPath) {
      // Debounce the file write — batch rapid tag/subtask changes into one flush
      debouncedSyncMarkdown(cfg.strategiesPath, task, 500);
    }
  } catch (e) {
    console.error('Error updating task modification date:', e);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    icon: path.join(__dirname, '../build/icon.png'),
    backgroundColor: '#05080f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: true
    }
  });

  // Open window maximized
  mainWindow.maximize();

  mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
    console.error('[MAIN] Preload error:', preloadPath, error.message);
  });

  // Inactive window & background throttling event emitters
  mainWindow.on('focus', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-focus-change', { isFocused: true });
    }
  });
  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-focus-change', { isFocused: false });
    }
  });
  mainWindow.on('minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-focus-change', { isFocused: false });
    }
  });
  mainWindow.on('restore', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-focus-change', { isFocused: true });
    }
  });

  const distPath = path.join(__dirname, '../dist/index.html');
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }
}

app.whenReady().then(async () => {
  createWindow();

  const cfg = getConfig();
  try {
    await scaffoldStrategiesDir(cfg.strategiesPath, cfg.dbPath);
    saveConfig(cfg);
  } catch (e) {
    console.error('Scaffolding error during startup:', e);
    try {
      const defaultStrategiesDir = getDefaultStrategiesPath();
      const defaultDbPath = getDefaultDbPath();
      cfg.strategiesPath = defaultStrategiesDir;
      cfg.dbPath = defaultDbPath;
      await scaffoldStrategiesDir(defaultStrategiesDir, defaultDbPath);
      saveConfig(cfg);
    } catch (fallbackErr) {
      console.error('Fallback scaffolding error:', fallbackErr);
    }
  }

  scheduleMidnightCheck();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

let midnightTimer = null;

function isDatePassed(deadlineStr, currentDateStr) {
  const d1 = parseDDMMYYYY(deadlineStr);
  const d2 = parseDDMMYYYY(currentDateStr);
  if (!d1 || !d2) return false;
  return d1.getTime() < d2.getTime();
}

function scheduleMidnightCheck() {
  if (midnightTimer) clearTimeout(midnightTimer);
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  const msUntilMidnight = Math.max(1000, nextMidnight.getTime() - now.getTime());

  midnightTimer = setTimeout(() => {
    try {
      checkMidnightBreachesAndNotifications();
    } catch (e) {
      console.error('Midnight check error:', e);
    }
    scheduleMidnightCheck();
  }, msUntilMidnight);
}

function checkMidnightBreachesAndNotifications() {
  try {
    const db = getDb();
    if (!db) return;

    const todayStr = getFormattedToday();
    const cfg = getConfig();

    // 1. Check and transition overdue Execution tasks to Breach
    const activeTasks = db.prepare("SELECT * FROM Tasks WHERE state = 'Execution' AND deadline IS NOT NULL").all();
    let newlyBreachedCount = 0;

    for (const t of activeTasks) {
      if (t.deadline && isDatePassed(t.deadline, todayStr)) {
        db.prepare(`
          UPDATE Tasks
          SET state = 'Breach', stage = 'Overdue', modification_date = ?
          WHERE id = ?
        `).run(todayStr, t.id);

        newlyBreachedCount++;

        if (cfg.strategiesPath) {
          const updated = db.prepare('SELECT * FROM Tasks WHERE id = ?').get(t.id);
          if (updated) debouncedSyncMarkdown(cfg.strategiesPath, updated);
        }
      }
    }

    if (newlyBreachedCount > 0) {
      if (Notification.isSupported()) {
        new Notification({
          title: '🚨 CAMPAIGN BREACH ALERT',
          body: `${newlyBreachedCount} active campaign(s) passed deadline and moved to Breach Recovery.`
        }).show();
      }
    }

    // Always inform renderer to update date and refresh store if open
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('midnight-date-change', { today: todayStr, newlyBreachedCount });
    }

    // 2. Check midnight subtasks
    checkMidnightSubtaskNotifications(todayStr);
  } catch (e) {
    console.error('Midnight breaches and notifications error:', e);
  }
}

function checkMidnightSubtaskNotifications(todayStr = getFormattedToday()) {
  try {
    const db = getDb();
    if (!db) return;

    const subtasks = db.prepare("SELECT * FROM Subtasks WHERE status != 'Completed'").all();

    let countDueToday = 0;
    if (subtasks && subtasks.length > 0) {
      for (const st of subtasks) {
        if (!st.title) continue;
        const match = st.title.match(/@(\d{1,2})(?:-(\d{1,2}))?(?:-(\d{2,4}))?\b/);
        if (match) {
          const day = parseInt(match[1], 10);
          const now = new Date();
          let month = match[2] !== undefined ? parseInt(match[2], 10) - 1 : now.getMonth();
          let year = match[3] !== undefined ? parseInt(match[3], 10) : now.getFullYear();
          if (year < 100) year += 2000;

          const dd = String(day).padStart(2, '0');
          const mm = String(month + 1).padStart(2, '0');
          const formatted = `${dd}-${mm}-${year}`;

          if (formatted === todayStr) {
            countDueToday++;
          }
        }
      }
    }

    if (countDueToday > 0 && Notification.isSupported()) {
      new Notification({
        title: '⏰ MIDNIGHT SUBTASK ALERT',
        body: `You have ${countDueToday} tactical subtask(s) scheduled for execution today (${todayStr}).`
      }).show();
    }
  } catch (e) {
    console.error('Midnight check error:', e);
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('get-config', async () => {
  try {
    const cfg = getConfig();
    return {
      strategiesPath: cfg.strategiesPath,
      dbPath: cfg.dbPath,
      isConfigured: true
    };
  } catch (e) {
    return { strategiesPath: null, dbPath: null, isConfigured: false, error: e.message };
  }
});

ipcMain.handle('select-strategies-dir', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Location for Strategies Command Center',
      properties: ['openDirectory', 'createDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      const cfg = getConfig();
      cfg.strategiesPath = selectedPath;
      await scaffoldStrategiesDir(selectedPath, cfg.dbPath);
      saveConfig(cfg);
      return { success: true, strategiesPath: selectedPath, dbPath: cfg.dbPath };
    }
    return { success: false, error: 'Cancelled by user' };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('relocate-strategies-dir', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Relocate Strategies Command Center Directory',
      properties: ['openDirectory', 'createDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      const cfg = getConfig();
      cfg.strategiesPath = selectedPath;
      await scaffoldStrategiesDir(selectedPath, cfg.dbPath);
      saveConfig(cfg);
      return { success: true, strategiesPath: selectedPath, dbPath: cfg.dbPath };
    }
    return { success: false, error: 'Cancelled by user' };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// New: Select DB file path independently (folder picker — file will be named campaigns.sqlite inside)
ipcMain.handle('select-db-dir', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Folder to Store campaigns.sqlite Database',
      properties: ['openDirectory', 'createDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const selectedDir = result.filePaths[0];
      const newDbPath = path.join(selectedDir, 'campaigns.sqlite');
      const cfg = getConfig();
      cfg.dbPath = newDbPath;
      await initDatabase(newDbPath);
      saveConfig(cfg);
      return { success: true, dbPath: newDbPath };
    }
    return { success: false, error: 'Cancelled by user' };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// New: Relocate DB file path independently
ipcMain.handle('relocate-db-dir', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Relocate campaigns.sqlite Database to New Folder',
      properties: ['openDirectory', 'createDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const selectedDir = result.filePaths[0];
      const newDbPath = path.join(selectedDir, 'campaigns.sqlite');
      const cfg = getConfig();
      const oldDbPath = cfg.dbPath;

      // Automatically copy existing DB file to new path if moving locations
      if (oldDbPath && oldDbPath !== newDbPath && fs.existsSync(oldDbPath) && !fs.existsSync(newDbPath)) {
        try {
          fs.copyFileSync(oldDbPath, newDbPath);
        } catch (copyErr) {
          console.error('Failed to copy database file to new location:', copyErr);
        }
      }

      cfg.dbPath = newDbPath;
      await initDatabase(newDbPath);
      saveConfig(cfg);
      return { success: true, dbPath: newDbPath };
    }
    return { success: false, error: 'Cancelled by user' };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Tasks IPC
ipcMain.handle('get-tasks', () => {
  try {
    const db = getDb();
    const tasks = db.prepare('SELECT * FROM Tasks ORDER BY id DESC').all();
    const tags = db.prepare('SELECT * FROM Tags').all();

    const tagsMap = {};
    for (const tag of tags) {
      if (!tagsMap[tag.task_id]) tagsMap[tag.task_id] = [];
      tagsMap[tag.task_id].push(tag);
    }

    const subtaskStats = db.prepare(`
      SELECT task_id, 
             COUNT(*) as total, 
             SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
             SUM(CASE WHEN status = 'Doing' THEN 1 ELSE 0 END) as doing
      FROM Subtasks GROUP BY task_id
    `).all();

    const subtasksMap = {};
    for (const stat of subtaskStats) {
      subtasksMap[stat.task_id] = { total: stat.total, completed: stat.completed, doing: stat.doing };
    }

    for (const task of tasks) {
      task.tags = tagsMap[task.id] || [];
      const stats = subtasksMap[task.id] || { total: 0, completed: 0, doing: 0 };
      task.subtask_total = stats.total;
      task.subtask_completed = stats.completed;
      task.subtask_doing = stats.doing;
    }

    return { success: true, tasks };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

function isValidDDMMYYYY(str) {
  if (!str || typeof str !== 'string') return false;
  const parts = str.trim().split('-');
  if (parts.length !== 3) return false;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
  if (month < 0 || month > 11 || day < 1 || day > 31 || year < 1900 || year > 2200) return false;
  const d = new Date(year, month, day, 0, 0, 0, 0);
  return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
}

ipcMain.handle('create-task', (event, taskData) => {
  try {
    const db = getDb();
    const cfg = getConfig();
    if (!taskData || !taskData.title || typeof taskData.title !== 'string' || !taskData.title.trim()) {
      throw new Error('Task title cannot be empty.');
    }
    const title = taskData.title.trim();
    const origin_date = isValidDDMMYYYY(taskData.origin_date) ? taskData.origin_date.trim() : getFormattedToday();
    const priority = ['High', 'Medium', 'Low'].includes(taskData.priority) ? taskData.priority : 'Medium';
    const state = ['Arsenal', 'Execution', 'Breach', 'Archive'].includes(taskData.state) ? taskData.state : 'Arsenal';
    const stage = taskData.stage || (state === 'Execution' ? 'Active' : 'RawIntel');
    const tags = Array.isArray(taskData.tags) ? taskData.tags : [];
    const modification_date = origin_date;

    const info = db.prepare(`
      INSERT INTO Tasks (title, origin_date, modification_date, priority, state, stage, reschedule_count)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(title, origin_date, modification_date, priority, state, stage);

    const taskId = info.lastInsertRowid;

    if (tags && tags.length > 0) {
      const insertTag = db.prepare('INSERT INTO Tags (task_id, tag_name) VALUES (?, ?)');
      for (const t of tags) {
        if (t && typeof t === 'string' && t.trim()) {
          insertTag.run(taskId, t.trim().toUpperCase());
        }
      }
    }

    const newTask = db.prepare('SELECT * FROM Tasks WHERE id = ?').get(taskId);
    if (newTask) {
      newTask.tags = db.prepare('SELECT * FROM Tags WHERE task_id = ?').all(taskId);
      newTask.subtask_total = 0;
      newTask.subtask_completed = 0;
      newTask.subtask_doing = 0;
    }

    // NOTE: .md file is NOT auto-created on task creation.
    // It is created on-demand only when the user clicks "Open Strategies File".

    return { success: true, task: newTask };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('duplicate-task', (event, { taskId, origin_date }) => {
  try {
    const db = getDb();
    const cfg = getConfig();
    if (!taskId) throw new Error('Valid task ID required for duplication');
    const orig = db.prepare('SELECT * FROM Tasks WHERE id = ?').get(taskId);
    if (!orig) throw new Error('Source campaign not found');

    const copyTitle = `${orig.title} (Copy)`;
    const priority = orig.priority === 'Critical' ? 'High' : orig.priority;
    const origin = isValidDDMMYYYY(origin_date) ? origin_date.trim() : getFormattedToday();
    // Preserve stage if copying within Arsenal (e.g. Strategizing copy stays in Strategizing)
    const stage = (orig.state === 'Arsenal' && orig.stage === 'Strategizing') ? 'Strategizing' : 'RawIntel';

    const info = db.prepare(`
      INSERT INTO Tasks (title, origin_date, modification_date, priority, state, stage, reschedule_count)
      VALUES (?, ?, ?, ?, 'Arsenal', ?, 0)
    `).run(copyTitle, origin, origin, priority, stage);

    const newTaskId = info.lastInsertRowid;

    // Clone tags in bulk
    const origTags = db.prepare('SELECT tag_name FROM Tags WHERE task_id = ?').all(taskId);
    if (origTags && origTags.length > 0) {
      const insertTag = db.prepare('INSERT INTO Tags (task_id, tag_name) VALUES (?, ?)');
      for (const t of origTags) {
        insertTag.run(newTaskId, t.tag_name);
      }
    }

    // Clone subtasks in bulk with status reset to 'Initiated' (#13)
    const origSubtasks = db.prepare('SELECT title, status FROM Subtasks WHERE task_id = ? ORDER BY id ASC').all(taskId);
    if (origSubtasks && origSubtasks.length > 0) {
      const insertSub = db.prepare('INSERT INTO Subtasks (task_id, title, creation_time, status) VALUES (?, ?, ?, ?)');
      for (const st of origSubtasks) {
        insertSub.run(newTaskId, st.title, origin, 'Initiated');
      }
    }

    const newTask = db.prepare('SELECT * FROM Tasks WHERE id = ?').get(newTaskId);
    if (newTask) {
      newTask.tags = db.prepare('SELECT * FROM Tags WHERE task_id = ?').all(newTaskId);
      const subStats = db.prepare(`
        SELECT COUNT(*) as total, 
               SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
               SUM(CASE WHEN status = 'Doing' THEN 1 ELSE 0 END) as doing
        FROM Subtasks WHERE task_id = ?
      `).get(newTaskId);
      newTask.subtask_total = subStats ? subStats.total : 0;
      newTask.subtask_completed = subStats ? subStats.completed : 0;
      newTask.subtask_doing = subStats ? subStats.doing : 0;

      // NOTE: .md file is NOT auto-created on task duplication.
    }

    return { success: true, task: newTask };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('update-task', (event, taskData) => {
  try {
    const db = getDb();
    const cfg = getConfig();
    const { id, title, priority, stage, tags } = taskData;
    const today = getFormattedToday();

    const currentTask = db.prepare('SELECT * FROM Tasks WHERE id = ?').get(id);
    if (!currentTask) throw new Error('Task not found');

    if (currentTask.state !== 'Arsenal') {
      throw new Error(`Cannot modify basic details (Title, Priority, Tags) when task is in state: ${currentTask.state}`);
    }

    db.prepare('UPDATE Tasks SET title = ?, priority = ?, stage = ?, modification_date = ? WHERE id = ?')
      .run(title, priority, stage, today, id);

    if (tags) {
      db.prepare('DELETE FROM Tags WHERE task_id = ?').run(id);
      for (const t of tags) {
        db.prepare('INSERT INTO Tags (task_id, tag_name) VALUES (?, ?)').run(id, t);
      }
    }

    const updatedTask = db.prepare('SELECT * FROM Tasks WHERE id = ?').get(id);
    if (updatedTask) {
      updatedTask.tags = db.prepare('SELECT * FROM Tags WHERE task_id = ?').all(id);
    }

    if (cfg.strategiesPath) {
      moveOrRenameMarkdownFile(cfg.strategiesPath, currentTask.title, currentTask.state, currentTask.stage, updatedTask);
    }

    return { success: true, task: updatedTask };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('delete-task', (event, taskId) => {
  try {
    const db = getDb();
    const cfg = getConfig();
    const task = db.prepare('SELECT * FROM Tasks WHERE id = ?').get(taskId);
    if (!task) throw new Error('Task not found');

    db.prepare('UPDATE Strikes SET subtask_id = NULL WHERE subtask_id IN (SELECT id FROM Subtasks WHERE task_id = ?)').run(taskId);
    db.prepare('DELETE FROM Subtasks WHERE task_id = ?').run(taskId);
    db.prepare('DELETE FROM Tags WHERE task_id = ?').run(taskId);
    db.prepare('DELETE FROM Tasks WHERE id = ?').run(taskId);

    if (cfg.strategiesPath && task.title) {
      const folder = getFolderForState(task.state);
      const fileName = `${sanitizeFilename(task.title)}.md`;
      const filePath = path.join(cfg.strategiesPath, folder, fileName);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    return { success: true, taskId };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('move-task-state', (event, payload) => {
  try {
    const db = getDb();
    const cfg = getConfig();
    const { id, newState, newStage, deadline, initiated_at, ended_date, end_note } = payload;
    const today = getFormattedToday();

    const currentTask = db.prepare('SELECT * FROM Tasks WHERE id = ?').get(id);
    if (!currentTask) throw new Error('Task not found');

    const oldState = currentTask.state;

    if (newState === 'Execution' && oldState === 'Arsenal') {
      if (!deadline) throw new Error('Deadline required to move task to Execution');
      db.prepare(`
        UPDATE Tasks 
        SET state = ?, stage = ?, deadline = ?, initiated_at = ?, modification_date = ? 
        WHERE id = ?
      `).run('Execution', 'Active', deadline, initiated_at, today, id);
    } else if (newState === 'Archive') {
      if (!end_note || !end_note.trim()) {
        throw new Error('Mandatory tactical End Note required before archiving a campaign.');
      }
      // Only an aborted task that was moved to archive directly from Breach is marked as Breached Extracted
      const is_breached_extracted = (oldState === 'Breach' && newStage === 'Aborted') ? 1 : 0;
      // Days spent = from Execution deployment (initiated_at) to ended_date, both dates inclusive
      const days_spent = calculateDaysSpent(currentTask.initiated_at || currentTask.origin_date, ended_date);
      db.prepare(`
        UPDATE Tasks 
        SET state = ?, stage = ?, ended_date = ?, end_note = ?, days_spent = ?, is_breached_extracted = ?, modification_date = ? 
        WHERE id = ?
      `).run('Archive', newStage, ended_date, end_note, days_spent, is_breached_extracted, today, id);
    } else {
      db.prepare('UPDATE Tasks SET state = ?, stage = ?, modification_date = ? WHERE id = ?')
        .run(newState, newStage, today, id);
    }

    const updatedTask = db.prepare('SELECT * FROM Tasks WHERE id = ?').get(id);
    if (updatedTask) {
      updatedTask.tags = db.prepare('SELECT * FROM Tags WHERE task_id = ?').all(id);
    }

    if (cfg.strategiesPath) {
      moveOrRenameMarkdownFile(cfg.strategiesPath, currentTask.title, updatedTask.title, oldState, newState, updatedTask);
    }

    return { success: true, task: updatedTask };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('reschedule-task', (event, payload) => {
  try {
    const db = getDb();
    const cfg = getConfig();
    const { id, newDeadline } = payload;
    const today = getFormattedToday();

    const currentTask = db.prepare('SELECT * FROM Tasks WHERE id = ?').get(id);
    if (!currentTask) throw new Error('Task not found');

    if (currentTask.reschedule_count >= 2) {
      throw new Error('Maximum reschedule count (2) reached for this campaign.');
    }

    const newCount = currentTask.reschedule_count + 1;
    const colToSet = newCount === 1 ? 'reschedule_1' : 'reschedule_2';

    // Store new target deadline in `deadline`, and the action execution date (today) in `reschedule_1`/`reschedule_2`
    db.prepare(`
      UPDATE Tasks 
      SET state = 'Execution', stage = 'Active', deadline = ?, reschedule_count = ?, ${colToSet} = ?, modification_date = ? 
      WHERE id = ?
    `).run(newDeadline, newCount, today, today, id);

    const updatedTask = db.prepare('SELECT * FROM Tasks WHERE id = ?').get(id);
    if (updatedTask) {
      updatedTask.tags = db.prepare('SELECT * FROM Tags WHERE task_id = ?').all(id);
    }

    if (cfg.strategiesPath) {
      moveOrRenameMarkdownFile(cfg.strategiesPath, updatedTask.title, updatedTask.title, currentTask.state, 'Execution', updatedTask);
    }

    return { success: true, task: updatedTask };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Tags IPC
ipcMain.handle('get-tags', () => {
  try {
    const db = getDb();
    const tags = db.prepare('SELECT * FROM Tags').all();
    return { success: true, tags };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('add-tag', (event, { taskId, tagName }) => {
  try {
    const db = getDb();
    const info = db.prepare('INSERT INTO Tags (task_id, tag_name) VALUES (?, ?)').run(taskId, tagName);
    updateTaskModificationDate(taskId);
    return { success: true, tag: { id: info.lastInsertRowid, task_id: taskId, tag_name: tagName } };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('remove-tag', (event, tagId) => {
  try {
    const db = getDb();
    const tag = db.prepare('SELECT task_id FROM Tags WHERE id = ?').get(tagId);
    db.prepare('DELETE FROM Tags WHERE id = ?').run(tagId);
    if (tag) updateTaskModificationDate(tag.task_id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('delete-tag-by-name', (event, tagName) => {
  try {
    const db = getDb();
    const affected = db.prepare('SELECT DISTINCT task_id FROM Tags WHERE UPPER(tag_name) = UPPER(?)').all(tagName);
    db.prepare('DELETE FROM Tags WHERE UPPER(tag_name) = UPPER(?)').run(tagName);
    for (const row of affected) {
      updateTaskModificationDate(row.task_id);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('rename-tag', (event, { oldName, newName }) => {
  try {
    const db = getDb();
    const affected = db.prepare('SELECT DISTINCT task_id FROM Tags WHERE UPPER(tag_name) = UPPER(?)').all(oldName);
    db.prepare('UPDATE Tags SET tag_name = ? WHERE UPPER(tag_name) = UPPER(?)').run(newName, oldName);
    for (const row of affected) {
      updateTaskModificationDate(row.task_id);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('purge-all-tags', () => {
  try {
    const db = getDb();
    const affected = db.prepare('SELECT DISTINCT task_id FROM Tags').all();
    db.prepare('DELETE FROM Tags').run();
    for (const row of affected) {
      updateTaskModificationDate(row.task_id);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Subtasks IPC
ipcMain.handle('get-all-subtasks', () => {
  try {
    const db = getDb();
    const subtasks = db.prepare(`
      SELECT s.*, t.title as campaignTitle, t.id as campaignId 
      FROM Subtasks s 
      JOIN Tasks t ON s.task_id = t.id
      ORDER BY s.id ASC
    `).all();
    return { success: true, subtasks };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-subtasks', (event, taskId) => {
  try {
    const db = getDb();
    const subtasks = db.prepare('SELECT * FROM Subtasks WHERE task_id = ? ORDER BY id ASC').all(taskId);
    return { success: true, subtasks };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('create-subtask', (event, { taskId, title, creation_time, status = 'Initiated' }) => {
  try {
    const db = getDb();
    if (!taskId || isNaN(Number(taskId))) throw new Error('Valid taskId is required');
    if (!title || typeof title !== 'string' || !title.trim()) throw new Error('Subtask title cannot be empty');
    const validCreation = isValidDDMMYYYY(creation_time) ? creation_time.trim() : getFormattedToday();
    const validStatus = ['Initiated', 'Doing', 'Completed'].includes(status) ? status : 'Initiated';

    const info = db.prepare(`
      INSERT INTO Subtasks (task_id, title, creation_time, status)
      VALUES (?, ?, ?, ?)
    `).run(Number(taskId), title.trim(), validCreation, validStatus);
    const subtask = db.prepare('SELECT * FROM Subtasks WHERE id = ?').get(info.lastInsertRowid);
    updateTaskModificationDate(Number(taskId));
    return { success: true, subtask };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('update-subtask-status', (event, { subtaskId, status }) => {
  try {
    const db = getDb();
    const subtaskBefore = db.prepare('SELECT task_id FROM Subtasks WHERE id = ?').get(subtaskId);
    db.prepare('UPDATE Subtasks SET status = ? WHERE id = ?').run(status, subtaskId);
    const updated = db.prepare('SELECT * FROM Subtasks WHERE id = ?').get(subtaskId);
    if (subtaskBefore) updateTaskModificationDate(subtaskBefore.task_id);
    return { success: true, subtask: updated };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('update-subtask-title', (event, { subtaskId, title }) => {
  try {
    const db = getDb();
    const subtaskBefore = db.prepare('SELECT task_id FROM Subtasks WHERE id = ?').get(subtaskId);
    db.prepare('UPDATE Subtasks SET title = ? WHERE id = ?').run(title, subtaskId);
    const updated = db.prepare('SELECT * FROM Subtasks WHERE id = ?').get(subtaskId);
    if (subtaskBefore) updateTaskModificationDate(subtaskBefore.task_id);
    return { success: true, subtask: updated };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('delete-subtask', (event, subtaskId) => {
  try {
    const db = getDb();
    const subtaskBefore = db.prepare('SELECT task_id FROM Subtasks WHERE id = ?').get(subtaskId);
    db.prepare('UPDATE Strikes SET subtask_id = NULL WHERE subtask_id = ?').run(subtaskId);
    db.prepare('DELETE FROM Subtasks WHERE id = ?').run(subtaskId);
    if (subtaskBefore) updateTaskModificationDate(subtaskBefore.task_id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('reorder-subtasks', (event, { taskId, subtaskIds }) => {
  try {
    const db = getDb();
    if (!taskId || !Array.isArray(subtaskIds)) throw new Error('Invalid reorder payload');
    const current = db.prepare('SELECT * FROM Subtasks WHERE task_id = ? ORDER BY id ASC').all(taskId);
    if (current.length !== subtaskIds.length) {
      return { success: false, error: 'Subtask count mismatch' };
    }
    const map = new Map();
    for (const s of current) map.set(s.id, s);

    // Build mapping from old subtask ID to new target subtask ID
    const oldToNewMap = new Map();
    const updateStmt = db.prepare('UPDATE Subtasks SET title = ?, creation_time = ?, status = ? WHERE id = ?');
    for (let i = 0; i < current.length; i++) {
      const targetId = current[i].id;
      const oldId = subtaskIds[i];
      oldToNewMap.set(oldId, targetId);
      const desiredData = map.get(oldId);
      if (desiredData) {
        updateStmt.run(desiredData.title, desiredData.creation_time, desiredData.status, targetId);
      }
    }

    // Preserve linked Strikes referential integrity
    const currentSubtaskIds = current.map(s => s.id);
    if (currentSubtaskIds.length > 0) {
      const placeholders = currentSubtaskIds.map(() => '?').join(',');
      const linkedStrikes = db.prepare(`SELECT id, subtask_id FROM Strikes WHERE subtask_id IN (${placeholders})`).all(...currentSubtaskIds);
      const updateStrikeStmt = db.prepare('UPDATE Strikes SET subtask_id = ? WHERE id = ?');
      for (const str of linkedStrikes) {
        const newTargetSubId = oldToNewMap.get(str.subtask_id);
        if (newTargetSubId && newTargetSubId !== str.subtask_id) {
          updateStrikeStmt.run(newTargetSubId, str.id);
        }
      }
    }

    updateTaskModificationDate(taskId);
    const reordered = db.prepare('SELECT * FROM Subtasks WHERE task_id = ? ORDER BY id ASC').all(taskId);
    return { success: true, subtasks: reordered };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

function getHydratedStrike(db, id) {
  return db.prepare(`
    SELECT s.*, sub.title as subtask_title, t.title as campaign_title, t.id as campaign_id
    FROM Strikes s
    LEFT JOIN Subtasks sub ON s.subtask_id = sub.id
    LEFT JOIN Tasks t ON sub.task_id = t.id
    WHERE s.id = ?
  `).get(id);
}

// Strikes IPC Operations
ipcMain.handle('get-strikes', () => {
  try {
    const db = getDb();
    const strikes = db.prepare(`
      SELECT s.*, sub.title as subtask_title, t.title as campaign_title, t.id as campaign_id
      FROM Strikes s
      LEFT JOIN Subtasks sub ON s.subtask_id = sub.id
      LEFT JOIN Tasks t ON sub.task_id = t.id
      ORDER BY s.execution_date ASC, s.id DESC
    `).all();
    return { success: true, strikes };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Generates the next recurrence group code: {totalCount}RC{00001}
// totalCount is passed in at call time (base + copies). The 5-digit group number auto-increments.
ipcMain.handle('get-next-rc-id', (event, { totalCount }) => {
  try {
    const db = getDb();
    // Extract the highest numeric group number currently in use
    const row = db.prepare(`
      SELECT recurrence_id FROM Strikes
      WHERE recurrence_id IS NOT NULL
      ORDER BY id DESC
      LIMIT 1
    `).get();
    let nextNum = 1;
    if (row && row.recurrence_id) {
      // Format is "{N}RC{00001}" — extract the digits after "RC"
      const match = String(row.recurrence_id).match(/RC(\d+)$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    const padded = String(nextNum).padStart(5, '0');
    const rcId = `${totalCount}RC${padded}`;
    return { success: true, rcId };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('create-strike', (event, { title, created_at, execution_date, priority = 'Medium', status = 'STANDBY', notes = '', subtask_id = null, recurrence_id = null }) => {
  try {
    const db = getDb();
    if (!title || typeof title !== 'string' || !title.trim()) throw new Error('Strike directive title cannot be empty');
    const validCreated = isValidDDMMYYYY(created_at) ? created_at.trim() : getFormattedToday();
    const validPriority = ['High', 'Medium', 'Low'].includes(priority) ? priority : 'Medium';
    const validStatus = ['STANDBY', 'ENGAGED', 'NEUTRALIZED', 'ABORTED', 'PENDING', 'TEMPLATE', 'UNDATED'].includes(status) ? status : 'STANDBY';
    const validExec = validStatus === 'UNDATED' ? '' : (isValidDDMMYYYY(execution_date) ? execution_date.trim() : getFormattedToday());

    const info = db.prepare(`
      INSERT INTO Strikes (title, created_at, execution_date, priority, status, notes, subtask_id, recurrence_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title.trim(), validCreated, validExec, validPriority, validStatus, notes ? String(notes).trim() : '', subtask_id ? Number(subtask_id) : null, recurrence_id || null);
    const strike = getHydratedStrike(db, info.lastInsertRowid);
    return { success: true, strike };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('update-strike-status', (event, { id, status }) => {
  try {
    const db = getDb();
    db.prepare('UPDATE Strikes SET status = ? WHERE id = ?').run(status, id);
    const updated = getHydratedStrike(db, id);
    return { success: true, strike: updated };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('update-strike', (event, { id, title, execution_date, priority, status, notes, subtask_id, recurrence_id }) => {
  try {
    const db = getDb();
    db.prepare(`
      UPDATE Strikes
      SET title = ?, execution_date = ?, priority = ?, status = ?, notes = ?, subtask_id = ?, recurrence_id = ?
      WHERE id = ?
    `).run(title, execution_date, priority, status, notes, subtask_id || null, recurrence_id || null, id);
    const updated = getHydratedStrike(db, id);
    return { success: true, strike: updated };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('reschedule-strike', (event, { id, newExecutionDate }) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT reschedule_count FROM Strikes WHERE id = ?').get(id);
    const count = (existing && existing.reschedule_count) ? existing.reschedule_count : 0;
    if (count >= 2) {
      return { success: false, error: 'Maximum 2 reschedules allowed per Strike directive.' };
    }
    db.prepare(`
      UPDATE Strikes
      SET execution_date = ?, status = 'STANDBY', reschedule_count = ?
      WHERE id = ?
    `).run(newExecutionDate, count + 1, id);
    const updated = getHydratedStrike(db, id);
    return { success: true, strike: updated };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('delete-strike', (event, id) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM Strikes WHERE id = ?').run(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Markdown Open IPC — this is the ONLY place .md files are created from scratch
ipcMain.handle('open-markdown-file', async (event, { taskId, state, title }) => {
  try {
    const cfg = getConfig();
    if (!cfg.strategiesPath) throw new Error('Strategies path not configured');

    const db = getDb();
    let task = null;
    if (taskId) {
      task = db.prepare('SELECT * FROM Tasks WHERE id = ?').get(taskId);
    } else if (title) {
      task = db.prepare('SELECT * FROM Tasks WHERE title = ?').get(title);
    }

    if (!task) throw new Error(`Task '${title || taskId}' not found`);

    // Sync with onDemand=true — creates the file if it doesn't exist yet
    await syncMarkdownFile(cfg.strategiesPath, task, { onDemand: true });

    // Now resolve the definitive file path via ID-based scan
    const folder = getFolderForState(task.state, task.stage);
    const rawSafe = sanitizeFilename(task.title || '');
    const safeTitle = rawSafe || `task_${task.id}`;
    const filePath = path.join(cfg.strategiesPath, folder, `${safeTitle}.md`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Could not locate or create the strategies file for task "${task.title}"`);
    }

    const openResult = await shell.openPath(filePath);
    if (openResult) throw new Error(`Could not open file: ${openResult}`);

    return { success: true, filePath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('sync-data', async () => {
  try {
    const cfg = getConfig();
    if (cfg.strategiesPath) {
      const db = getDb();
      const tasks = db.prepare('SELECT * FROM Tasks').all();
      
      // Batch fetch tags and subtasks in 2 single queries instead of 2 queries per task
      const allTags = db.prepare('SELECT * FROM Tags').all();
      const allSubtasks = db.prepare('SELECT * FROM Subtasks ORDER BY id ASC').all();

      const tagsByTask = new Map();
      for (const tag of allTags) {
        if (!tagsByTask.has(tag.task_id)) tagsByTask.set(tag.task_id, []);
        tagsByTask.get(tag.task_id).push(tag);
      }

      const subtasksByTask = new Map();
      for (const st of allSubtasks) {
        if (!subtasksByTask.has(st.task_id)) subtasksByTask.set(st.task_id, []);
        subtasksByTask.get(st.task_id).push(st);
      }

      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        const taskTags = tagsByTask.get(t.id) || [];
        const taskSubtasks = subtasksByTask.get(t.id) || [];
        // Only update already-existing .md files; do NOT create new ones (onDemand=false)
        writeTaskMarkdown(cfg.strategiesPath, t, taskTags, taskSubtasks, { onDemand: false });

        // Yield every 15 tasks to keep main event loop responsive
        if (i > 0 && i % 15 === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('open-db-location', async () => {
  try {
    const cfg = getConfig();
    const dbFilePath = cfg.dbPath || path.join(app.getPath('userData'), 'campaigns.sqlite');
    if (fs.existsSync(dbFilePath)) {
      shell.showItemInFolder(dbFilePath);
      return { success: true, dbPath: dbFilePath };
    }
    const dbDir = path.dirname(dbFilePath);
    if (fs.existsSync(dbDir)) {
      shell.openPath(dbDir);
      return { success: true, dbPath: dbDir };
    }
    throw new Error('Database path does not exist on disk.');
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('open-strategies-folder', async () => {
  try {
    const cfg = getConfig();
    if (!cfg.strategiesPath) throw new Error('Strategies directory not configured');
    if (fs.existsSync(cfg.strategiesPath)) {
      shell.openPath(cfg.strategiesPath);
      return { success: true, path: cfg.strategiesPath };
    }
    throw new Error('Strategies directory does not exist on disk.');
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('verify-strategies-integrity', async () => {
  try {
    const cfg = getConfig();
    if (!cfg.strategiesPath) {
      return { success: false, error: 'Strategies directory is not configured.' };
    }
    if (!fs.existsSync(cfg.strategiesPath)) {
      fs.mkdirSync(cfg.strategiesPath, { recursive: true });
    }

    const subdirs = [
      path.join(cfg.strategiesPath, 'Arsenal', 'RawIntel'),
      path.join(cfg.strategiesPath, 'Arsenal', 'Strategizing'),
      path.join(cfg.strategiesPath, 'Execution'),
      path.join(cfg.strategiesPath, 'Breach'),
      path.join(cfg.strategiesPath, 'Archive', 'Victory'),
      path.join(cfg.strategiesPath, 'Archive', 'Aborted')
    ];

    let directoriesCreated = 0;
    for (const dir of subdirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        directoriesCreated++;
      }
    }

    const db = getDb();
    const allTasks = db.prepare('SELECT * FROM Tasks').all();
    const taskMap = new Map(allTasks.map(t => [t.id, t]));

    function getAllMdFiles(dir, fileList = []) {
      if (!fs.existsSync(dir)) return fileList;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          getAllMdFiles(fullPath, fileList);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          fileList.push(fullPath);
        }
      }
      return fileList;
    }

    const mdFiles = getAllMdFiles(cfg.strategiesPath);
    let validCount = 0;
    let sentinelCount = 0;
    const orphanedFiles = [];
    const corruptFiles = [];
    const stateMismatches = [];

    for (const filePath of mdFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const match = content.slice(0, 2048).match(/Task Id:\s*(\d+)/i);
        if (!match) {
          corruptFiles.push(path.basename(filePath));
          continue;
        }

        const taskId = parseInt(match[1], 10);
        const task = taskMap.get(taskId);
        if (!task) {
          orphanedFiles.push({ file: path.basename(filePath), taskId });
          continue;
        }

        if (content.includes('<!-- @@CAMPAIGNS_NOTES_START@@ -->')) {
          sentinelCount++;
        }

        const expectedFolder = getFolderForState(cfg.strategiesPath, task.state, task.stage);
        const actualFolder = path.dirname(filePath);
        if (path.normalize(expectedFolder) !== path.normalize(actualFolder)) {
          stateMismatches.push({
            taskId,
            file: path.basename(filePath),
            actual: path.basename(actualFolder),
            expected: path.basename(expectedFolder)
          });
        }

        validCount++;
      } catch (err) {
        corruptFiles.push(path.basename(filePath));
      }
    }

    return {
      success: true,
      strategiesPath: cfg.strategiesPath,
      totalDbTasks: allTasks.length,
      totalMarkdownFiles: mdFiles.length,
      validSyncedFiles: validCount,
      sentinelProtectedCount: sentinelCount,
      directoriesChecked: subdirs.length,
      directoriesRepaired: directoriesCreated,
      orphanedFiles,
      corruptFiles,
      stateMismatches,
      summary: `Verified ${mdFiles.length} strategy file(s) across ${subdirs.length} directories. ${validCount} valid, ${sentinelCount} note-protected.`
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('send-notification', (event, { title, body }) => {
  try {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
      return { success: true };
    }
  } catch (e) {
    console.error('Notification error:', e);
  }
  return { success: false };
});

ipcMain.handle('bulk-update-strikes-pending', (event, { ids }) => {
  try {
    const db = getDb();
    if (!ids || ids.length === 0) return { success: true, updatedCount: 0 };
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`UPDATE Strikes SET status = 'PENDING' WHERE id IN (${placeholders})`).run(...ids);
    return { success: true, updatedCount: ids.length };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('bulk-move-breached-tasks', () => {
  try {
    const db = getDb();
    const todayStr = getFormattedToday();
    const cfg = getConfig();
    
    const activeTasks = db.prepare("SELECT * FROM Tasks WHERE state = 'Execution' AND deadline IS NOT NULL").all();
    const breachedTasks = [];

    for (const t of activeTasks) {
      if (t.deadline && isDatePassed(t.deadline, todayStr)) {
        db.prepare(`
          UPDATE Tasks
          SET state = 'Breach', stage = 'Overdue', modification_date = ?
          WHERE id = ?
        `).run(todayStr, t.id);

        const updated = db.prepare('SELECT * FROM Tasks WHERE id = ?').get(t.id);
        if (updated) {
          breachedTasks.push(updated);
          if (cfg.strategiesPath) debouncedSyncMarkdown(cfg.strategiesPath, updated);
        }
      }
    }
    
    return { success: true, breachedTasks };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('update-tray-status', (event, { titleText }) => {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setTitle(`Campaigns — ${titleText}`);
      return { success: true };
    }
  } catch (e) {
    console.error('Tray update error:', e);
  }
  return { success: false };
});

// Window Controls
ipcMain.handle('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('close-window', () => {
  if (mainWindow) mainWindow.close();
});
ipcMain.handle('reload-window', () => {
  if (mainWindow) mainWindow.webContents.reload();
});
