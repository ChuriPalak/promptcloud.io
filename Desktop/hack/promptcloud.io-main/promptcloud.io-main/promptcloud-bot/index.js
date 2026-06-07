// index.js — PromptCloud Telegram Bot
// Wires together: auth, VM control, wallet/payments, alert polling
require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const store       = require('./utils/store');
const cs          = require('./utils/cloudstack');
const { escape, mainMenu } = require('./utils/tg');

// ── Init bot ─────────────────────────────────────────────
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) { console.error('❌ Missing TELEGRAM_BOT_TOKEN in .env'); process.exit(1); }

const bot = new TelegramBot(TOKEN, { polling: true });
console.log('🤖 PromptCloud bot starting…');

// ── Load handlers ─────────────────────────────────────────
const authHandler   = require('./handlers/auth');
const vmHandler     = require('./handlers/vm');
const walletHandler = require('./handlers/wallet');

authHandler.register(bot);
const vmHandlers     = vmHandler.register(bot);
const walletHandlers = walletHandler.register(bot);

// ── /menu command ─────────────────────────────────────────
bot.onText(/\/menu/, (msg) => {
  if (!store.isVerified(msg.from.id)) {
    return bot.sendMessage(msg.chat.id, '🔒 Please /start and verify your account first.');
  }
  bot.sendMessage(msg.chat.id, '🏠 *Main Menu*', { parse_mode: 'MarkdownV2', reply_markup: mainMenu() });
});

// ── /balance command ──────────────────────────────────────
bot.onText(/\/balance/, (msg) => {
  const tid = msg.from.id;
  if (!store.isVerified(tid)) return bot.sendMessage(msg.chat.id, '🔒 Please /start and verify first.');
  const bal = store.getBalance(tid);
  bot.sendMessage(msg.chat.id, `💰 Your wallet balance: *₹${bal.toFixed(2)}*`, {
    parse_mode: 'MarkdownV2',
    reply_markup: { inline_keyboard: [[{ text: '➕ Top Up', callback_data: 'topup_home' }]] }
  });
});

// ── /vms command ──────────────────────────────────────────
bot.onText(/\/vms/, (msg) => {
  if (!store.isVerified(msg.from.id)) return bot.sendMessage(msg.chat.id, '🔒 Please /start and verify first.');
  vmHandlers.handleCallback(msg.chat.id, msg.from.id, 'list_vms');
});

// ── Callback query router ─────────────────────────────────
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const tid    = query.from.id;
  const data   = query.data;

  bot.answerCallbackQuery(query.id).catch(() => {});

  // Main menu
  if (data === 'main_menu') {
    if (!store.isVerified(tid)) return bot.sendMessage(chatId, '🔒 Please /start and verify first.');
    return bot.sendMessage(chatId, '🏠 *Main Menu*', { parse_mode: 'MarkdownV2', reply_markup: mainMenu() });
  }

  // Sign out
  if (data === 'signout') {
    store.clearSession(tid);
    return bot.sendMessage(chatId, '👋 Signed out successfully\\. Send /start to log in again\\.', { parse_mode: 'MarkdownV2' });
  }

  // Route to wallet handler first, then VM handler
  const walletHandled = walletHandlers.handleCallback(chatId, tid, data);
  if (walletHandled !== false) return;
  vmHandlers.handleCallback(chatId, tid, data);
});

// ── Text message router ───────────────────────────────────
// Passes non-command text to handlers that expect freeform input
bot.on('message', (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  const chatId = msg.chat.id;
  const tid    = msg.from.id;
  const text   = msg.text.trim();

  // Auth handler gets first pick (email + OTP entry)
  // (registered inside auth.js directly)

  // Custom top-up amount
  if (walletHandlers.handleCustomAmountText(chatId, tid, text)) return;

  // VM deploy name entry
  if (vmHandlers.handleDeployNameText(chatId, text)) return;
});

// ── VM alert poller ───────────────────────────────────────
let knownStates = {};
const POLL_MS   = (parseInt(process.env.POLL_INTERVAL_SECONDS || '60', 10)) * 1000;

async function pollAlerts() {
  try {
    const vms = await cs.listVMs();
    for (const vm of vms) {
      const prev = knownStates[vm.id];
      if (prev && prev !== vm.state) {
        // Notify all verified sessions
        for (const [tid, sess] of Object.entries(store._getAll())) {
          if (sess.verified) {
            bot.sendMessage(parseInt(tid), 
              `🔔 *VM Alert*\n\n${escape(vm.name)} changed state:\n*${escape(prev)}* → *${escape(vm.state)}*`,
              { parse_mode: 'MarkdownV2' }
            ).catch(() => {});
          }
        }
      }
      knownStates[vm.id] = vm.state;
    }
  } catch (e) {
    // Silent — CloudStack may be temporarily unavailable
  }
}

setInterval(pollAlerts, POLL_MS);
pollAlerts();

console.log(`✅ Bot running. Polling VM alerts every ${POLL_MS / 1000}s.`);
console.log('📱 Send /start to your bot on Telegram to begin.');
