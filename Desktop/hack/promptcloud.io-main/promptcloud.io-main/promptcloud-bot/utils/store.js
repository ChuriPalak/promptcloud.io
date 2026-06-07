// utils/store.js
// Hybrid in-memory + SQLite store. Hot data (sessions, OTPs, pending top-ups)
// lives in memory for speed; users, wallet, deployments, transactions persist
// in SQLite so restarts don't wipe balances and history.

const path = require('path');
const Database = require('sqlite3').Database;

const DB_PATH = process.env.SQLITE_PATH || path.join(__dirname, '..', 'promptcloud.db');
const db = new Database(DB_PATH);

// Promisify helpers
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// ── Schema ─────────────────────────────────────────────────
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    company_name TEXT,
    phone TEXT,
    telegram_username TEXT,
    telegram_chat_id TEXT,
    wallet_balance REAL DEFAULT 0,
    wallet_balance_xdc REAL DEFAULT 0,
    is_verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS deployments (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    vm_id TEXT,
    type TEXT,
    name TEXT,
    status TEXT DEFAULT 'pending',
    cpu_cores INTEGER,
    ram_mb INTEGER,
    storage_gb INTEGER,
    os TEXT,
    cost_per_hour REAL,
    started_at DATETIME,
    stopped_at DATETIME,
    total_cost REAL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    type TEXT,
    amount REAL,
    currency TEXT,
    status TEXT DEFAULT 'pending',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_deployments_user ON deployments(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)`);
});

// ── In-memory hot data ─────────────────────────────────────
const sessions = {};   // telegramId or synthetic web id → { email, verified, name, ... }
const otpStore = {};   // email → { code, expires, telegramId }

// ── Sessions (in-memory, shared between bot and web) ───────
function getSession(telegramId) {
  return sessions[telegramId] || null;
}

function setSession(telegramId, data) {
  sessions[telegramId] = { ...(sessions[telegramId] || {}), ...data };
  return sessions[telegramId];
}

function clearSession(telegramId) {
  delete sessions[telegramId];
}

function isVerified(telegramId) {
  return sessions[telegramId]?.verified === true;
}

// ── OTPs (in-memory, 5-10 min expiry) ──────────────────────
function storeOTP(email, code, telegramId) {
  const expiry = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);
  otpStore[email.toLowerCase()] = {
    code,
    telegramId,
    expires: Date.now() + expiry * 60 * 1000,
  };
}

function verifyOTP(email, code) {
  const entry = otpStore[email.toLowerCase()];
  if (!entry) return { ok: false, reason: 'No OTP found for this email. Use /start to request one.' };
  if (Date.now() > entry.expires) {
    delete otpStore[email.toLowerCase()];
    return { ok: false, reason: 'OTP expired. Use /start to request a new one.' };
  }
  if (entry.code !== code.trim()) return { ok: false, reason: 'Incorrect OTP. Try again.' };
  delete otpStore[email.toLowerCase()];
  return { ok: true, telegramId: entry.telegramId };
}

// ── Users (SQLite) ─────────────────────────────────────────
async function getUserByEmail(email) {
  return dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
}

async function getUserById(id) {
  return dbGet('SELECT * FROM users WHERE id = ?', [id]);
}

async function createUser({ id, email, password, name, company_name, phone }) {
  await dbRun(
    'INSERT INTO users (id, email, password, name, company_name, phone, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, email.toLowerCase(), password || null, name || null, company_name || null, phone || null, 1]
  );
  return getUserById(id);
}

async function updateUser(id, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => fields[k]);
  await dbRun(`UPDATE users SET ${setClause} WHERE id = ?`, [...values, id]);
}

// ── Wallet balance (SQLite + in-memory sync) ───────────────
function getBalance(telegramId) {
  // For in-memory sessions (bot/web shared state)
  return sessions[telegramId]?.balance || 0;
}

async function getWalletBalance(userId) {
  const user = await getUserById(userId);
  if (!user) return { inr: 0, xdc: 0 };
  return {
    inr: user.wallet_balance || 0,
    xdc: user.wallet_balance_xdc || 0,
  };
}

function addBalance(telegramId, amount) {
  if (!sessions[telegramId]) return;
  sessions[telegramId].balance = (sessions[telegramId].balance || 0) + amount;
  if (!sessions[telegramId].txHistory) sessions[telegramId].txHistory = [];
  sessions[telegramId].txHistory.unshift({
    amount,
    type: 'credit',
    ts: new Date().toISOString(),
  });
}

async function addWalletBalance(userId, amount, currency = 'INR', description = 'Deposit') {
  const field = currency === 'XDC' ? 'wallet_balance_xdc' : 'wallet_balance';
  await dbRun(`UPDATE users SET ${field} = ${field} + ? WHERE id = ?`, [amount, userId]);
  const txId = require('uuid').v4();
  await dbRun(
    'INSERT INTO transactions (id, user_id, type, amount, currency, status, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [txId, userId, 'deposit', amount, currency, 'completed', description]
  );
  return txId;
}

async function deductWalletBalance(userId, amount, currency = 'INR', description = 'Charge') {
  const field = currency === 'XDC' ? 'wallet_balance_xdc' : 'wallet_balance';
  const user = await getUserById(userId);
  if (!user || (user[field] || 0) < amount) return { ok: false, error: 'Insufficient balance' };
  await dbRun(`UPDATE users SET ${field} = ${field} - ? WHERE id = ?`, [amount, userId]);
  const txId = require('uuid').v4();
  await dbRun(
    'INSERT INTO transactions (id, user_id, type, amount, currency, status, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [txId, userId, 'charge', amount, currency, 'completed', description]
  );
  return { ok: true, txId };
}

function getTxHistory(telegramId) {
  return sessions[telegramId]?.txHistory || [];
}

async function getTransactions(userId, limit = 50) {
  return dbAll(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    [userId, limit]
  );
}

// ── Deployments (SQLite) ───────────────────────────────────
async function createDeployment(data) {
  const id = require('uuid').v4();
  await dbRun(
    `INSERT INTO deployments (id, user_id, vm_id, type, name, status, cpu_cores, ram_mb, storage_gb, os, cost_per_hour, started_at, total_cost)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.user_id,
      data.vm_id || null,
      data.type || 'vm',
      data.name,
      data.status || 'provisioning',
      data.cpu_cores || 1,
      data.ram_mb || 1024,
      data.storage_gb || 10,
      data.os || 'Ubuntu 22.04',
      data.cost_per_hour || 0,
      data.started_at || new Date().toISOString(),
      data.total_cost || 0,
    ]
  );
  return getDeploymentById(id);
}

async function getDeployments(userId) {
  return dbAll('SELECT * FROM deployments WHERE user_id = ? ORDER BY started_at DESC', [userId]);
}

async function getDeploymentById(id) {
  return dbGet('SELECT * FROM deployments WHERE id = ?', [id]);
}

async function updateDeployment(id, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => fields[k]);
  await dbRun(`UPDATE deployments SET ${setClause} WHERE id = ?`, [...values, id]);
}

// ── Internal ───────────────────────────────────────────────
function _getAll() { return sessions; }

module.exports = {
  // sessions
  getSession,
  setSession,
  clearSession,
  isVerified,
  // OTP
  storeOTP,
  verifyOTP,
  // users
  getUserByEmail,
  getUserById,
  createUser,
  updateUser,
  // wallet
  getBalance,
  getWalletBalance,
  addBalance,
  addWalletBalance,
  deductWalletBalance,
  getTxHistory,
  getTransactions,
  // deployments
  createDeployment,
  getDeployments,
  getDeploymentById,
  updateDeployment,
  // internal
  _getAll,
  // expose db helpers for advanced use
  dbRun,
  dbGet,
  dbAll,
};
