require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const axios = require('axios');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3001;

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

app.use(cors());
app.use(express.json());

// ==================== PROXMOX CONFIGURATION ====================
const PROXMOX_CONFIG = {
  host: process.env.PROXMOX_HOST || 'https://your-proxmox-server:8006',
  token: process.env.PROXMOX_API_TOKEN,
  node: process.env.PROXMOX_NODE || 'pve',
  verifySSL: false
};

// ==================== TELEGRAM BOT ====================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_TOKEN_RE = /^\d+:[A-Za-z0-9_-]{20,}$/;
const isTelegramConfigured = TELEGRAM_TOKEN_RE.test(TELEGRAM_BOT_TOKEN);

async function sendTelegramOTP(chatId, otp) {
  if (!isTelegramConfigured) {
    logger.warn('Telegram OTP skipped: bot token is not configured');
    return false;
  }

  try {
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: chatId,
        text: `🔐 Your PromptCloud OTP Code: ${otp}\n\nThis code expires in 5 minutes.\nIf you didn't request this, ignore this message.`,
        parse_mode: 'HTML'
      }
    );
    return true;
  } catch (error) {
    logger.error(`Telegram OTP failed: ${error.message}`);
    return false;
  }
}

async function sendTelegramNotification(chatId, message) {
  if (!isTelegramConfigured) {
    logger.warn('Telegram notification skipped: bot token is not configured');
    return false;
  }

  try {
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      }
    );
    return true;
  } catch (error) {
    logger.error(`Telegram notification failed: ${error.message}`);
    return false;
  }
}

// ==================== DATABASE ====================
const Database = require('sqlite3').Database;
const db = new Database('./promptcloud.db');

