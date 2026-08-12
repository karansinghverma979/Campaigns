import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';

let SQL = null;
let dbInstance = null;
let currentDbPath = null;

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

let dbSaveTimer = null;

function saveDbToDisk(immediate = false) {
  if (!dbInstance || !currentDbPath) return;

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

  // Debounce non-critical writes by 500ms to save CPU & SSD wear
  if (dbSaveTimer) clearTimeout(dbSaveTimer);
  dbSaveTimer = setTimeout(() => {
    saveDbToDisk(true);
  }, 500);
}

class SqlJsStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
  }

  all(...params) {
    const stmt = this.db.prepare(this.sql);
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
    stmt.free();
    return result;
  }

  get(...params) {
    const rows = this.all(...params);
    return rows.length > 0 ? rows[0] : undefined;
  }

  run(...params) {
    const stmt = this.db.prepare(this.sql);
    let bindValues = params;
    if (params.length === 1 && Array.isArray(params[0])) {
      bindValues = params[0];
    }
    if (bindValues.length > 0) {
      stmt.bind(bindValues.map(v => (v === undefined ? null : v)));
    }
    stmt.step();
    stmt.free();

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

class DbWrapper {
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

let dbWrapperInstance = null;

/**
 * @param {string} dbFilePath - Full path to the .sqlite file (e.g. /some/dir/campaigns.sqlite)
 */
export async function initDatabase(dbFilePath) {
  try {
    if (!SQL) {
      SQL = await initSqlJs();
    }

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
    dbInstance.run('PRAGMA optimize;');

    dbWrapperInstance = new DbWrapper(dbInstance);

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
        days_spent INTEGER
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

      DROP TABLE IF EXISTS Chronos;
    `);

    // Schema migrations for existing databases
    try { dbWrapperInstance.exec(`ALTER TABLE Tasks ADD COLUMN modification_date TEXT;`); } catch (e) {}
    try { dbWrapperInstance.exec(`ALTER TABLE Tasks ADD COLUMN days_spent INTEGER;`); } catch (e) {}

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
  saveDbToDisk(true);
}

