// handlers/wallet.js — balance, top-up via UPI & crypto
const store    = require('../utils/store');
const payments = require('../payments');
const { escape } = require('../utils/tg');

// Tracks pending top-up: chatId → { method, amount }
const pendingTopUp = {};

function authCheck(bot, chatId, tid) {
  if (!store.isVerified(tid)) {
    bot.sendMessage(chatId, '🔒 Please /start and verify your account first.');
    return false;
  }
  return true;
}

async function getDisplayBalance(tid) {
  const sess = store.getSession(tid);
  if (sess?.userId) {
    const bal = await store.getWalletBalance(sess.userId);
    return bal.inr;
  }
  return store.getBalance(tid);
}

function register(bot) {

  // ── Wallet home ─────────────────────────────────────────
  async function showWalletHome(chatId, tid) {
    if (!authCheck(bot, chatId, tid)) return;
    const sess    = store.getSession(tid);
    const balance = await getDisplayBalance(tid);
    bot.sendMessage(chatId,
      `💰 *Your Wallet*\n\n` +
      `Account: \`${escape(sess.email)}\`\n` +
      `Balance:  *₹${balance.toFixed(2)}*\n\n` +
      `What would you like to do?`,
      {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ Top Up via UPI',    callback_data: 'topup_upi'    },
             { text: '🔶 Top Up via Crypto', callback_data: 'topup_crypto' }],
            [{ text: '📊 Transaction History', callback_data: 'tx_history' }],
            [{ text: '🏠 Main Menu',          callback_data: 'main_menu'   }],
          ]
        }
      }
    );
  }

  // ── Transaction history ─────────────────────────────────
  async function showTxHistory(chatId, tid) {
    if (!authCheck(bot, chatId, tid)) return;
    const sess = store.getSession(tid);
    let history = [];
    if (sess?.userId) {
      const rows = await store.getTransactions(sess.userId, 10);
      history = rows.map(r => ({ amount: r.amount, type: r.type, ts: r.created_at }));
    } else {
      history = store.getTxHistory(tid);
    }

    if (!history.length) {
      return bot.sendMessage(chatId, '📭 No transactions yet.', {
        reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
      });
    }
    const lines = history.slice(0, 10).map(tx => {
      const sign  = tx.type === 'credit' || tx.type === 'deposit' ? '\\+' : '\\-';
      const date  = escape(new Date(tx.ts).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }));
      return `${sign}₹${Number(tx.amount).toFixed(2)} — ${date}`;
    }).join('\n');
    bot.sendMessage(chatId, `📊 *Recent Transactions*\n\n${lines}`, {
      parse_mode: 'MarkdownV2',
      reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
    });
  }

  // ── Top-up: choose amount ───────────────────────────────
  function showAmountPicker(chatId, tid, method) {
    if (!authCheck(bot, chatId, tid)) return;
    const label   = method === 'upi' ? 'UPI' : 'Crypto';
    const amounts = payments.TOP_UP_AMOUNTS;
    const rows    = [];
    for (let i = 0; i < amounts.length; i += 3) {
      rows.push(amounts.slice(i, i + 3).map(a => ({
        text: `₹${a}`,
        callback_data: `topup_amount:${method}:${a}`,
      })));
    }
    rows.push([{ text: '✏️ Custom Amount', callback_data: `topup_custom:${method}` }]);
    rows.push([{ text: '← Back',           callback_data: 'wallet_home'            }]);
    bot.sendMessage(chatId, `💳 *Top Up via ${escape(label)}*\n\nSelect an amount \\(INR\\):`, {
      parse_mode: 'MarkdownV2',
      reply_markup: { inline_keyboard: rows },
    });
  }

  // ── Top-up: UPI payment screen ──────────────────────────
  function showUPIPayment(chatId, tid, amount) {
    if (!authCheck(bot, chatId, tid)) return;
    const upi = payments.getUPIDetails(amount);
    pendingTopUp[chatId] = { method: 'upi', amount };

    const text =
      `🔵 *Pay via UPI*\n\n` +
      `Amount:  *₹${amount}*\n` +
      `UPI ID:  \`${escape(upi.upiId)}\`\n` +
      `Name:    ${escape(upi.name)}\n\n` +
      `*How to pay:*\n` +
      `1\\. Open GPay, PhonePe, or Paytm\n` +
      `2\\. Send ₹${amount} to \`${escape(upi.upiId)}\`\n` +
      `3\\. Tap *"I've Paid"* below after sending\n\n` +
      `_Or scan the UPI QR in your payment app_`;

    bot.sendMessage(chatId, text, {
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: [
          [{ text: `📲 Open UPI App (₹${amount})`, url: upi.deepLink }],
          [{ text: '✅ I\'ve Paid',   callback_data: 'topup_paid_upi' },
           { text: '❌ Cancel',       callback_data: 'topup_cancel'   }],
        ]
      }
    });
  }

  // ── Top-up: crypto coin picker ──────────────────────────
  function showCryptoPicker(chatId, tid, amount) {
    if (!authCheck(bot, chatId, tid)) return;
    const wallets = payments.getCryptoWallets();
    if (!wallets.length) {
      return bot.sendMessage(chatId, '⚠️ No crypto wallets configured yet. Check .env file.');
    }
    pendingTopUp[chatId] = { method: 'crypto', amount };
    const buttons = wallets.map(w => [{ text: `${w.emoji} ${w.label}`, callback_data: `topup_coin:${w.id}` }]);
    buttons.push([{ text: '← Back', callback_data: `topup_amount_back:crypto` }]);
    bot.sendMessage(chatId, `🔶 *Choose Crypto*\n\nPaying ₹${amount} equivalent — select your coin:`, {
      parse_mode: 'MarkdownV2',
      reply_markup: { inline_keyboard: buttons },
    });
  }

  // ── Top-up: show crypto wallet address ──────────────────
  function showCryptoAddress(chatId, tid, coinId) {
    if (!authCheck(bot, chatId, tid)) return;
    const wallet = payments.getWallet(coinId);
    if (!wallet || !wallet.address) {
      return bot.sendMessage(chatId, '⚠️ This wallet is not configured. Add it in .env.');
    }
    const pending = pendingTopUp[chatId];
    const amount  = pending?.amount || '?';

    const text =
      `${wallet.emoji} *${escape(wallet.label)}*\n\n` +
      `Send your ₹${amount} equivalent to:\n\n` +
      `\`${escape(wallet.address)}\`\n\n` +
      `Network: *${escape(wallet.network)}*\n\n` +
      `⚠️ _${escape(wallet.note)}_\n\n` +
      `After sending, tap *"I've Sent"* and our team will verify & credit your wallet within 30 minutes\\.`;

    bot.sendMessage(chatId, text, {
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ I\'ve Sent',  callback_data: `topup_paid_crypto:${coinId}` },
           { text: '❌ Cancel',      callback_data: 'topup_cancel'                }],
        ]
      }
    });
  }

  // ── "I've paid" confirmation (UPI) ──────────────────────
  async function handlePaidUPI(chatId, tid) {
    const pending = pendingTopUp[chatId];
    if (!pending) return bot.sendMessage(chatId, '❌ No pending top-up found. Start again.');
    delete pendingTopUp[chatId];

    const sess = store.getSession(tid);
    if (sess?.userId) {
      await store.addWalletBalance(sess.userId, pending.amount, 'INR', `UPI top-up via Telegram`);
    } else {
      store.addBalance(tid, pending.amount);
    }
    const newBal = await getDisplayBalance(tid);

    bot.sendMessage(chatId,
      `✅ *Top\\-up Received\\!*\n\n` +
      `Amount:      ₹${pending.amount}\n` +
      `New Balance: *₹${newBal.toFixed(2)}*\n\n` +
      `_Payment is under review\\. Balance will be confirmed within a few minutes\\._`,
      {
        parse_mode: 'MarkdownV2',
        reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
      }
    );
  }

  // ── "I've sent" confirmation (Crypto) ───────────────────
  async function handlePaidCrypto(chatId, tid, coinId) {
    const pending = pendingTopUp[chatId];
    if (!pending) return bot.sendMessage(chatId, '❌ No pending top-up found. Start again.');
    const wallet = payments.getWallet(coinId);
    delete pendingTopUp[chatId];

    const sess = store.getSession(tid);
    if (sess?.userId) {
      await store.addWalletBalance(sess.userId, pending.amount, 'INR', `Crypto ${wallet?.id || coinId} via Telegram`);
    } else {
      store.addBalance(tid, pending.amount);
    }
    const newBal = await getDisplayBalance(tid);

    bot.sendMessage(chatId,
      `🔶 *Crypto Payment Noted\\!*\n\n` +
      `Coin:        ${escape(wallet?.label || coinId)}\n` +
      `INR Amount:  ₹${pending.amount}\n` +
      `New Balance: *₹${newBal.toFixed(2)}*\n\n` +
      `_Our team will verify the on\\-chain transaction and confirm within 30 minutes\\. If not credited, contact support\\._`,
      {
        parse_mode: 'MarkdownV2',
        reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
      }
    );
  }

  // ── Custom amount ────────────────────────────────────────
  const awaitingCustomAmount = {}; // chatId → method

  function askCustomAmount(chatId, tid, method) {
    if (!authCheck(bot, chatId, tid)) return;
    awaitingCustomAmount[chatId] = method;
    bot.sendMessage(chatId, `✏️ Enter a custom amount in INR \\(e\\.g\\. *750*\\):`, { parse_mode: 'MarkdownV2' });
  }

  // Exported so index.js message router can call this
  function handleCustomAmountText(chatId, tid, text) {
    if (!awaitingCustomAmount[chatId]) return false;
    const method = awaitingCustomAmount[chatId];
    delete awaitingCustomAmount[chatId];
    const amount = parseFloat(text);
    if (isNaN(amount) || amount < 10) {
      bot.sendMessage(chatId, '❌ Invalid amount. Minimum is ₹10. Try again with /start.');
      return true;
    }
    if (method === 'upi')    showUPIPayment(chatId, tid, amount);
    else                     showCryptoPicker(chatId, tid, amount);
    return true;
  }

  // ── Callback dispatcher (called from main index) ─────────
  function handleCallback(chatId, tid, data) {
    if (data === 'wallet_home')  return showWalletHome(chatId, tid);
    if (data === 'topup_home')   return showAmountPicker(chatId, tid, 'upi'); // default to UPI
    if (data === 'topup_upi')    return showAmountPicker(chatId, tid, 'upi');
    if (data === 'topup_crypto') return showAmountPicker(chatId, tid, 'crypto');
    if (data === 'tx_history')   return showTxHistory(chatId, tid);
    if (data === 'topup_cancel') {
      delete pendingTopUp[chatId];
      return bot.sendMessage(chatId, '❌ Top-up cancelled.', {
        reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
      });
    }
    if (data === 'topup_paid_upi') return handlePaidUPI(chatId, tid);
    if (data.startsWith('topup_paid_crypto:')) return handlePaidCrypto(chatId, tid, data.slice(18));
    if (data.startsWith('topup_coin:'))        return showCryptoAddress(chatId, tid, data.slice(11));
    if (data.startsWith('topup_custom:'))      return askCustomAmount(chatId, tid, data.slice(13));
    if (data.startsWith('topup_amount:')) {
      const [, method, amount] = data.split(':');
      if (method === 'upi')    return showUPIPayment(chatId, tid, parseFloat(amount));
      if (method === 'crypto') return showCryptoPicker(chatId, tid, parseFloat(amount));
    }
    return false; // not handled
  }

  return { handleCallback, handleCustomAmountText };
}

module.exports = { register };
