import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(__dirname, '../../leads.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open database:', err.message);
  } else {
    console.log('Connected to SQLite database at', dbPath);
    // Enable High-Performance WAL mode and memory caching
    db.run('PRAGMA journal_mode = WAL;');
    db.run('PRAGMA synchronous = NORMAL;');
    db.run('PRAGMA cache_size = -64000;');
    db.run('PRAGMA temp_store = MEMORY;');
    initDatabase();
  }
});

export const run = (sql: string, params: any[] = []): Promise<{ id?: number; changes?: number }> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

export const get = <T = any>(sql: string, params: any[] = []): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
};

export const all = <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve((rows || []) as T[]);
    });
  });
};

async function addColumnIfNotExists(table: string, columnDef: string, colName: string) {
  try {
    await run(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
    console.log(`Added column ${colName} to ${table}`);
  } catch (err: any) {
    // Column likely already exists
  }
}

export async function initDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      external_id TEXT,
      name TEXT NOT NULL,
      category TEXT,
      contact_email TEXT,
      phone TEXT,
      website TEXT,
      has_website INTEGER DEFAULT 0,
      instagram_handle TEXT,
      offered_service TEXT,
      in_campaign_queue INTEGER DEFAULT 0,
      address TEXT,
      rating REAL,
      user_ratings_total INTEGER,
      subscriber_count INTEGER,
      video_count INTEGER,
      view_count INTEGER,
      channel_handle TEXT,
      description TEXT,
      status TEXT DEFAULT 'not_contacted',
      pitch TEXT,
      pitch_status TEXT DEFAULT 'draft',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_contacted_at DATETIME
    )
  `);

  // Migrate existing tables
  await addColumnIfNotExists('leads', 'has_website INTEGER DEFAULT 0', 'has_website');
  await addColumnIfNotExists('leads', 'instagram_handle TEXT', 'instagram_handle');
  await addColumnIfNotExists('leads', 'offered_service TEXT', 'offered_service');
  await addColumnIfNotExists('leads', 'in_campaign_queue INTEGER DEFAULT 0', 'in_campaign_queue');

  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_key TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_key, key)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      action TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS inbound_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      channel TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT,
      message_text TEXT NOT NULL,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_read INTEGER DEFAULT 0
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS api_cache (
      cache_key TEXT PRIMARY KEY,
      data_json TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS whatsapp_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE NOT NULL,
      account_name TEXT,
      phone_number TEXT,
      status TEXT DEFAULT 'disconnected',
      last_active DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS access_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_code TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      is_admin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME
    )
  `);

  await addColumnIfNotExists('access_keys', 'is_admin INTEGER DEFAULT 0', 'is_admin');
  await addColumnIfNotExists('access_keys', 'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP', 'updated_at');
  await addColumnIfNotExists('access_keys', "plan_type TEXT DEFAULT 'pro'", 'plan_type');
  await addColumnIfNotExists('access_keys', 'daily_limit INTEGER DEFAULT 40', 'daily_limit');
  await addColumnIfNotExists('access_keys', 'max_whatsapp_accounts INTEGER DEFAULT 1', 'max_whatsapp_accounts');
  await addColumnIfNotExists('access_keys', 'max_email_accounts INTEGER DEFAULT 1', 'max_email_accounts');
  await addColumnIfNotExists('access_keys', 'bound_device_id TEXT', 'bound_device_id');
  await addColumnIfNotExists('access_keys', 'bound_device_info TEXT', 'bound_device_info');
  await addColumnIfNotExists('access_keys', 'bound_at DATETIME', 'bound_at');
  await addColumnIfNotExists('access_keys', 'device_lock_enabled INTEGER DEFAULT 1', 'device_lock_enabled');
  await addColumnIfNotExists('access_keys', 'duration_days INTEGER DEFAULT 30', 'duration_days');
  await addColumnIfNotExists('access_keys', 'activated_at DATETIME', 'activated_at');
  await addColumnIfNotExists('access_keys', 'expires_at DATETIME', 'expires_at');

  await run(`
    CREATE TABLE IF NOT EXISTS daily_usage (
      key_code TEXT NOT NULL,
      channel TEXT NOT NULL,
      usage_date TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      PRIMARY KEY (key_code, channel, usage_date)
    )
  `);

  // Seed default master access key if no keys exist
  const existingKey = await get<{ count: number }>('SELECT count(*) as count FROM access_keys');
  if (!existingKey || existingKey.count === 0) {
    await run(
      'INSERT INTO access_keys (key_code, label, is_active, is_admin) VALUES (?, ?, ?, ?)',
      ['OUTREACH-PRO-2025', 'Master Access Key', 1, 1]
    );
    console.log('[Database] Default Access Key seeded: OUTREACH-PRO-2025 (Admin)');
  }

  // Ensure master keys always have admin privileges
  await run('UPDATE access_keys SET is_admin = 1 WHERE UPPER(key_code) IN (?, ?, ?)', ['OUTREACH-PRO-2025', '@NOVA0511', 'NOVA0511']);
  await run(
    'INSERT OR IGNORE INTO access_keys (key_code, label, is_active, is_admin, plan_type, daily_limit, max_whatsapp_accounts, max_email_accounts, duration_days) VALUES (?, ?, 1, 1, ?, ?, ?, ?, ?)',
    ['@NOVA0511', 'Master Owner Key (@NOVA0511)', 'pro', 999999, 10, 10, 0]
  );
  await run(
    'INSERT OR IGNORE INTO access_keys (key_code, label, is_active, is_admin, plan_type, daily_limit, max_whatsapp_accounts, max_email_accounts, duration_days) VALUES (?, ?, 1, 1, ?, ?, ?, ?, ?)',
    ['NOVA0511', 'Master Owner Key (NOVA0511)', 'pro', 999999, 10, 10, 0]
  );

  console.log('Database tables initialized with access_keys, multi-whatsapp and api_cache support.');
}
