import { app, BrowserWindow, ipcMain, dialog, shell, Notification } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase, getDb, flushDbToDisk } from './db.js';

app.on('before-quit', () => {
  try { flushDbToDisk(); } catch (e) {}
});
app.on('will-quit', () => {
  try { flushDbToDisk(); } catch (e) {}
});


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Disable GPU shader disk cache locks on Windows
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

let mainWindow = null;
const configPath = path.join(app.getPath('userData'), 'config.json');

// Debounce map for markdown file writes — prevents rapid subtask/tag changes
// from hammering the filesystem (e.g. user checks off 3 subtasks quickly)
const markdownDebounceTimers = new Map();

function debouncedSyncMarkdown(strategiesPath, task, delay = 500) {
  const key = task.id;
  if (markdownDebounceTimers.has(key)) clearTimeout(markdownDebounceTimers.get(key));
  markdownDebounceTimers.set(key, setTimeout(() => {
    syncMarkdownFile(strategiesPath, task);
    markdownDebounceTimers.delete(key);
  }, delay));
}

function getDefaultStrategiesPath() {
  return path.join(app.getPath('home'), 'Obsidian', 'Adhipati', 'Campaigns');
}

function getDefaultDbPath() {
  // Store SQLite database safely in AppData/Local/Campaigns/Database/campaigns.sqlite
  return path.join(app.getPath('appData'), 'Campaigns', 'Database', 'campaigns.sqlite');
}

function getConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && parsed.strategiesPath) {
        if (!parsed.dbPath) {
          parsed.dbPath = getDefaultDbPath();
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading config.json:', e);
  }
  // Standard default paths: Obsidian Vault for Strategies, AppData for SQLite DB
  return {
    strategiesPath: getDefaultStrategiesPath(),
    dbPath: getDefaultDbPath(),
    isConfigured: true
  };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing config.json:', e);
  }
}