db.serialize(() => {
  // Users
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    company_name TEXT,
    phone TEXT,
    telegram_username TEXT,
    telegram_chat_id TEXT,
    telegram_bot_token TEXT,
    wallet_balance REAL DEFAULT 0,
    wallet_balance_xdc REAL DEFAULT 0,
    is_verified INTEGER DEFAULT 0,
    otp_code TEXT,
    otp_expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Providers
  db.run(`CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    name TEXT,
    proxmox_host TEXT,
    proxmox_node TEXT,
    api_token TEXT,
    status TEXT DEFAULT 'active',
    price_cpu REAL,
    price_ram REAL,
    price_storage REAL,
    location TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Deployments
  db.run(`CREATE TABLE IF NOT EXISTS deployments (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    provider_id TEXT,
    proxmox_vm_id INTEGER,
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
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (provider_id) REFERENCES providers(id)
  )`);

  // Transactions
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
});

// ==================== AUTHENTICATION ====================
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'promptcloud-secret');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ==================== OTP GENERATION ====================
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, company_name, phone, telegram_username, telegram_bot_token } = req.body;
  
  if (!email || !password || !name || !phone || !telegram_username) {
    return res.status(400).json({ error: 'Required fields: email, password, name, phone, telegram_username' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = uuidv4();
  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  
  db.run(
    'INSERT INTO users (id, email, password, name, company_name, phone, telegram_username, telegram_bot_token, otp_code, otp_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [userId, email, hashedPassword, name, company_name || null, phone, telegram_username, telegram_bot_token || null, otp, otpExpires.toISOString()],
    (err) => {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Email already registered' });
        }
        return res.status(500).json({ error: 'Registration failed' });
      }
      
      // Send OTP via Telegram
      // In production, we need the user's chat_id. For now, we store it and ask them to message our bot first
      res.json({ 
        success: true, 
        userId,
        message: 'Registration successful. Please verify your Telegram by messaging our bot first, then verify OTP.',
        requires_otp: true
      });
    }
  );
});

// Send OTP
app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });
    
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    
    db.run(
      'UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?',
      [otp, otpExpires.toISOString(), user.id],
      async (err) => {
        if (err) return res.status(500).json({ error: 'Failed to generate OTP' });
        
        // Send OTP via Telegram
        if (user.telegram_chat_id) {
          const sent = await sendTelegramOTP(user.telegram_chat_id, otp);
          if (sent) {
            res.json({ success: true, message: 'OTP sent to your Telegram' });
          } else {
          res.status(500).json({ error: 'Failed to send Telegram OTP. Please ensure you have messaged our bot first.' });
        }
      } else {
        res.status(400).json({ 
            error: isTelegramConfigured
              ? 'Telegram chat ID not found. Please message our bot first with /start to link your account.'
              : 'Telegram bot token is not configured. Add a real BotFather token to api/.env first.',
            bot_username: isTelegramConfigured ? 'promptcloud_bot' : undefined
          });
        }
      }
    );
  });
});

// Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });
    
    if (user.otp_code !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    
    if (new Date(user.otp_expires_at) < new Date()) {
      return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    }
    
    // Mark user as verified
    db.run(
      'UPDATE users SET is_verified = 1, otp_code = NULL, otp_expires_at = NULL WHERE id = ?',
      [user.id],
      (err) => {
        if (err) return res.status(500).json({ error: 'Verification failed' });
        
        const token = jwt.sign({ userId: user.id, email }, process.env.JWT_SECRET || 'promptcloud-secret');
        res.json({ 
          success: true, 
          token, 
          userId: user.id,
          message: 'Account verified successfully' 
        });
      }
    );
  });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    
    if (!user.is_verified) {
      return res.status(403).json({ 
        error: 'Account not verified. Please verify OTP first.',
        requires_otp: true,
        email: user.email
      });
    }
    
    const token = jwt.sign({ userId: user.id, email }, process.env.JWT_SECRET || 'promptcloud-secret');
    res.json({ 
      token, 
      userId: user.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company_name: user.company_name,
        wallet_balance: user.wallet_balance,
        wallet_balance_xdc: user.wallet_balance_xdc
      }
    });
  });
});

// Get Profile
app.get('/api/auth/profile', authenticate, (req, res) => {
  db.get(
    'SELECT id, email, name, company_name, phone, telegram_username, telegram_bot_token, wallet_balance, wallet_balance_xdc, is_verified, created_at FROM users WHERE id = ?',
    [req.user.userId],
    (err, user) => {
      if (err || !user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    }
  );
});

// Update Telegram Chat ID (webhook from bot)
app.post('/api/auth/telegram-webhook', (req, res) => {
  const { message } = req.body;
  
  if (message && message.text === '/start') {
    const chatId = message.chat.id;
    const telegramUsername = message.chat.username;
    
    // Find user by telegram username
    db.get('SELECT * FROM users WHERE telegram_username = ?', [telegramUsername], (err, user) => {
      if (user) {
        db.run(
          'UPDATE users SET telegram_chat_id = ? WHERE id = ?',
          [chatId, user.id],
          (err) => {
            if (!err) {
              sendTelegramNotification(chatId, '✅ Your Telegram account is now linked to PromptCloud! You will receive OTPs here.');
            }
          }
        );
      }
    });
  }
  
  res.sendStatus(200);
});

// ==================== WALLET ====================

// Get Balance
app.get('/api/wallet', authenticate, (req, res) => {
  db.get(
    'SELECT wallet_balance, wallet_balance_xdc FROM users WHERE id = ?',
    [req.user.userId],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ 
        inr: row.wallet_balance,
        xdc: row.wallet_balance_xdc,
        currency: 'INR'
      });
    }
  );
});

// Deposit (Simulated - In production, integrate Razorpay, UPI, etc.)
app.post('/api/wallet/deposit', authenticate, (req, res) => {
  const { amount, currency, method } = req.body;
  const txId = uuidv4();
  
  db.run(
    'INSERT INTO transactions (id, user_id, type, amount, currency, status, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [txId, req.user.userId, 'deposit', amount, currency, 'completed', `Deposit ${amount} ${currency} via ${method}`],
    (err) => {
      if (err) return res.status(500).json({ error: 'Transaction failed' });
      
      const field = currency === 'XDC' ? 'wallet_balance_xdc' : 'wallet_balance';
      db.run(`UPDATE users SET ${field} = ${field} + ? WHERE id = ?`, [amount, req.user.userId]);
      
      // Send notification
      db.get('SELECT telegram_chat_id FROM users WHERE id = ?', [req.user.userId], async (err, user) => {
        if (user?.telegram_chat_id) {
          await sendTelegramNotification(
            user.telegram_chat_id,
            `💰 Wallet Deposit: +${amount} ${currency}\nVia: ${method}\nNew balance: Check your dashboard`
          );
        }
      });
      
      res.json({ txId, status: 'completed', amount, currency });
    }
  );
});

// Transaction History
app.get('/api/wallet/transactions', authenticate, (req, res) => {
  db.all(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(rows);
    }
  );
});

// ==================== INSTANCE BOOKING ====================

// Get Available Instances (Templates)
app.get('/api/instances', (req, res) => {
  const instances = [
    {
      id: 'vm-ubuntu',
      type: 'vm',
      name: 'Ubuntu Server',
      os: 'Ubuntu 22.04 LTS',
      cpu: { min: 1, max: 16, price: 0.05 },
      ram: { min: 512, max: 65536, price: 0.02 },
      storage: { min: 10, max: 1000, price: 0.01 },
      description: 'General purpose Ubuntu virtual machine'
    },
    {
      id: 'vm-debian',
      type: 'vm',
      name: 'Debian Server',
      os: 'Debian 12',
      cpu: { min: 1, max: 16, price: 0.05 },
      ram: { min: 512, max: 65536, price: 0.02 },
      storage: { min: 10, max: 1000, price: 0.01 },
      description: 'Stable Debian virtual machine'
    },
    {
      id: 'lxc-ubuntu',
      type: 'lxc',
      name: 'Ubuntu Container',
      os: 'Ubuntu 22.04 LTS',
      cpu: { min: 1, max: 8, price: 0.03 },
      ram: { min: 256, max: 32768, price: 0.015 },
      storage: { min: 5, max: 500, price: 0.008 },
      description: 'Lightweight Ubuntu LXC container'
    },
    {
      id: 'lxc-alpine',
      type: 'lxc',
      name: 'Alpine Container',
      os: 'Alpine Linux',
      cpu: { min: 1, max: 8, price: 0.03 },
      ram: { min: 128, max: 32768, price: 0.015 },
      storage: { min: 5, max: 500, price: 0.008 },
      description: 'Ultra-lightweight Alpine container'
    }
  ];
  
  res.json(instances);
});

// Calculate Price
app.post('/api/instances/price', (req, res) => {
  const { instance_id, cpu, ram, storage, hours } = req.body;
  
  const instances = [
    { id: 'vm-ubuntu', cpu_price: 0.05, ram_price: 0.02, storage_price: 0.01 },
    { id: 'vm-debian', cpu_price: 0.05, ram_price: 0.02, storage_price: 0.01 },
    { id: 'lxc-ubuntu', cpu_price: 0.03, ram_price: 0.015, storage_price: 0.008 },
    { id: 'lxc-alpine', cpu_price: 0.03, ram_price: 0.015, storage_price: 0.008 }
  ];
  
  const instance = instances.find(i => i.id === instance_id);
  if (!instance) return res.status(400).json({ error: 'Invalid instance type' });
  
  const hourly = (cpu * instance.cpu_price) + (ram/1024 * instance.ram_price) + (storage * instance.storage_price);
  const total = hourly * (hours || 1);
  
  res.json({
    hourly,
    total,
    hours: hours || 1,
    breakdown: {
      cpu: cpu * instance.cpu_price,
      ram: ram/1024 * instance.ram_price,
      storage: storage * instance.storage_price
    }
  });
});

// Book Instance
app.post('/api/instances/book', authenticate, async (req, res) => {
  const { instance_id, name, cpu, ram, storage, hours, os } = req.body;
  const userId = req.user.userId;
  
  // Calculate cost
  const instances = [
    { id: 'vm-ubuntu', cpu_price: 0.05, ram_price: 0.02, storage_price: 0.01 },
    { id: 'vm-debian', cpu_price: 0.05, ram_price: 0.02, storage_price: 0.01 },
    { id: 'lxc-ubuntu', cpu_price: 0.03, ram_price: 0.015, storage_price: 0.008 },
    { id: 'lxc-alpine', cpu_price: 0.03, ram_price: 0.015, storage_price: 0.008 }
  ];
  
  const instance = instances.find(i => i.id === instance_id);
  if (!instance) return res.status(400).json({ error: 'Invalid instance type' });
  
  const hourlyCost = (cpu * instance.cpu_price) + (ram/1024 * instance.ram_price) + (storage * instance.storage_price);
  const totalCost = hourlyCost * (hours || 1);
  
  // Check balance
  db.get('SELECT wallet_balance FROM users WHERE id = ?', [userId], async (err, user) => {
    if (err || !user) return res.status(500).json({ error: 'User not found' });
    
    if (user.wallet_balance < totalCost) {
      return res.status(400).json({ 
        error: 'Insufficient balance',
        required: totalCost,
        current: user.wallet_balance
      });
    }
    
    const deploymentId = uuidv4();
    const vmId = Math.floor(Math.random() * 9000) + 100;
    const type = instance_id.startsWith('vm') ? 'vm' : 'lxc';
    
    try {
      // Deduct balance
      db.run('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?', [totalCost, userId]);
      
      // Record transaction
      const txId = uuidv4();
      db.run(
        'INSERT INTO transactions (id, user_id, type, amount, currency, status, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [txId, userId, 'vm_charge', totalCost, 'INR', 'completed', `Booked ${name} (${instance_id})`]
      );
      
      // Create deployment record
      db.run(
        'INSERT INTO deployments (id, user_id, provider_id, proxmox_vm_id, type, name, status, cpu_cores, ram_mb, storage_gb, os, cost_per_hour, started_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [deploymentId, userId, 'provider-1', vmId, type, name, 'provisioning', cpu, ram, storage, os, hourlyCost, new Date().toISOString()]
      );
      
      // Send notification
      db.get('SELECT telegram_chat_id FROM users WHERE id = ?', [userId], async (err, user) => {
        if (user?.telegram_chat_id) {
          await sendTelegramNotification(
            user.telegram_chat_id,
            `🚀 Instance Booked!\n\nName: ${name}\nType: ${type.toUpperCase()}\nID: ${vmId}\nCost: ₹${totalCost}\n\nDeploying now... You'll get access details soon.`
          );
        }
      });
      
      res.json({
        deploymentId,
        vmId,
        status: 'provisioning',
        cost: totalCost,
        hourlyCost,
        message: 'Instance booked successfully. Deployment in progress.'
      });
      
    } catch (error) {
      logger.error('Instance booking failed:', error);
      res.status(500).json({ error: 'Booking failed', details: error.message });
    }
  });
});

