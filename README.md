# PromptCloud.io

CloudStack VM provisioning platform with Next.js frontend, Express + SQLite backend, and Telegram bot integration.

## Architecture

| Layer | Tech | Path |
|-------|------|------|
| Frontend | Next.js 16 + React 19 + Tailwind | `/` |
| Backend API | Express + SQLite3 + JWT | `/promptcloud-bot/server.js` |
| Telegram Bot | node-telegram-bot-api | `/promptcloud-bot/index.js` |

## Prerequisites

- Node.js 22+ (backend must run from WSL — native modules)
- npm or pnpm

## Environment Variables

### Frontend (`/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Backend (`/promptcloud-bot/.env`)
```
TELEGRAM_BOT_TOKEN=your_token
JWT_SECRET=your_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_app_password
ADMIN_CHAT_ID=your_telegram_chat_id
PORT=3000
```

## Quick Start

```bash
# 1. Start backend (from WSL)
cd promptcloud-bot
npm install
npm start          # runs bot + api server on :3000

# 2. Start frontend (from Windows CMD or WSL)
npm install
npm run dev        # runs on :3002
```

## Available Scripts

**Frontend:**
- `npm run dev` — dev server on port 3002
- `npm run build` — production build
- `npm run start` — production server

**Backend:**
- `npm start` — bot + api server together
- `npm run bot` — telegram bot only
- `npm run server` — api server only

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | JWT login |
| POST | `/api/auth/register` | User registration |
| GET | `/api/vms` | List VMs |
| POST | `/api/vms/deploy` | Deploy new VM |
| GET | `/api/services` | CloudStack service offerings |
| GET | `/api/templates` | CloudStack templates |
| GET | `/api/zones` | CloudStack zones |

## CloudStack Integration

Connects to `qa.cloudstack.cloud` for real VM provisioning. All VM operations go through the CloudStack API.
