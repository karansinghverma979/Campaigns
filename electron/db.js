import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';

let BetterSqlite3 = null;
try {
  const mod = await import('better-sqlite3');
  BetterSqlite3 = mod.default || mod;
} catch (e) {
  BetterSqlite3 = null;
}

let SQL = null;
let dbInstance = null;
let currentDbPath = null;
let isNativeSqlite = false;
let dbWrapperInstance = null;
let dbSaveTimer = null;

// Convert BigInt and other non-serializable types to plain values for IPC
function sanitizeRow(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeRow);
  if (typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = sanitizeRow(v);
    }
    return out;
  }
  return obj;
}

let isSavingDb = false;
let pendingSaveDb = false;

async function performAsyncDbSave() {
  if (isNativeSqlite || !dbInstance || !currentDbPath || isSavingDb) return;
  isSavingDb = true;
  try {
    const dir = path.dirname(currentDbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const data = dbInstance.export();
    await fs.promises.writeFile(currentDbPath, Buffer.from(data));
  } catch (err) {
    console.error('Error saving database to disk (async):', err);
  } finally {
    isSavingDb = false;
    if (pendingSaveDb) {
      pendingSaveDb = false;
      performAsyncDbSave().catch(() => {});
    }
  }
}

function saveDbToDisk(immediate = false) {
  if (isNativeSqlite || !dbInstance || !currentDbPath) return;

  if (immediate) {
    if (dbSaveTimer) {
      clearTimeout(dbSaveTimer);
      dbSaveTimer = null;
    }
    try {
      const dir = path.dirname(currentDbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const data = dbInstance.export();
      fs.writeFileSync(currentDbPath, Buffer.from(data));
    } catch (err) {
      console.error('Error saving database to disk (immediate):', err);
    }
    return;
  }

  // Debounce non-critical writes by 500ms to save CPU & SSD wear, then write asynchronously
  if (dbSaveTimer) clearTimeout(dbSaveTimer);
  dbSaveTimer = setTimeout(() => {
    dbSaveTimer = null;
    if (isSavingDb) {
      pendingSaveDb = true;
    } else {
      performAsyncDbSave().catch(() => {});
    }
  }, 500);
}

class SqlJsStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
  }

  all(...params) {
    const stmt = this.db.prepare(this.sql);
    try {
      let bindValues = params;
      if (params.length === 1 && Array.isArray(params[0])) {
        bindValues = params[0];
      }
      if (bindValues.length > 0) {
        stmt.bind(bindValues.map(v => (v === undefined ? null : v)));
      }
      const result = [];
      while (stmt.step()) {
        result.push(sanitizeRow(stmt.getAsObject()));
      }
      return result;
    } finally {
      try { stmt.free(); } catch (e) {}
    }
  }

  get(...params) {
    const stmt = this.db.prepare(this.sql);
    try {
      let bindValues = params;
      if (params.length === 1 && Array.isArray(params[0])) {
        bindValues = params[0];
      }
      if (bindValues.length > 0) {
        stmt.bind(bindValues.map(v => (v === undefined ? null : v)));
      }
      if (stmt.step()) {
        return sanitizeRow(stmt.getAsObject());
      }
      return undefined;
    } finally {
      try { stmt.free(); } catch (e) {}
    }
  }

  run(...params) {
    const stmt = this.db.prepare(this.sql);
    try {
      let bindValues = params;
      if (params.length === 1 && Array.isArray(params[0])) {
        bindValues = params[0];
      }
      if (bindValues.length > 0) {
        stmt.bind(bindValues.map(v => (v === undefined ? null : v)));
      }
      stmt.step();
    } finally {
      try { stmt.free(); } catch (e) {}
    }

    const resId = this.db.exec('SELECT last_insert_rowid() as id;');
    const lastInsertRowid = (resId.length > 0 && resId[0].values.length > 0)
      ? Number(resId[0].values[0][0])
      : 0;

    const resChanges = this.db.exec('SELECT changes() as cnt;');
    const changes = (resChanges.length > 0 && resChanges[0].values.length > 0)
      ? Number(resChanges[0].values[0][0])
      : 0;

    saveDbToDisk();
    return { lastInsertRowid, changes };
  }
}

class SqlJsDbWrapper {
  constructor(db) {
    this.db = db;
  }

  prepare(sql) {
    return new SqlJsStatement(this.db, sql);
  }

  exec(sql) {
    this.db.exec(sql);
    saveDbToDisk();
  }
}

/**
 * @param {string} dbFilePath - Full path to the .sqlite file (e.g. /some/dir/campaigns.sqlite)
 */