// ==================== DEPLOYMENTS ====================

// List User Deployments
app.get('/api/deployments', authenticate, (req, res) => {
  db.all(
    'SELECT * FROM deployments WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(rows);
    }
  );
});

// Get Deployment Details
app.get('/api/deployments/:id', authenticate, (req, res) => {
  db.get(
    'SELECT * FROM deployments WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.userId],
    (err, row) => {
      if (err || !row) return res.status(404).json({ error: 'Deployment not found' });
      res.json(row);
    }
  );
});

// Delete Deployment (Refund unused)
app.delete('/api/deployments/:id', authenticate, (req, res) => {
  db.get(
    'SELECT * FROM deployments WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.userId],
    (err, deployment) => {
      if (err || !deployment) return res.status(404).json({ error: 'Deployment not found' });
      
      // Calculate refund (unused time)
      const startTime = new Date(deployment.started_at);
      const now = new Date();
      const usedHours = (now - startTime) / (1000 * 60 * 60);
      const usedCost = usedHours * deployment.cost_per_hour;
      const totalPaid = deployment.total_cost || usedCost;
      const refund = Math.max(0, totalPaid - usedCost);
      
      db.run('UPDATE deployments SET status = ?, stopped_at = ? WHERE id = ?', ['deleted', new Date().toISOString(), req.params.id]);
      
      if (refund > 0) {
        db.run('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [refund, req.user.userId]);
        
        const txId = uuidv4();
        db.run(
          'INSERT INTO transactions (id, user_id, type, amount, currency, status, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [txId, req.user.userId, 'refund', refund, 'INR', 'completed', `Refund for ${deployment.name}`]
        );
      }
      
      // Send notification
      db.get('SELECT telegram_chat_id FROM users WHERE id = ?', [req.user.userId], async (err, user) => {
        if (user?.telegram_chat_id) {
          await sendTelegramNotification(
            user.telegram_chat_id,
            `🗑️ Instance Deleted: ${deployment.name}\n\nRefund: ₹${refund.toFixed(2)}\nUsage: ${usedHours.toFixed(2)} hours\n\nRefund added to your wallet.`
          );
        }
      });
      
      res.json({ 
        status: 'deleted', 
        refund,
        usedHours: usedHours.toFixed(2),
        usedCost: usedCost.toFixed(2)
      });
    }
  );
});

// ==================== CLOUDSTACK PROXY ====================
const CLOUDSTACK_CONFIG = {
  apiUrl: process.env.CLOUDSTACK_API_URL || 'https://qa.cloudstack.cloud/client/api',
  apiKey: process.env.CLOUDSTACK_API_KEY,
  secretKey: process.env.CLOUDSTACK_SECRET_KEY,
};

function cloudStackSign(params, secretKey) {
  const crypto = require('crypto');
  const sorted = Object.keys(params).sort().reduce((acc, key) => {
    acc[key.toLowerCase()] = encodeURIComponent(params[key]).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
    return acc;
  }, {});
  const query = Object.keys(sorted).map(k => `${k}=${sorted[k]}`).join('&');
  const sig = crypto.createHmac('sha1', secretKey).update(query.toLowerCase()).digest('base64');
  return sig;
}

app.get('/api/cloudstack-proxy', authenticate, async (req, res) => {
  const { apiKey, secretKey, ...params } = req.query;
  if (!apiKey || !secretKey) {
    return res.status(400).json({ error: 'Missing apiKey or secretKey' });
  }
  try {
    const sig = cloudStackSign(params, secretKey);
    const query = new URLSearchParams({ ...params, apikey: apiKey, signature: sig });
    const url = `${CLOUDSTACK_CONFIG.apiUrl}?${query.toString()}`;
    const response = await axios.get(url, { timeout: 30000 });
    res.json(response.data);
  } catch (error) {
    logger.error('CloudStack proxy error:', error.message);
    res.status(500).json({ error: 'CloudStack API error', details: error.message });
  }
});

app.post('/api/cloudstack-proxy', authenticate, async (req, res) => {
  const { apiKey, secretKey, ...params } = req.body;
  if (!apiKey || !secretKey) {
    return res.status(400).json({ error: 'Missing apiKey or secretKey' });
  }
  try {
    const sig = cloudStackSign(params, secretKey);
    const query = new URLSearchParams({ ...params, apikey: apiKey, signature: sig });
    const url = `${CLOUDSTACK_CONFIG.apiUrl}?${query.toString()}`;
    const response = await axios.get(url, { timeout: 30000 });
    res.json(response.data);
  } catch (error) {
    logger.error('CloudStack proxy error:', error.message);
    res.status(500).json({ error: 'CloudStack API error', details: error.message });
  }
});

// ==================== NETWORKS ====================
app.get('/api/networks', authenticate, async (req, res) => {
  const { apiKey, secretKey } = req.query;
  if (!apiKey || !secretKey) return res.status(400).json({ error: 'Missing CloudStack credentials' });
  try {
    const sig = cloudStackSign({ command: 'listNetworks', response: 'json' }, secretKey);
    const query = new URLSearchParams({ command: 'listNetworks', response: 'json', apikey: apiKey, signature: sig });
    const url = `${CLOUDSTACK_CONFIG.apiUrl}?${query.toString()}`;
    const response = await axios.get(url, { timeout: 30000 });
    res.json(response.data);
  } catch (error) {
    logger.error('List networks error:', error.message);
    res.status(500).json({ error: 'Failed to list networks' });
  }
});

app.post('/api/networks', authenticate, async (req, res) => {
  const { apiKey, secretKey, name, displaytext, networkofferingid, zoneid } = req.body;
  if (!apiKey || !secretKey || !name || !networkofferingid || !zoneid) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const params = { command: 'createNetwork', response: 'json', name, displaytext: displaytext || name, networkofferingid, zoneid };
    const sig = cloudStackSign(params, secretKey);
    const query = new URLSearchParams({ ...params, apikey: apiKey, signature: sig });
    const url = `${CLOUDSTACK_CONFIG.apiUrl}?${query.toString()}`;
    const response = await axios.get(url, { timeout: 30000 });
    res.json(response.data);
  } catch (error) {
    logger.error('Create network error:', error.message);
    res.status(500).json({ error: 'Failed to create network' });
  }
});

