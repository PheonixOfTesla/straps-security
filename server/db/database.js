import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { schema } from './schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'straps.db');

let db = null;
let SQL = null;

async function initDB() {
  if (db) return db;

  SQL = await initSqlJs();

  // Load existing database or create new one
  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Run schema
  db.run(schema);
  saveDB();

  return db;
}

function saveDB() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(dbPath, buffer);
  }
}

function getDB() {
  return db;
}

// Wrapper to make sql.js work like better-sqlite3
function prepare(sql) {
  return {
    run: (...params) => {
      db.run(sql, params);
      saveDB();
      return { lastInsertRowid: db.exec("SELECT last_insert_rowid()")[0]?.values[0][0] || 0 };
    },
    get: (...params) => {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      if (stmt.step()) {
        const cols = stmt.getColumnNames();
        const vals = stmt.get();
        stmt.free();
        const row = {};
        cols.forEach((c, i) => row[c] = vals[i]);
        return row;
      }
      stmt.free();
      return undefined;
    },
    all: (...params) => {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      const cols = stmt.getColumnNames();
      while (stmt.step()) {
        const vals = stmt.get();
        const row = {};
        cols.forEach((c, i) => row[c] = vals[i]);
        rows.push(row);
      }
      stmt.free();
      return rows;
    }
  };
}

export { initDB, getDB, prepare, saveDB };
export default { initDB, getDB, prepare, saveDB };