export async function initDatabase(dbFilePath) {
  try {
    const dbDir = path.dirname(dbFilePath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    currentDbPath = dbFilePath;

    if (dbInstance) {
      try { dbInstance.close(); } catch (e) {}
      dbInstance = null;
      dbWrapperInstance = null;
    }

    // Attempt native better-sqlite3 first
    if (BetterSqlite3) {
      try {
        const nativeDb = new BetterSqlite3(dbFilePath);
        nativeDb.pragma('foreign_keys = ON');
        nativeDb.pragma('journal_mode = WAL');
        dbInstance = nativeDb;
        dbWrapperInstance = nativeDb;
        isNativeSqlite = true;
        console.log('⚡ [DB Engine] Native SQLite (better-sqlite3) active in WAL mode:', dbFilePath);
      } catch (nativeErr) {
        console.warn('⚠️ [DB Engine] better-sqlite3 initialization failed, falling back to sql.js:', nativeErr.message);
        isNativeSqlite = false;
        dbInstance = null;
      }
    }

    // Fallback to sql.js
    if (!dbInstance) {
      isNativeSqlite = false;
      if (!SQL) {
        SQL = await initSqlJs();
      }

      let filebuffer = null;
      if (fs.existsSync(currentDbPath)) {
        try {
          filebuffer = fs.readFileSync(currentDbPath);
        } catch (readErr) {
          console.error('Failed to read existing database file, creating fresh DB:', readErr);
          filebuffer = null;
        }
      }

      try {
        dbInstance = filebuffer ? new SQL.Database(filebuffer) : new SQL.Database();
      } catch (dbErr) {
        console.error('Database file corrupted or unreadable, re-initializing fresh database:', dbErr);
        dbInstance = new SQL.Database();
      }

      dbInstance.run('PRAGMA foreign_keys = ON;');
      dbWrapperInstance = new SqlJsDbWrapper(dbInstance);
    }

    dbWrapperInstance.exec(`
      CREATE TABLE IF NOT EXISTS Tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        origin_date TEXT NOT NULL,
        modification_date TEXT,
        priority TEXT NOT NULL,
        state TEXT NOT NULL,
        stage TEXT NOT NULL,
        deadline TEXT,
        initiated_at TEXT,
        reschedule_count INTEGER DEFAULT 0,
        reschedule_1 TEXT,
        reschedule_2 TEXT,
        ended_date TEXT,
        end_note TEXT,
        days_spent INTEGER,
        is_breached_extracted INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS Tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        tag_name TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES Tasks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS Subtasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        creation_time TEXT NOT NULL,
        status TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES Tasks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS Strikes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        execution_date TEXT NOT NULL,
        priority TEXT DEFAULT 'Medium',
        status TEXT DEFAULT 'STANDBY',
        notes TEXT,
        subtask_id INTEGER,
        reschedule_count INTEGER DEFAULT 0,
        recurrence_id TEXT DEFAULT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_tags_task_id ON Tags(task_id);
      CREATE INDEX IF NOT EXISTS idx_tags_tag_name ON Tags(tag_name);
      CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON Subtasks(task_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_state ON Tasks(state);
      CREATE INDEX IF NOT EXISTS idx_strikes_execution_date ON Strikes(execution_date);
      CREATE INDEX IF NOT EXISTS idx_strikes_status ON Strikes(status);
      CREATE INDEX IF NOT EXISTS idx_strikes_subtask_id ON Strikes(subtask_id);
    `);

    // Migrations for existing databases MUST happen before creating indexes on migrated columns
    try {
      dbWrapperInstance.exec('ALTER TABLE Tasks ADD COLUMN is_breached_extracted INTEGER DEFAULT 0;');
    } catch (e) {
      // Column already exists
    }

    try {
      dbWrapperInstance.exec('ALTER TABLE Strikes ADD COLUMN recurrence_id TEXT DEFAULT NULL;');
    } catch (e) {
      // Column already exists
    }

    // Now safe to create index on recurrence_id
    try {
      dbWrapperInstance.exec('CREATE INDEX IF NOT EXISTS idx_strikes_recurrence_id ON Strikes(recurrence_id);');
    } catch (e) {
      // Index already exists or not supported
    }

    return { success: true, dbPath: currentDbPath };
  } catch (err) {
    console.error('Fatal Database Init Error:', err);
    return { success: false, error: err.message };
  }
}

export function getDb() {
  if (!dbWrapperInstance) {
    throw new Error('Database engine not initialized.');
  }
  return dbWrapperInstance;
}

export function flushDbToDisk() {
  if (!isNativeSqlite) {
    saveDbToDisk(true);
  }
}