app.delete('/api/networks/:id', authenticate, async (req, res) => {
  const { apiKey, secretKey } = req.query;
  if (!apiKey || !secretKey) return res.status(400).json({ error: 'Missing CloudStack credentials' });
  try {
    const params = { command: 'deleteNetwork', response: 'json', id: req.params.id };
    const sig = cloudStackSign(params, secretKey);
    const query = new URLSearchParams({ ...params, apikey: apiKey, signature: sig });
    const url = `${CLOUDSTACK_CONFIG.apiUrl}?${query.toString()}`;
    const response = await axios.get(url, { timeout: 30000 });
    res.json(response.data);
  } catch (error) {
    logger.error('Delete network error:', error.message);
    res.status(500).json({ error: 'Failed to delete network' });
  }
});

// ==================== FIREWALL ====================
app.get('/api/firewall', authenticate, async (req, res) => {
  const { apiKey, secretKey, ipaddressid } = req.query;
  if (!apiKey || !secretKey) return res.status(400).json({ error: 'Missing CloudStack credentials' });
  try {
    const params = { command: 'listFirewallRules', response: 'json' };
    if (ipaddressid) params.ipaddressid = ipaddressid;
    const sig = cloudStackSign(params, secretKey);
    const query = new URLSearchParams({ ...params, apikey: apiKey, signature: sig });
    const url = `${CLOUDSTACK_CONFIG.apiUrl}?${query.toString()}`;
    const response = await axios.get(url, { timeout: 30000 });
    res.json(response.data);
  } catch (error) {
    logger.error('List firewall rules error:', error.message);
    res.status(500).json({ error: 'Failed to list firewall rules' });
  }
});

