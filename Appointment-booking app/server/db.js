const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'appointments.db');

let db = null;
let SQL = null;

async function initDatabase() {
  SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA foreign_keys = ON');
  saveDatabase();
  return db;
}

function saveDatabase() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Convenience: query all rows
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Convenience: query one row
function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Convenience: run a statement (INSERT/UPDATE/DELETE)
function run(sql, params = []) {
  db.run(sql, params);
  // Get last_insert_rowid BEFORE saveDatabase (which resets it in sql.js)
  const rows = db.exec("SELECT last_insert_rowid() as id");
  const lastInsertRowid = rows?.[0]?.values?.[0]?.[0] ?? null;
  saveDatabase();
  return { lastInsertRowid };
}

function getDb() {
  return db;
}

module.exports = { initDatabase, getDb, queryAll, queryOne, run, saveDatabase };
