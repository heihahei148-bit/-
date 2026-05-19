import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'ai-bingjian.sqlite');
const schemaPath = path.join(__dirname, 'init.sql');
const sqlJsDistDir = path.resolve(process.cwd(), 'node_modules', 'sql.js', 'dist');

fs.mkdirSync(dataDir, { recursive: true });

const SQL = await initSqlJs({
  locateFile: (file) => path.join(sqlJsDistDir, file)
});

const hasPersistedDb = fs.existsSync(dbPath);
const db = hasPersistedDb ? new SQL.Database(fs.readFileSync(dbPath)) : new SQL.Database();
db.run(fs.readFileSync(schemaPath, 'utf8'));

function ensureReportsBirthDateColumn() {
  const tableInfo = db.exec('PRAGMA table_info(reports)');
  const columns = tableInfo[0]?.values?.map((row) => row[1]) ?? [];

  if (columns.includes('birth_datetime') && !columns.includes('birth_date')) {
    db.run('ALTER TABLE reports RENAME COLUMN birth_datetime TO birth_date');
  }
}

function persist() {
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function getLastInsertRowid() {
  const result = db.exec('SELECT last_insert_rowid() AS id');
  return Number(result[0]?.values?.[0]?.[0] ?? 0);
}

export function execute(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.run(params);
  stmt.free();
  const lastInsertRowid = getLastInsertRowid();
  persist();
  return { lastInsertRowid };
}

export function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

export function save() {
  persist();
}

ensureReportsBirthDateColumn();
persist();

export default db;
