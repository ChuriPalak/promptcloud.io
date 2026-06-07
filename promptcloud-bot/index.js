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
const volumeHandler = require('./handlers/volume');
const walletHandler = require('./handlers/wallet');
const billing       = require('./utils/billing');

authHandler.register(bot);
const vmHandlers     = vmHandler.register(bot);
const volumeHandlers = volumeHandler.register(bot);
const walletHandlers = walletHandler.register(bot);

// ── /menu command ─────────────────────────────────────────
bot.onText(/\/menu/, (msg) => {
  if (!store.isVerified(msg.from.id)) {
    return bot.sendMessage(msg.chat.id, '🔒 Please /start and verify your account first.');
  }
  bot.sendMessage(msg.chat.id, '🏠 <b>Main Menu</b>', { parse_mode: 'HTML', reply_markup: mainMenu() });
});

// ── /deploy command ───────────────────────────────────────
bot.onText(/\/deploy/, (msg) => {
  if (!store.isVerified(msg.from.id)) return bot.sendMessage(msg.chat.id, '🔒 Please /start and verify first.');
  vmHandlers.handleCallback(msg.chat.id, msg.from.id, 'deploy_start');
});

// ── /wallet command ───────────────────────────────────────
bot.onText(/\/wallet/, (msg) => {
  if (!store.isVerified(msg.from.id)) return bot.sendMessage(msg.chat.id, '🔒 Please /start and verify first.');
  walletHandlers.handleCallback(msg.chat.id, msg.from.id, 'wallet_home');
});

// ── /history command ──────────────────────────────────────
bot.onText(/\/history/, (msg) => {
  if (!store.isVerified(msg.from.id)) return bot.sendMessage(msg.chat.id, '🔒 Please /start and verify first.');
  walletHandlers.handleCallback(msg.chat.id, msg.from.id, 'tx_history');
});

// ── /volumes command ──────────────────────────────────────
bot.onText(/\/volumes/, (msg) => {
  if (!store.isVerified(msg.from.id)) return bot.sendMessage(msg.chat.id, '🔒 Please /start and verify first.');
  volumeHandlers.handleCallback(msg.chat.id, msg.from.id, 'vol_list');
});

// ── /createvol command ────────────────────────────────────
bot.onText(/\/createvol/, (msg) => {
  if (!store.isVerified(msg.from.id)) return bot.sendMessage(msg.chat.id, '🔒 Please /start and verify first.');
  volumeHandlers.handleCallback(msg.chat.id, msg.from.id, 'vol_create_start');
});

// ── /attachvol command ────────────────────────────────────
bot.onText(/\/attachvol/, (msg) => {
  if (!store.isVerified(msg.from.id)) return bot.sendMessage(msg.chat.id, '🔒 Please /start and verify first.');
  volumeHandlers.handleCallback(msg.chat.id, msg.from.id, 'vol_attach_start');
});

// ── /detachvol command ────────────────────────────────────
bot.onText(/\/detachvol/, (msg) => {
  if (!store.isVerified(msg.from.id)) return bot.sendMessage(msg.chat.id, '🔒 Please /start and verify first.');
  volumeHandlers.handleCallback(msg.chat.id, msg.from.id, 'vol_detach_start');
});

// ── /deletevol command ────────────────────────────────────
bot.onText(/\/deletevol/, (msg) => {
  if (!store.isVerified(msg.from.id)) return bot.sendMessage(msg.chat.id, '🔒 Please /start and verify first.');
  volumeHandlers.handleCallback(msg.chat.id, msg.from.id, 'vol_delete_start');
});

// ── /db command ───────────────────────────────────────────
bot.onText(/\/db/, (msg) => {
  if (!store.isVerified(msg.from.id)) return bot.sendMessage(msg.chat.id, '🔒 Please /start and verify first.');
  volumeHandlers.handleCallback(msg.chat.id, msg.from.id, 'db_deploy_start');
});

// ── /destroy command ──────────────────────────────────────
bot.onText(/\/destroy (.+)/, (msg, match) => {
  const tid = msg.from.id;
  const chatId = msg.chat.id;
  if (!store.isVerified(tid)) return bot.sendMessage(chatId, '🔒 Please /start and verify first.');
  const vmName = match[1].trim();
  vmHandlers.handleCallback(chatId, tid, `destroy_start:${vmName}`);
});

