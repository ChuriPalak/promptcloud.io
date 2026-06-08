# PromptCloud - Project Overview

## What is PromptCloud?

PromptCloud is a **cloud infrastructure marketplace** that lets users deploy VMs, manage volumes, and handle databases through both a **Telegram bot** and a **web dashboard**. Think of it as a simplified Proxmox/CloudStack wrapper with wallet-based billing.

---

## Architecture (3 Parts)

### 1. Backend API (`/api/` folder, port 3001)
- **Express.js** server
- **SQLite** database for users, deployments, transactions, pending payments
- **CloudStack API** integration for actual VM provisioning
- **JWT authentication** with bcrypt password hashing
- Endpoints for: auth, wallet, payments (Razorpay/UPI/Crypto), instances, deployments

### 2. Telegram Bot (`/promptcloud-bot/` folder)
- **Node.js** bot using `node-telegram-bot-api`
- Same SQLite database as backend (shared)
- Commands: `/deploy`, `/status`, `/stop`, `/destroy`, `/topup`, `/balance`, `/wallet`, etc.
- **OTP-based auth** via email (SMTP/SendGrid)
- **Payment flows**: Razorpay orders, UPI QR codes, crypto wallets
- Admin commands for verifying pending payments

### 3. Frontend (`/src/` folder, port 3002)
- **Next.js 16** + React 19 + TypeScript
- **Tailwind CSS** with dark purple theme
- Pages:
  - `/login` - Email/password + OTP verification
  - `/register` - NEW: OTP-based signup (email → OTP → create account → auto-login)
  - `/dashboard` - VM management, wallet, deployments
  - `/wallet` - Balance, top-up, transactions

---

## Authentication Flow

### Login (Existing User)
1. User enters email + password
2. Backend validates password with bcrypt
3. If account not verified → send OTP → verify → issue JWT
4. If verified → issue JWT immediately
5. Store token in `localStorage` as `promptcloud_token`

### Signup (New User) — NEWLY IMPLEMENTED
1. User fills form: name, email, password, phone, company (optional)
2. Frontend calls `POST /api/auth/register-send-otp` with email
3. Backend checks email not registered → generates 6-digit OTP → sends via email
4. User enters OTP
5. Frontend calls `POST /api/auth/register-verify` with all fields + OTP
6. Backend verifies OTP → hashes password → creates user in SQLite → issues JWT
7. Auto-redirect to `/dashboard`

---

## Database Schema (SQLite)

```sql
users:
  id, email, password, name, company_name, phone,
  telegram_username, telegram_chat_id,
  wallet_balance, wallet_balance_xdc,
  is_verified, created_at

deployments:
  id, user_id, vm_id, type, name, status,
  cpu_cores, ram_mb, storage_gb, os,
  cost_per_hour, started_at, stopped_at, total_cost

transactions:
  id, user_id, type, amount, currency, status, description, created_at

pending_payments:
  id, user_id, telegram_id, amount, currency,
  utr_number, status, screenshot_path, created_at, verified_at, verified_by
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register-send-otp` | Send OTP to email for signup |
| POST | `/api/auth/register-verify` | Verify OTP + create account |
| POST | `/api/auth/send-otp` | Send OTP to existing user |
| POST | `/api/auth/verify-otp` | Verify OTP and login |
| POST | `/api/auth/login` | Email + password login |
| GET | `/api/auth/profile` | Get current user profile |

### Wallet & Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wallet` | Get wallet balance |
| GET | `/api/wallet/transactions` | Get transaction history |
| POST | `/api/wallet/deposit` | Manual deposit |
| POST | `/api/payments/razorpay/order` | Create Razorpay order |
| POST | `/api/payments/razorpay/verify` | Verify Razorpay payment |
| POST | `/api/payments/upi/initiate` | Get UPI details |
| POST | `/api/payments/upi/confirm` | Confirm UPI payment |
| GET | `/api/payments/crypto/address` | Get crypto wallet address |
| POST | `/api/payments/crypto/notify` | Notify crypto payment |

### Instances & Deployments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/instances` | List available VM types |
| POST | `/api/instances/price` | Calculate price |
| POST | `/api/instances/book` | Book/deploy instance |
| GET | `/api/deployments` | List user deployments |
| GET | `/api/deployments/:id` | Get deployment details |
| DELETE | `/api/deployments/:id` | Delete deployment |

---

## Environment Variables (`.env`)

```env
# Telegram
TELEGRAM_BOT_TOKEN=...

# CloudStack
CLOUDSTACK_API_URL=...
CLOUDSTACK_API_KEY=...
CLOUDSTACK_SECRET_KEY=...

# Email (SMTP)
SMTP_HOST=smtp.ethereal.email  # or smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...

# Razorpay
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...

# UPI
UPI_ID=gaikwadharsh1828@okhdfcbank
UPI_NAME=Harsh Gaikwad

# Admin
ADMIN_TELEGRAM_ID=...

# Crypto Wallets
WALLET_USDT_TRC20=...
WALLET_BTC=...

# App
OTP_EXPIRY_MINUTES=10
POLL_INTERVAL_SECONDS=60

# Server
PORT=3000
JWT_SECRET=change_this_to_a_long_random_string
```

---

## How to Run

### Backend (port 3001)
```bash
cd api
npm install
node server.js
```

### Telegram Bot (port 3000, shared with web API)
```bash
cd promptcloud-bot
npm install
npm start        # Runs both bot + web server
npm run bot      # Bot only
npm run server   # Web server only
```

### Frontend (port 3002)
```bash
npm install
npm run dev      # or run dev.bat on Windows
```

---

## Current Status (June 8, 2026)

✅ Backend API with full auth, wallet, payments, deployments
✅ Telegram bot with OTP auth, VM commands, payment flows
✅ Next.js frontend with login, dashboard, wallet
✅ **NEW: OTP-based signup page at `/register`**
✅ SQLite database with users, deployments, transactions
✅ Razorpay test integration
✅ UPI QR code payments
✅ Email OTP via Ethereal (test) / SendGrid (production)

---

## Key Files

| File | Purpose |
|------|---------|
| `promptcloud-bot/server.js` | Express API server |
| `promptcloud-bot/index.js` | Telegram bot |
| `promptcloud-bot/utils/store.js` | SQLite database + in-memory sessions/OTPs |
| `promptcloud-bot/utils/mailer.js` | Email OTP sending |
| `promptcloud-bot/handlers/auth.js` | Bot auth flow |
| `promptcloud-bot/handlers/vm.js` | VM deployment handlers |
| `promptcloud-bot/handlers/wallet.js` | Wallet/payment handlers |
| `src/app/login/page.tsx` | Login page |
| `src/app/register/page.tsx` | **Signup page with OTP** |
| `src/app/dashboard/page.tsx` | Dashboard |
| `api/server.js` | Separate backend (older) |

---

## Notes for Claude

1. **No Web3 wallet tools** — This is an RPC infrastructure dashboard, NOT a wallet app. Auth is email/password + JWT only.
2. **Backend runs in WSL** (port 3001), **frontend in Windows** (port 3002). Don't mix `node_modules` between them.
3. **SQLite is shared** between bot and web server — they run in the same process.
4. **OTP is email-only** for now. SMS/phone OTP is planned but not implemented.
5. **Razorpay is in test mode** — use test credentials for payments.
6. **CloudStack** is the actual VM provider — all deployments go through their API.
