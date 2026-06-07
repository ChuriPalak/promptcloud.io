# PromptCloud API - Proxmox Middleman Platform

## What is PromptCloud?

**PromptCloud is the middleman between you and Proxmox providers.**

Instead of directly managing complex Proxmox infrastructure, you chat with PromptCloud via WhatsApp, Telegram, or Slack. We handle the technical details, manage payments securely, and connect you with Proxmox providers.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   You       │────▶│  PromptCloud │────▶│ Proxmox         │
│  (Tenant)   │     │  (Middleman) │     │  (Provider)     │
│             │◀────│              │◀────│                 │
│ WhatsApp/   │     │ • AI Chat    │     │ • VMs           │
│ Telegram/   │     │ • Escrow     │     │ • LXC           │
│ Slack       │     │ • Billing    │     │ • Storage       │
└─────────────┘     │ • Monitoring │     └─────────────────┘
                    └──────────────┘
```

## How It Works

### 1. **Deposit Funds**
- Add money via UPI (Google Pay, PhonePe, Paytm) or XDC tokens
- Funds stored securely in your PromptCloud wallet

### 2. **Chat to Deploy**
- Send: "Deploy Ubuntu VM with 4GB RAM"
- PromptCloud AI understands and processes your request

### 3. **Escrow Protection**
- Funds held in escrow until VM is successfully deployed
- If deployment fails, automatic refund
- No provider can run away with your money

### 4. **Proxmox Deployment**
- PromptCloud calls the provider's Proxmox API using secure credentials
- Provider never sees your payment details
- You never see provider's API keys

### 5. **Metered Billing**
- Pay only for seconds of actual usage
- Billing updates in real-time
- Auto-stop if balance runs low

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/balance` - Check wallet balance

### Deployment
- `POST /api/deploy/vm` - Deploy Virtual Machine
- `POST /api/deploy/lxc` - Deploy LXC Container
- `GET /api/deployments` - List your deployments
- `GET /api/deployments/:id` - Get deployment status
- `POST /api/deployments/:id/stop` - Stop VM
- `DELETE /api/deployments/:id` - Delete VM

### Billing
- `POST /api/deposit` - Add funds
- `GET /api/billing` - Usage report and costs

### Admin
- `GET /api/admin/cluster` - Proxmox cluster status (admin only)

## Security

- **API Keys Never Exposed**: Your Proxmox API token is stored securely server-side
- **Escrow Protection**: Funds held until deployment succeeds
- **JWT Authentication**: All API calls authenticated
- **Encrypted Storage**: Sensitive credentials encrypted at rest
- **Audit Logging**: All actions logged for transparency

## Payment Flow

```
User Deposit (UPI/XDC) 
    ↓
PromptCloud Wallet
    ↓
Deployment Request
    ↓
Escrow Hold (1 hour min)
    ↓
Proxmox Deployment
    ↓
Release Funds to Provider (minus 10% fee)
    ↓
Refund Unused Funds to User
```

## Provider Model

### For Providers (Proxmox Hosts)
1. Register your Proxmox server
2. Set your pricing (per hour for CPU, RAM, Storage)
3. Connect your API token (encrypted)
4. Earn money when tenants deploy on your servers
5. Get paid automatically via XDC or bank transfer

### For Tenants (Users)
1. Deposit funds via UPI or crypto
2. Chat to deploy VMs/LXC
3. Pay only for what you use
4. Get refunds for failed deployments
5. Scale up/down instantly

## Technology Stack

- **Backend**: Node.js + Express
- **Database**: SQLite (can upgrade to PostgreSQL)
- **Authentication**: JWT + bcrypt
- **Proxmox API**: REST API with token auth
- **Payment**: UPI (Razorpay/Cashfree) + XDC blockchain
- **Chat**: WhatsApp Business API, Telegram Bot API, Slack

## Getting Started

### 1. Install Dependencies
```bash
cd api
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your Proxmox credentials
```

### 3. Start Server
```bash
npm run dev
```

### 4. Test API
```bash
curl http://localhost:3001/api/health
```

## Configuration

### .env File
```env
PROXMOX_HOST=https://your-proxmox-server:8006
PROXMOX_API_TOKEN=YOUR_PROXMOX_TOKEN
PROXMOX_NODE=pve
JWT_SECRET=your-secret-key
PORT=3001
```

## Example Usage

### Deploy a VM
```bash
curl -X POST http://localhost:3001/api/deploy/vm \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-ubuntu-vm",
    "cores": 2,
    "memory": 4096,
    "storage": 20,
    "os": "ubuntu-22.04"
  }'
```

### Response
```json
{
  "deploymentId": "dep-123",
  "vmId": 105,
  "status": "running",
  "costPerHour": 0.15,
  "escrowAmount": 0.15,
  "proxmoxTask": { "UPID": "UPID:..." }
}
```

## Billing Model

| Resource | Price (INR/hour) |
|----------|-----------------|
| 1 vCPU | ₹0.05 |
| 1 GB RAM | ₹0.02 |
| 1 GB Storage | ₹0.01 |

**Example**: 2 vCPU, 4GB RAM, 20GB VM = ₹0.05×2 + ₹0.02×4 + ₹0.01×20 = ₹0.30/hour

## License

MIT - PromptCloud Team