// ── /ssh command ──────────────────────────────────────────
bot.onText(/\/ssh (.+)/, (msg, match) => {
  const tid = msg.from.id;
  const chatId = msg.chat.id;
  if (!store.isVerified(tid)) return bot.sendMessage(chatId, '🔒 Please /start and verify first.');
  const vmName = match[1].trim();
  vmHandlers.handleCallback(chatId, tid, `ssh_info:${vmName}`);
});

// ── /balance command ──────────────────────────────────────
bot.onText(/\/balance/, (msg) => {
  const tid = msg.from.id;
  if (!store.isVerified(tid)) return bot.sendMessage(msg.chat.id, '🔒 Please /start and verify first.');
  const bal = store.getBalance(tid);
  bot.sendMessage(msg.chat.id, `💰 Your wallet balance: <b>₹${bal.toFixed(2)}</b>`, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[{ text: '➕ Top Up', callback_data: 'topup_home' }]] }
  });
});

// ── /status command ───────────────────────────────────────
bot.onText(/\/status/, (msg) => {
  if (!store.isVerified(msg.from.id)) return bot.sendMessage(msg.chat.id, '🔒 Please /start and verify first.');
  vmHandlers.handleCallback(msg.chat.id, msg.from.id, 'list_vms');
});

// ── /stop command ─────────────────────────────────────────
bot.onText(/\/stop (.+)/, (msg, match) => {
  const tid = msg.from.id;
  const chatId = msg.chat.id;
  if (!store.isVerified(tid)) return bot.sendMessage(chatId, '🔒 Please /start and verify first.');
  const vmName = match[1].trim();
  vmHandlers.handleCallback(chatId, tid, `stop_by_name:${vmName}`);
});

// ── /topup command ────────────────────────────────────────
bot.onText(/\/topup (.+)/, (msg, match) => {
  const tid = msg.from.id;
  const chatId = msg.chat.id;
  if (!store.isVerified(tid)) return bot.sendMessage(chatId, '🔒 Please /start and verify first.');
  const args = match[1].trim().split(/\s+/);
  const amount = parseFloat(args[0]);
  const method = args[1] || 'razorpay';
  if (isNaN(amount) || amount < 1) {
    return bot.sendMessage(chatId, '❌ Invalid amount. Usage: /topup 500 razorpay');
  }
  if (method === 'razorpay') {
    walletHandlers.handleCallback(chatId, tid, `topup_amount:razorpay:${amount}`);
  } else if (method === 'upi') {
    walletHandlers.handleCallback(chatId, tid, `topup_amount:upi:${amount}`);
  } else if (method === 'crypto' || method === 'xdc') {
    walletHandlers.handleCallback(chatId, tid, `topup_amount:crypto:${amount}`);
  } else {
    bot.sendMessage(chatId, '❌ Invalid method. Use: razorpay, upi, or crypto/xdc');
  }
});

// ── /vms command ──────────────────────────────────────────
bot.onText(/\/vms/, (msg) => {
  if (!store.isVerified(msg.from.id)) return bot.sendMessage(msg.chat.id, '🔒 Please /start and verify first.');
  vmHandlers.handleCallback(msg.chat.id, msg.from.id, 'list_vms');
});

// ── Admin: /verify command ────────────────────────────────
bot.onText(/\/verify (.+)/, async (msg, match) => {
  const tid = msg.from.id;
  const adminId = process.env.ADMIN_TELEGRAM_ID;

  if (adminId && String(tid) !== String(adminId)) {
    return bot.sendMessage(msg.chat.id, '❌ Admin only command.');
  }

  const paymentId = match[1].trim();
  const result = await store.verifyPendingPayment(paymentId, String(tid));

  if (!result.ok) {
    return bot.sendMessage(msg.chat.id, `❌ ${result.error}`);
  }

  // Notify user
  const payment = result.payment;
  if (payment.telegram_id) {
    bot.sendMessage(payment.telegram_id,
      `✅ <b>Payment Verified!</b>\n\n` +
      `Amount: ₹${payment.amount} has been credited to your wallet\.\n\n` +
      `Thank you for using PromptCloud\.`,
      { parse_mode: 'HTML' }
    ).catch(() => {});
  }

  bot.sendMessage(msg.chat.id,
    `✅ Payment ${paymentId} verified\.\n` +
    `₹${payment.amount} credited to user ${payment.user_id}\.`,
    { parse_mode: 'HTML' }
  );
});