app.post('/api/firewall', authenticate, async (req, res) => {
  const { apiKey, secretKey, ipaddressid, protocol, startport, endport, cidrlist } = req.body;
  if (!apiKey || !secretKey || !ipaddressid || !protocol || !startport) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const params = { command: 'createFirewallRule', response: 'json', ipaddressid, protocol, startport, endport: endport || startport, cidrlist: cidrlist || '0.0.0.0/0' };
    const sig = cloudStackSign(params, secretKey);
    const query = new URLSearchParams({ ...params, apikey: apiKey, signature: sig });
    const url = `${CLOUDSTACK_CONFIG.apiUrl}?${query.toString()}`;
    const response = await axios.get(url, { timeout: 30000 });
    res.json(response.data);
  } catch (error) {
    logger.error('Create firewall rule error:', error.message);
    res.status(500).json({ error: 'Failed to create firewall rule' });
  }
});

app.delete('/api/firewall/:id', authenticate, async (req, res) => {
  const { apiKey, secretKey } = req.query;
  if (!apiKey || !secretKey) return res.status(400).json({ error: 'Missing CloudStack credentials' });
  try {
    const params = { command: 'deleteFirewallRule', response: 'json', id: req.params.id };
    const sig = cloudStackSign(params, secretKey);
    const query = new URLSearchParams({ ...params, apikey: apiKey, signature: sig });
    const url = `${CLOUDSTACK_CONFIG.apiUrl}?${query.toString()}`;
    const response = await axios.get(url, { timeout: 30000 });
    res.json(response.data);
  } catch (error) {
    logger.error('Delete firewall rule error:', error.message);
    res.status(500).json({ error: 'Failed to delete firewall rule' });
  }
});

