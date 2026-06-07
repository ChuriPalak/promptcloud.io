// payments/index.js — pluggable payment methods
// To add a new crypto: just add an entry to CRYPTO_WALLETS below and it auto-appears in the bot.

const UPI_ID   = process.env.UPI_ID   || 'yourname@upi';
const UPI_NAME = process.env.UPI_NAME || 'PromptCloud';

const fs   = require('fs');
const path = require('path');

// ── Crypto wallet registry ────────────────────────────────
// Add new coins here. The bot will automatically show them as options.
const CRYPTO_WALLETS = [
  {
    id:      'usdt_trc20',
    label:   'USDT (TRC20 / Tron)',
    emoji:   '💵',
    address: process.env.WALLET_USDT_TRC20,
    network: 'Tron (TRC20)',
    note:    'Send only USDT on the TRC20 network. Other networks will result in loss of funds.',
  },
  {
    id:      'btc',
    label:   'Bitcoin (BTC)',
    emoji:   '₿',
    address: process.env.WALLET_BTC,
    network: 'Bitcoin Mainnet',
    note:    'Send only BTC. Minimum 1 confirmation required.',
  },
  {
    id:      'xdc',
    label:   'XDC Network (XDC)',
    emoji:   '🔷',
    address: process.env.WALLET_XDC,
    network: 'XDC Mainnet',
    note:    'Send only XDC on XDC Mainnet. Minimum 1 confirmation required.',
  },
  // ── Add more coins here ──────────────────────────────────
  // {
  //   id:      'eth',
  //   label:   'Ethereum (ETH)',
  //   emoji:   'Ξ',
  //   address: process.env.WALLET_ETH,
  //   network: 'Ethereum Mainnet',
  //   note:    'Send only ETH on Ethereum mainnet.',
  // },
  // {
  //   id:      'sol',
  //   label:   'Solana (SOL)',
  //   emoji:   '◎',
  //   address: process.env.WALLET_SOL,
  //   network: 'Solana',
  //   note:    'Send only SOL.',
  // },
];

// ── UPI ──────────────────────────────────────────────────

function buildUPILink(amount) {
  // Standard UPI deep-link (works with GPay, PhonePe, Paytm, etc.)
  return `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${amount}&cu=INR&tn=PromptCloud+Wallet+TopUp`;
}

function getUPIDetails(amount) {
  return {
    upiId:   UPI_ID,
    name:    UPI_NAME,
    amount,
    deepLink: buildUPILink(amount),
  };
}

function getUPIQRPath() {
  // Look for QR code image in project root or specified path
  const possiblePaths = [
    process.env.UPI_QR_PATH,
    path.join(__dirname, '..', 'upi-qr.png'),
    path.join(__dirname, '..', 'upi-qr.jpg'),
    path.join(__dirname, '..', 'upi-qr.jpeg'),
    path.join(__dirname, '..', 'assets', 'upi-qr.png'),
    path.join(__dirname, '..', 'assets', 'upi-qr.jpg'),
  ];
  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

// ── Crypto ───────────────────────────────────────────────

function getCryptoWallets() {
  return CRYPTO_WALLETS.filter(w => w.address); // only show configured wallets
}

function getWallet(id) {
  return CRYPTO_WALLETS.find(w => w.id === id) || null;
}

// ── Top-up amounts (INR) ─────────────────────────────────
const TOP_UP_AMOUNTS = [100, 250, 500, 1000, 2000, 5000];

module.exports = { getUPIDetails, getUPIQRPath, getCryptoWallets, getWallet, TOP_UP_AMOUNTS, UPI_ID, UPI_NAME };