// ── Admin: /reject command ────────────────────────────────
bot.onText(/\/reject (.+)/, async (msg, match) => {
  const tid = msg.from.id;
  const adminId = process.env.ADMIN_TELEGRAM_ID;

  if (adminId && String(tid) !== String(adminId)) {
    return bot.sendMessage(msg.chat.id, '❌ Admin only command.');
  }

  const paymentId = match[1].trim();
  await store.rejectPendingPayment(paymentId, String(tid));

  const payment = await store.getPendingPaymentById(paymentId);
  if (payment?.telegram_id) {
    bot.sendMessage(payment.telegram_id,
      `❌ <b>Payment Rejected</b>\n\n` +
      `Your payment of ₹${payment.amount} could not be verified\.\n` +
      `Please contact support if you believe this is an error\.`,
      { parse_mode: 'HTML' }
    ).catch(() => {});
  }

  bot.sendMessage(msg.chat.id, `❌ Payment ${paymentId} rejected.`);
});

// ── Admin: /pending command ───────────────────────────────
bot.onText(/\/pending/, async (msg) => {
  const tid = msg.from.id;
  const adminId = process.env.ADMIN_TELEGRAM_ID;

  if (adminId && String(tid) !== String(adminId)) {
    return bot.sendMessage(msg.chat.id, '❌ Admin only command.');
  }

  const pending = await store.getPendingPayments('pending', 20);
  if (!pending.length) {
    return bot.sendMessage(msg.chat.id, '✅ No pending payments.');
  }

  const lines = pending.map(p => {
    const utr = p.utr_number ? `UTR: \`${p.utr_number}\`` : 'UTR: <b>pending</b>';
    return `₹${p.amount} — ${utr} — ID: \`${p.id}\``;
  }).join('\n');

  bot.sendMessage(msg.chat.id,
    `⏳ <b>Pending Payments</b> (${pending.length})\n\n${lines}`,
    { parse_mode: 'HTML' }
  );
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
    return bot.sendMessage(chatId, '🏠 <b>Main Menu</b>', { parse_mode: 'HTML', reply_markup: mainMenu() });
  }

  // Sign out
  if (data === 'signout') {
    store.clearSession(tid);
    return bot.sendMessage(chatId, '👋 Signed out successfully\. Send /start to log in again\.', { parse_mode: 'HTML' });
  }

  // Route to wallet handler first, then volume, then VM handler
  const walletHandled = walletHandlers.handleCallback(chatId, tid, data);
  if (walletHandled !== false) return;
  const volumeHandled = volumeHandlers.handleCallback(chatId, tid, data);
  if (volumeHandled !== false) return;
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

  // UTR input for UPI payments
  if (walletHandlers.handleUTRText(chatId, tid, text)) return;

  // Custom top-up amount
  if (walletHandlers.handleCustomAmountText(chatId, tid, text)) return;

  // VM deploy name entry
  if (vmHandlers.handleDeployNameText(chatId, text)) return;

  // Volume name entry
  if (vmHandlers.handleVolumeNameText(chatId, text)) return;

  // DB name entry
  if (vmHandlers.handleDBNameText(chatId, text)) return;

  // Volume text input
  if (volumeHandlers.handleVolumeText(chatId, tid, text)) return;
});

// ── Photo upload router (for UPI screenshots) ─────────────
bot.on('photo', (msg) => {
  const chatId = msg.chat.id;
  const tid    = msg.from.id;
  if (walletHandlers.handleScreenshot(chatId, tid, msg.photo)) return;
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
              `🔔 <b>VM Alert</b>\n\n${escape(vm.name)} changed state:\n<b>${escape(prev)}</b> → <b>${escape(vm.state)}</b>`,
              { parse_mode: 'HTML' }
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

// ── Billing cycle ─────────────────────────────────────────
// Charges for running VMs every 15 minutes
const BILLING_MS = 15 * 60 * 1000;
async function runBilling() {
  await billing.runBillingCycle(bot);
}
setInterval(runBilling, BILLING_MS);
runBilling(); // Run immediately on startup

console.log(`✅ Bot running. Polling VM alerts every ${POLL_MS / 1000}s.`);
console.log(`💰 Billing cycle active (every ${BILLING_MS / 60000} min).`);
console.log('📱 Send /start to your bot on Telegram to begin.');