// ==================== PUBLIC IPs ====================
app.get('/api/publicips', authenticate, async (req, res) => {
  const { apiKey, secretKey } = req.query;
  if (!apiKey || !secretKey) return res.status(400).json({ error: 'Missing CloudStack credentials' });
  try {
    const sig = cloudStackSign({ command: 'listPublicIpAddresses', response: 'json', allocatedonly: 'false' }, secretKey);
    const query = new URLSearchParams({ command: 'listPublicIpAddresses', response: 'json', allocatedonly: 'false', apikey: apiKey, signature: sig });
    const url = `${CLOUDSTACK_CONFIG.apiUrl}?${query.toString()}`;
    const response = await axios.get(url, { timeout: 30000 });
    res.json(response.data);
  } catch (error) {
    logger.error('List public IPs error:', error.message);
    res.status(500).json({ error: 'Failed to list public IPs' });
  }
});

app.post('/api/publicips', authenticate, async (req, res) => {
  const { apiKey, secretKey, zoneid } = req.body;
  if (!apiKey || !secretKey || !zoneid) return res.status(400).json({ error: 'Missing required fields' });
  try {
    const params = { command: 'associateIpAddress', response: 'json', zoneid };
    const sig = cloudStackSign(params, secretKey);
    const query = new URLSearchParams({ ...params, apikey: apiKey, signature: sig });
    const url = `${CLOUDSTACK_CONFIG.apiUrl}?${query.toString()}`;
    const response = await axios.get(url, { timeout: 30000 });
    res.json(response.data);
  } catch (error) {
    logger.error('Associate IP error:', error.message);
    res.status(500).json({ error: 'Failed to associate IP' });
  }
});

// ==================== PORT FORWARDING ====================
app.get('/api/portforwarding', authenticate, async (req, res) => {
  const { apiKey, secretKey, ipaddressid } = req.query;
  if (!apiKey || !secretKey) return res.status(400).json({ error: 'Missing CloudStack credentials' });
  try {
    const params = { command: 'listPortForwardingRules', response: 'json' };
    if (ipaddressid) params.ipaddressid = ipaddressid;
    const sig = cloudStackSign(params, secretKey);
    const query = new URLSearchParams({ ...params, apikey: apiKey, signature: sig });
    const url = `${CLOUDSTACK_CONFIG.apiUrl}?${query.toString()}`;
    const response = await axios.get(url, { timeout: 30000 });
    res.json(response.data);
  } catch (error) {
    logger.error('List port forwarding error:', error.message);
    res.status(500).json({ error: 'Failed to list port forwarding rules' });
  }
});