function sanitizeFilename(title) {
  return title.replace(/[/\\?%*:|"<>]/g, '-').trim();
}

function getFolderForState(state) {
  switch (state) {
    case 'Arsenal': return 'Arsenal';
    case 'Execution':
    case 'Breach': return 'Execution';
    case 'Archive': return 'Archive';
    default: return 'Arsenal';
  }
}

async function scaffoldStrategiesDir(strategiesPath, dbPath) {
  const folders = ['Arsenal', 'Execution', 'Archive'];
  for (const folder of folders) {
    const fullPath = path.join(strategiesPath, folder);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }
  const resolvedDbPath = dbPath || path.join(app.getPath('userData'), 'campaigns.sqlite');
  const res = await initDatabase(resolvedDbPath);
  if (!res.success) {
    throw new Error('Database initialization failed: ' + res.error);
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
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return (days < 0 ? 0 : days) + 1; // Both days included
}

function syncMarkdownFile(strategiesPath, task) {
  try {
    if (!strategiesPath || !task || !task.id) return;
    const db = getDb();
    
    // Fetch tags & subtasks from DB
    const dbTags = db.prepare('SELECT tag_name FROM Tags WHERE task_id = ?').all(task.id);
    const subtasks = db.prepare('SELECT * FROM Subtasks WHERE task_id = ? ORDER BY id ASC').all(task.id);

    // Build tags list: Default ["Adhipati", "Campaign"] + DB tags
    const tagSet = new Set(['Adhipati', 'Campaign']);
    if (dbTags && dbTags.length > 0) {
      for (const t of dbTags) {
        if (t.tag_name) tagSet.add(t.tag_name);
      }
    }
    const tagsList = Array.from(tagSet);

    const folder = getFolderForState(task.state);
    const fileName = `${sanitizeFilename(task.title)}.md`;
    const filePath = path.join(strategiesPath, folder, fileName);

    // Preserve Portion 3 (User writing area under ## Strategies & Operational Notes)
    let existingUserNotes = '';
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const notesMarker = '## Strategies & Operational Notes';
      const markerIdx = fileContent.indexOf(notesMarker);
      if (markerIdx !== -1) {
        existingUserNotes = fileContent.substring(markerIdx + notesMarker.length).trim();
      }
    }

    if (!existingUserNotes) {
      existingUserNotes = '*(Record strategic planning, technical notes, and operational logs here)*';
    }

    // Build Portion 1: Obsidian Native YAML Properties Frontmatter
    let yamlLines = ['---'];
    yamlLines.push(`Task Id: ${task.id}`);
    
    // Tags property right after Task Id (always includes Adhipati & Campaign)
    yamlLines.push('Tags:');
    for (const tag of tagsList) {
      yamlLines.push(`  - ${tag}`);
    }

    yamlLines.push(`Origin Date: ${task.origin_date}`);
    yamlLines.push(`Modification Date: ${task.modification_date || task.origin_date}`);
    yamlLines.push(`Priority: ${task.priority}`);
    yamlLines.push(`State: ${task.state}`);
    yamlLines.push(`Stage: ${task.stage}`);
    
    if (task.deadline) yamlLines.push(`Deadline: ${task.deadline}`);
    if (task.initiated_at) yamlLines.push(`Initiated Date: ${task.initiated_at}`);
    if (task.reschedule_count && task.reschedule_count > 0) yamlLines.push(`Reschedule Time: ${task.reschedule_count}`);
    if (task.reschedule_1) yamlLines.push(`Reschedule 1: ${task.reschedule_1}`);
    if (task.reschedule_2) yamlLines.push(`Reschedule 2: ${task.reschedule_2}`);
    if (task.ended_date) yamlLines.push(`Ended Date: ${task.ended_date}`);
    if (task.days_spent !== undefined && task.days_spent !== null) yamlLines.push(`Days Spent: ${task.days_spent}`);
    if (task.end_note) yamlLines.push(`Tactical End Note: "${task.end_note.replace(/"/g, '\\"')}"`);
    yamlLines.push('---');

    // Build Portion 2: Tactical Subtasks
    let subtaskLines = [];
    subtaskLines.push('## Tactical Subtasks');
    if (subtasks && subtasks.length > 0) {
      for (const st of subtasks) {
        if (st.status === 'Completed') {
          subtaskLines.push(`- [x] ${st.title} (COMPLETED)`);
        } else if (st.status === 'Doing') {
          subtaskLines.push(`- [ ] ${st.title} (DOING)`);
        } else {
          subtaskLines.push(`- [ ] ${st.title}`);
        }
      }
    } else {
      subtaskLines.push('*(No tactical subtasks logged yet)*');
    }

    // Build Full Markdown Content
    const fullContent = [
      yamlLines.join('\n'),
      '',
      subtaskLines.join('\n'),
      '',
      '## Strategies & Operational Notes',
      existingUserNotes,
      ''
    ].join('\n');

    const folderPath = path.dirname(filePath);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    fs.writeFileSync(filePath, fullContent, 'utf-8');
  } catch (err) {
    console.error('Error syncing markdown file:', err);
  }
}

function moveOrRenameMarkdownFile(strategiesPath, oldTitle, newTitle, oldState, newState, taskData) {
  try {
    const oldFolder = getFolderForState(oldState);
    const newFolder = getFolderForState(newState);
    const oldFileName = `${sanitizeFilename(oldTitle)}.md`;
    const newFileName = `${sanitizeFilename(newTitle)}.md`;

    const oldPath = path.join(strategiesPath, oldFolder, oldFileName);
    const newPath = path.join(strategiesPath, newFolder, newFileName);

    if (fs.existsSync(oldPath)) {
      if (oldPath !== newPath) {
        fs.renameSync(oldPath, newPath);
      }
    }

    syncMarkdownFile(strategiesPath, taskData);
  } catch (err) {
    console.error('Error moving/renaming markdown file:', err);
    syncMarkdownFile(strategiesPath, taskData);
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

async function seedDevData(strategiesPath) {
  try {
    // Production installation safety: Only seed dev tasks when unpackaged in development
    if (app.isPackaged || !process.env.VITE_DEV_SERVER_URL) {
      console.log('[MAIN] Production executable detected. Initializing fresh empty database.');
      return;
    }

    const db = getDb();
    const existing = db.prepare('SELECT COUNT(*) as cnt FROM Tasks').get();
    if (existing && existing.cnt > 0) return; // Already seeded

    const today = '05-08-2026';
    // Clean up any old 'Critical' priority rows in DB to 'High'
    db.prepare("UPDATE Tasks SET priority = 'High' WHERE priority = 'Critical'").run();

    const tasks = [
      // ARSENAL (8)
      { title: 'OPERATION ZERO TRUST NETWORK AUDIT', priority: 'High', state: 'Arsenal', stage: 'RawIntel', tags: ['SECURITY', 'NETWORK'] },
      { title: 'DIGITAL SOVEREIGNTY FRAMEWORK', priority: 'High', state: 'Arsenal', stage: 'RawIntel', tags: ['COMPLIANCE'] },
      { title: 'Q3 THREAT INTELLIGENCE OVERHAUL', priority: 'Medium', state: 'Arsenal', stage: 'RawIntel', tags: [] },
      { title: 'DARK WEB MONITORING INITIATIVE', priority: 'High', state: 'Arsenal', stage: 'RawIntel', tags: ['INTEL', 'DARKWEB'] },
      { title: 'VENDOR SECURITY ASSESSMENT 2026', priority: 'Medium', state: 'Arsenal', stage: 'RawIntel', tags: ['VENDOR'] },
      { title: 'ENDPOINT HARDENING PROTOCOL', priority: 'Low', state: 'Arsenal', stage: 'RawIntel', tags: ['ENDPOINT'] },
      { title: 'INCIDENT RESPONSE PLAYBOOK UPDATE', priority: 'High', state: 'Arsenal', stage: 'RawIntel', tags: ['IR', 'PLAYBOOK'] },
      { title: 'LEGACY SYSTEM DECOMMISSION PLAN', priority: 'Low', state: 'Arsenal', stage: 'RawIntel', tags: [] },
      // EXECUTION (8)
      { title: 'RED TEAM SIMULATION EXERCISE', priority: 'High', state: 'Execution', stage: 'Active', deadline: '20-08-2026', initiated_at: today, reschedule_count: 0, tags: ['REDTEAM'] },
      { title: 'SUPPLY CHAIN RISK ANALYSIS', priority: 'High', state: 'Execution', stage: 'Active', deadline: '15-08-2026', initiated_at: today, reschedule_count: 0, tags: ['SUPPLY'] },
      { title: 'ZERO DAY PATCH DEPLOYMENT', priority: 'High', state: 'Execution', stage: 'Active', deadline: '08-08-2026', initiated_at: today, reschedule_count: 0, tags: ['PATCH', 'HIGH'] },
      { title: 'NETWORK SEGMENTATION PROJECT', priority: 'High', state: 'Execution', stage: 'Active', deadline: '25-08-2026', initiated_at: today, reschedule_count: 0, tags: ['NETWORK'] },
      { title: 'PHISHING AWARENESS CAMPAIGN', priority: 'Medium', state: 'Execution', stage: 'Active', deadline: '30-08-2026', initiated_at: today, reschedule_count: 0, tags: ['TRAINING'] },
      { title: 'CLOUD MIGRATION SECURITY REVIEW', priority: 'High', state: 'Execution', stage: 'Active', deadline: '12-08-2026', initiated_at: today, reschedule_count: 0, tags: ['CLOUD'] },
      { title: 'API SECURITY GATEWAY DEPLOYMENT', priority: 'Medium', state: 'Execution', stage: 'Active', deadline: '18-08-2026', initiated_at: today, reschedule_count: 0, tags: ['API'] },
      { title: 'PENETRATION TEST EXTERNAL PERIMETER', priority: 'High', state: 'Execution', stage: 'Active', deadline: '10-08-2026', initiated_at: '01-08-2026', reschedule_count: 1, reschedule_1: '10-08-2026', tags: ['PENTEST'] },
      // BREACH (6)
      { title: 'COMPLIANCE AUDIT DEADLINE MISSED', priority: 'High', state: 'Breach', stage: 'Overdue', deadline: '01-08-2026', initiated_at: '20-07-2026', reschedule_count: 2, reschedule_1: '25-07-2026', reschedule_2: '01-08-2026', tags: ['COMPLIANCE', 'AUDIT'] },
      { title: 'FIREWALL RULE REVIEW OVERDUE', priority: 'High', state: 'Breach', stage: 'Overdue', deadline: '31-07-2026', initiated_at: '15-07-2026', reschedule_count: 0, tags: ['FIREWALL'] },
      { title: 'BACKUP VERIFICATION FAILURE', priority: 'High', state: 'Breach', stage: 'Overdue', deadline: '28-07-2026', initiated_at: '10-07-2026', reschedule_count: 1, reschedule_1: '28-07-2026', tags: ['BACKUP'] },
      { title: 'SOC ALERT TRIAGE BACKLOG', priority: 'Medium', state: 'Breach', stage: 'Overdue', deadline: '30-07-2026', initiated_at: '20-07-2026', reschedule_count: 0, tags: ['SOC'] },
      { title: 'DATA CLASSIFICATION PROJECT', priority: 'Low', state: 'Breach', stage: 'Overdue', deadline: '25-07-2026', initiated_at: '01-07-2026', reschedule_count: 0, tags: [] },
      { title: 'PASSWORD POLICY ENFORCEMENT', priority: 'Medium', state: 'Breach', stage: 'Overdue', deadline: '02-08-2026', initiated_at: '25-07-2026', reschedule_count: 0, tags: ['IAM'] },
      // ARCHIVE - VICTORY (4)
      { title: 'GDPR COMPLIANCE IMPLEMENTATION', priority: 'High', state: 'Archive', stage: 'Victory', deadline: '01-06-2026', initiated_at: '01-03-2026', ended_date: '30-05-2026', end_note: 'Full GDPR compliance achieved across all data pipelines. DPO signed off. Legal approved.', tags: ['GDPR', 'COMPLIANCE'] },
      { title: 'MFA ROLLOUT COMPANY WIDE', priority: 'High', state: 'Archive', stage: 'Victory', deadline: '01-04-2026', initiated_at: '01-01-2026', ended_date: '28-03-2026', end_note: 'MFA enforced across 1,200 accounts. Zero exceptions. SOC confirmed coverage.', tags: ['MFA', 'IAM'] },
      { title: 'ANNUAL SECURITY TRAINING 2025', priority: 'Medium', state: 'Archive', stage: 'Victory', deadline: '31-12-2025', initiated_at: '01-10-2025', ended_date: '20-12-2025', end_note: 'Training completed. 98.7% completion rate. Updated modules deployed.', tags: ['TRAINING'] },
      { title: 'VULNERABILITY SCANNER UPGRADE', priority: 'High', state: 'Archive', stage: 'Victory', deadline: '15-07-2026', initiated_at: '01-06-2026', ended_date: '12-07-2026', end_note: 'Tenable.io upgraded to v8. New policy templates active. Full scan completed.', tags: ['SCANNER', 'VULN'] },
      // ARCHIVE - ABORTED (4)
      { title: 'RANSOMWARE CONTAINMENT DRILL', priority: 'High', state: 'Archive', stage: 'Aborted', deadline: '01-05-2026', initiated_at: '01-04-2026', ended_date: '15-04-2026', end_note: 'Aborted due to critical production outage during drill window. Rescheduled to Q4.', tags: ['RANSOMWARE', 'DRILL'] },
      { title: 'SHADOW IT DISCOVERY AUDIT', priority: 'Medium', state: 'Archive', stage: 'Aborted', deadline: '15-07-2026', initiated_at: '15-06-2026', ended_date: '01-07-2026', end_note: 'Scope too broad. Resource constraints. Broken into three smaller campaigns.', tags: [] },
      { title: 'BIOMETRIC ACCESS PHASE 1', priority: 'High', state: 'Archive', stage: 'Aborted', deadline: '01-08-2026', initiated_at: '01-05-2026', ended_date: '20-07-2026', end_note: 'Budget eliminated by board. Hardware procurement frozen. Mission suspended.', tags: ['BIOMETRIC', 'ACCESS'] },
      { title: 'LEGACY AUTH DEPRECATION', priority: 'Low', state: 'Archive', stage: 'Aborted', deadline: '30-06-2026', initiated_at: '01-04-2026', ended_date: '10-06-2026', end_note: 'Dependency on legacy SSO unresolved. Vendor roadmap misaligned. Aborted pending new vendor contract.', tags: ['AUTH', 'LEGACY'] },
    ];

    for (const t of tasks) {
      const days_spent = t.ended_date ? calculateDaysSpent(t.initiated_at || today, t.ended_date) : null;
      const mod_date = t.ended_date || today;

      const info = db.prepare(`
        INSERT INTO Tasks (title, origin_date, modification_date, priority, state, stage, deadline, initiated_at, reschedule_count, reschedule_1, reschedule_2, ended_date, end_note, days_spent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        t.title, today, mod_date, t.priority, t.state, t.stage,
        t.deadline || null, t.initiated_at || null,
        t.reschedule_count || 0,
        t.reschedule_1 || null, t.reschedule_2 || null,
        t.ended_date || null, t.end_note || null,
        days_spent
      );

      const taskId = info.lastInsertRowid;
      if (t.tags && t.tags.length > 0) {
        for (const tag of t.tags) {
          db.prepare('INSERT INTO Tags (task_id, tag_name) VALUES (?, ?)').run(taskId, tag);
        }
      }

      // Insert default subtasks for rich operational testing
      const defaultSubtasks = t.subtasks || [
        { title: 'Define tactical objective & scope', status: 'Completed' },
        { title: 'Execute primary operational steps', status: 'Doing' },
        { title: 'Verify security controls & document outcome', status: 'Initiated' }
      ];
      for (const st of defaultSubtasks) {
        db.prepare('INSERT INTO Subtasks (task_id, title, creation_time, status) VALUES (?, ?, ?, ?)').run(
          taskId, st.title, today, st.status
        );
      }

      // Sync markdown file
      const task = db.prepare('SELECT * FROM Tasks WHERE id = ?').get(taskId);
      if (task && strategiesPath) {
        syncMarkdownFile(strategiesPath, task);
      }
    }

    console.log('[MAIN] Dev seed data inserted: 30 tasks');
  } catch (err) {
    console.error('[MAIN] Seed error:', err);
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
      contextIsolation: true
    }
  });

  // Open window maximized
  mainWindow.maximize();

  mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
    console.error('[MAIN] Preload error:', preloadPath, error.message);
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
    await seedDevData(cfg.strategiesPath);
    saveConfig(cfg);
  } catch (e) {
    console.error('Scaffolding error during startup:', e);
    try {
      const defaultStrategiesDir = getDefaultStrategiesPath();
      const defaultDbPath = getDefaultDbPath();
      cfg.strategiesPath = defaultStrategiesDir;
      cfg.dbPath = defaultDbPath;
      await scaffoldStrategiesDir(defaultStrategiesDir, defaultDbPath);
      await seedDevData(defaultStrategiesDir);
      saveConfig(cfg);
    } catch (fallbackErr) {
      console.error('Fallback scaffolding error:', fallbackErr);
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('get-config', async () => {
  const cfg = getConfig();
  try {
    await scaffoldStrategiesDir(cfg.strategiesPath, cfg.dbPath);
    saveConfig(cfg);
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

ipcMain.handle('create-task', (event, taskData) => {
  try {
    const db = getDb();
    const cfg = getConfig();
    const { title, origin_date, priority, state = 'Arsenal', stage = 'RawIntel', tags = [] } = taskData;
    const modification_date = origin_date;

    const info = db.prepare(`
      INSERT INTO Tasks (title, origin_date, modification_date, priority, state, stage, reschedule_count)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(title, origin_date, modification_date, priority, state, stage);

    const taskId = info.lastInsertRowid;

    if (tags && tags.length > 0) {
      for (const t of tags) {
        db.prepare('INSERT INTO Tags (task_id, tag_name) VALUES (?, ?)').run(taskId, t);
      }
    }

    const newTask = db.prepare('SELECT * FROM Tasks WHERE id = ?').get(taskId);
    if (newTask) {
      newTask.tags = db.prepare('SELECT * FROM Tags WHERE task_id = ?').all(taskId);
    }

    if (cfg.strategiesPath && newTask) {
      syncMarkdownFile(cfg.strategiesPath, newTask);
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
      moveOrRenameMarkdownFile(cfg.strategiesPath, currentTask.title, updatedTask.title, currentTask.state, updatedTask.state, updatedTask);
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
      // Days spent = from Execution deployment (initiated_at) to ended_date, both dates inclusive
      const days_spent = calculateDaysSpent(currentTask.initiated_at || currentTask.origin_date, ended_date);
      db.prepare(`
        UPDATE Tasks 
        SET state = ?, stage = ?, ended_date = ?, end_note = ?, days_spent = ?, modification_date = ? 
        WHERE id = ?
      `).run('Archive', newStage, ended_date, end_note, days_spent, ended_date, id);
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

// Subtasks IPC
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
    const info = db.prepare(`
      INSERT INTO Subtasks (task_id, title, creation_time, status)
      VALUES (?, ?, ?, ?)
    `).run(taskId, title, creation_time, status);
    const subtask = db.prepare('SELECT * FROM Subtasks WHERE id = ?').get(info.lastInsertRowid);
    updateTaskModificationDate(taskId);
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
    db.prepare('DELETE FROM Subtasks WHERE id = ?').run(subtaskId);
    if (subtaskBefore) updateTaskModificationDate(subtaskBefore.task_id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Markdown Open IPC
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

    if (!task) {
      throw new Error(`Task '${title || taskId}' not found`);
    }

    // Always sync latest properties & subtasks into .md file right before opening
    syncMarkdownFile(cfg.strategiesPath, task);

    const folder = getFolderForState(task.state);
    const fileName = `${sanitizeFilename(task.title)}.md`;
    const filePath = path.join(cfg.strategiesPath, folder, fileName);

    if (!fs.existsSync(filePath)) {
      // Auto-recreate file from DB state if deleted manually in File Explorer
      syncMarkdownFile(cfg.strategiesPath, task);
    }

    const openResult = await shell.openPath(filePath);
    if (openResult) {
      throw new Error(`Could not open file: ${openResult}`);
    }

    return { success: true, filePath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('sync-data', async () => {
  try {
    const cfg = getConfig();
    if (cfg.strategiesPath) {
      await scaffoldStrategiesDir(cfg.strategiesPath, cfg.dbPath);
      const db = getDb();
      const tasks = db.prepare('SELECT * FROM Tasks').all();
      for (const t of tasks) {
        syncMarkdownFile(cfg.strategiesPath, t);
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
ipcMain.handle('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});
ipcMain.handle('close-window', () => {
  if (mainWindow) mainWindow.close();
});
ipcMain.handle('reload-window', () => {
  if (mainWindow) mainWindow.webContents.reload();
});