app.post('/api/portforwarding', authenticate, async (req, res) => {
  const { apiKey, secretKey, ipaddressid, virtualmachineid, privateport, publicport, protocol } = req.body;
  if (!apiKey || !secretKey || !ipaddressid || !virtualmachineid || !privateport || !publicport) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const params = { command: 'createPortForwardingRule', response: 'json', ipaddressid, virtualmachineid, privateport, publicport: publicport || privateport, protocol: protocol || 'tcp' };
    const sig = cloudStackSign(params, secretKey);
    const query = new URLSearchParams({ ...params, apikey: apiKey, signature: sig });
    const url = `${CLOUDSTACK_CONFIG.apiUrl}?${query.toString()}`;
    const response = await axios.get(url, { timeout: 30000 });
    res.json(response.data);
  } catch (error) {
    logger.error('Create port forwarding error:', error.message);
    res.status(500).json({ error: 'Failed to create port forwarding rule' });
  }
});

app.delete('/api/portforwarding/:id', authenticate, async (req, res) => {
  const { apiKey, secretKey } = req.query;
  if (!apiKey || !secretKey) return res.status(400).json({ error: 'Missing CloudStack credentials' });
  try {
    const params = { command: 'deletePortForwardingRule', response: 'json', id: req.params.id };
    const sig = cloudStackSign(params, secretKey);
    const query = new URLSearchParams({ ...params, apikey: apiKey, signature: sig });
    const url = `${CLOUDSTACK_CONFIG.apiUrl}?${query.toString()}`;
    const response = await axios.get(url, { timeout: 30000 });
    res.json(response.data);
  } catch (error) {
    logger.error('Delete port forwarding error:', error.message);
    res.status(500).json({ error: 'Failed to delete port forwarding rule' });
  }
});

// ==================== USER KEYS ====================
app.get('/api/user/cloudstack-keys', authenticate, (req, res) => {
  res.json({
    apiKey: process.env.CLOUDSTACK_API_KEY || '',
    secretKey: process.env.CLOUDSTACK_SECRET_KEY || ''
  });
});

// ==================== PAYMENTS ====================
app.post('/api/payments/razorpay/order', authenticate, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount < 1) return res.status(400).json({ error: 'Invalid amount' });
  try {
    const Razorpay = require('razorpay');
    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    const order = await rzp.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `wallet_${req.user.userId}_${Date.now()}`
    });
    res.json({ orderId: order.id, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    logger.error('Razorpay order error:', error.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.post('/api/payments/razorpay/verify', authenticate, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
  try {
    const crypto = require('crypto');
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
    if (expected === razorpay_signature) {
      db.run('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [amount, req.user.userId]);
      const txId = uuidv4();
      db.run('INSERT INTO transactions (id, user_id, type, amount, currency, status, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [txId, req.user.userId, 'deposit', amount, 'INR', 'completed', 'Razorpay wallet top-up']);
      res.json({ ok: true, credited: amount });
    } else {
      res.status(400).json({ error: 'Invalid signature' });
    }
  } catch (error) {
    logger.error('Razorpay verify error:', error.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

app.post('/api/payments/upi/initiate', authenticate, (req, res) => {
  const { amount } = req.body;
  const txnRef = `UPI${Date.now()}`;
  res.json({
    upiId: process.env.UPI_ID || 'promptcloud@upi',
    upiLink: `upi://pay?pa=${process.env.UPI_ID || 'promptcloud@upi'}&pn=PromptCloud&am=${amount}&tr=${txnRef}&cu=INR`,
    txnRef
  });
});

app.get('/api/payments/crypto/address', authenticate, (req, res) => {
  const coin = req.query.coin || 'usdt_trc20';
  const addresses = {
    usdt_trc20: { address: process.env.WALLET_USDT_TRC20 || '', network: 'TRC20' },
    btc: { address: process.env.WALLET_BTC || '', network: 'Bitcoin' },
    eth: { address: process.env.WALLET_ETH || '', network: 'ERC20' },
    xdc: { address: process.env.WALLET_XDC || '', network: 'XDC Network' }
  };
  res.json(addresses[coin] || addresses.usdt_trc20);
});

// ==================== PROXMOX MIDDLEMAN ====================

class ProxmoxMiddleman {
  constructor() {
    this.baseURL = PROXMOX_CONFIG.host;
    this.headers = {
      'Authorization': `PVEAPIToken=${PROXMOX_CONFIG.token}`,
      'Content-Type': 'application/json'
    };
  }

  async deployVM(config) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api2/json/nodes/${PROXMOX_CONFIG.node}/qemu`,
        {
          vmid: config.vmid,
          name: config.name,
          cores: config.cores,
          memory: config.memory,
          storage: config.storage,
          ostemplate: config.ostemplate
        },
        { 
          headers: this.headers, 
          httpsAgent: new https.Agent({ rejectUnauthorized: false }) 
        }
      );
      return response.data;
    } catch (error) {
      logger.error('Proxmox VM deploy failed:', error.message);
      throw error;
    }
  }

  async deployLXC(config) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api2/json/nodes/${PROXMOX_CONFIG.node}/lxc`,
        {
          vmid: config.vmid,
          ostemplate: config.ostemplate,
          hostname: config.hostname,
          cores: config.cores,
          memory: config.memory,
          rootfs: config.storage,
          password: config.password
        },
        { 
          headers: this.headers, 
          httpsAgent: new https.Agent({ rejectUnauthorized: false }) 
        }
      );
      return response.data;
    } catch (error) {
      logger.error('Proxmox LXC deploy failed:', error.message);
      throw error;
    }
  }

  async getVMStatus(vmid) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api2/json/nodes/${PROXMOX_CONFIG.node}/qemu/${vmid}/status/current`,
        { 
          headers: this.headers, 
          httpsAgent: new https.Agent({ rejectUnauthorized: false }) 
        }
      );
      return response.data.data;
    } catch (error) {
      logger.error('Proxmox VM status failed:', error.message);
      throw error;
    }
  }
}

const proxmox = new ProxmoxMiddleman();

// ==================== HEALTH ====================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'PromptCloud API',
    version: '2.0.0',
    features: ['auth', 'wallet', 'instances', 'deployments', 'telegram'],
    timestamp: new Date().toISOString()
  });
});

const POLLING_INTERVAL = 5000; // Check every 5 seconds
let lastUpdateId = 0;

// ==================== POLLING MODE ====================
async function pollTelegramMessages() {
  try {
    const response = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`,
      {
        params: {
          offset: lastUpdateId + 1,
          limit: 10,
        },
      }
    );

    if (response.data.ok && response.data.result.length > 0) {
      for (const update of response.data.result) {
        lastUpdateId = update.update_id;
        
        if (update.message && update.message.text === '/start') {
          const chatId = update.message.chat.id;
          const telegramUsername = update.message.chat.username;
          
          // Find user by telegram username
          db.get('SELECT * FROM users WHERE telegram_username = ?', [telegramUsername], (err, user) => {
            if (user) {
              db.run(
                'UPDATE users SET telegram_chat_id = ? WHERE id = ?',
                [chatId, user.id],
                (err) => {
                  if (!err) {
                    sendTelegramNotification(chatId, '✅ Your Telegram account is now linked to PromptCloud! You will receive OTPs here.');
                  }
                }
              );
            } else {
              sendTelegramNotification(chatId, '👋 Welcome to PromptCloud! Please register at https://promptcloud.io/register first, then come back and send /start again.');
            }
          });
        }
      }
    }
  } catch (error) {
    logger.error(`Polling error: ${error.message}`);
  }
}

// Start polling only when the token is real enough for Telegram to accept.
if (isTelegramConfigured) {
  setInterval(pollTelegramMessages, POLLING_INTERVAL);
  logger.info('Telegram polling started (every 5 seconds)');
} else {
  logger.warn('Telegram polling disabled: configure TELEGRAM_BOT_TOKEN in api/.env');
}

// ==================== START ====================
app.listen(PORT, () => {
  logger.info(`PromptCloud API v2.0.0 running on port ${PORT}`);
  logger.info(`Telegram Bot: ${isTelegramConfigured ? 'Configured' : 'NOT CONFIGURED'}`);
  logger.info(`Mode: ${isTelegramConfigured ? 'Polling (no webhook needed)' : 'API only'}`);
  logger.info(`Proxmox: ${PROXMOX_CONFIG.host}`);
});

module.exports = app;
