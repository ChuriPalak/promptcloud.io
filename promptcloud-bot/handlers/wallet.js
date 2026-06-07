// handlers/wallet.js — Real UPI QR + UTR verification
const store    = require('../utils/store');
const payments = require('../payments');
const { escape } = require('../utils/tg');
const fs       = require('fs');
const path     = require('path');

const pendingTopUp = {};
const awaitingUTR  = {};

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
      `💰 <b>Your Wallet</b>\n\n` +
      `Account: \`${escape(sess.email)}\`\n` +
      `Balance: <b>₹${balance.toFixed(2)}</b>\n\n` +
      `What would you like to do?`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💳 Top Up via Razorpay', callback_data: 'topup_razorpay' },
             { text: '➕ Top Up via UPI',      callback_data: 'topup_upi'      }],
            [{ text: '🔶 Top Up via Crypto',   callback_data: 'topup_crypto'   }],
            [{ text: '📊 Transaction History', callback_data: 'tx_history'     }],
            [{ text: '🏠 Main Menu',           callback_data: 'main_menu'      }],
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
      history = rows.map(r => ({ amount: r.amount, type: r.type, ts: r.created_at, desc: r.description }));
    } else {
      history = store.getTxHistory(tid);
    }

    if (!history.length) {
      return bot.sendMessage(chatId, '📭 No transactions yet.', {
        reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
      });
    }
    const lines = history.slice(0, 10).map(tx => {
      const sign = tx.type === 'credit' || tx.type === 'deposit' ? '+' : '-';
      const date = escape(new Date(tx.ts).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }));
      const desc = tx.desc ? ` — ${escape(tx.desc)}` : '';
      return `${sign}₹${Number(tx.amount).toFixed(2)}${desc} — ${date}`;
    }).join('\n');
    bot.sendMessage(chatId, `📊 <b>Recent Transactions</b>\n\n${lines}`, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
    });
  }

  // ── Top-up: choose amount ───────────────────────────────
  function showAmountPicker(chatId, tid, method) {
    if (!authCheck(bot, chatId, tid)) return;
    const label   = method === 'upi' ? 'UPI' : method === 'razorpay' ? 'Razorpay' : 'Crypto';
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
    bot.sendMessage(chatId, `💳 <b>Top Up via ${escape(label)}</b>\n\nSelect an amount (INR):`, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: rows },
    });
  }

  // ── Top-up: Razorpay payment link ───────────────────────
  async function showRazorpayLink(chatId, tid, amount) {
    if (!authCheck(bot, chatId, tid)) return;
    const sess = store.getSession(tid);
    if (!sess?.userId) return bot.sendMessage(chatId, '❌ Please complete account setup first.');

    const m = await bot.sendMessage(chatId, '⏳ Creating Razorpay order…');
    try {
      const Razorpay = require('razorpay');
      const razorpay = new Razorpay({
        key_id:     process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      const order = await razorpay.orders.create({
        amount:   Math.round(amount * 100),
        currency: 'INR',
        receipt:  `TXN-${Date.now()}`,
        notes:    { userId: sess.userId, telegramId: String(tid), email: sess.email || '' },
      });

      const keyId      = process.env.RAZORPAY_KEY_ID;
      const paymentUrl = `https://api.razorpay.com/v1/checkout/embedded?order_id=${order.id}&key_id=${keyId}`;

      await bot.editMessageText(
        `💳 <b>Razorpay Payment</b>\n\n` +
        `Amount: <b>₹${amount}</b>\n\n` +
        `Click the button below to pay via Razorpay.\n` +
        `Supports UPI, Cards, Netbanking, Wallets.\n\n` +
        `<i>After payment, your wallet will be auto-credited.</i>`,
        {
          chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: `💳 Pay ₹${amount}`, url: paymentUrl }],
              [{ text: "✅ I've Paid",       callback_data: `topup_paid_razorpay:${order.id}:${amount}` },
               { text: '❌ Cancel',         callback_data: 'topup_cancel' }],
            ]
          }
        }
      );
    } catch (e) {
      console.error('[RAZORPAY] Error:', e.message);
      bot.editMessageText(`❌ Failed to create Razorpay order: ${escape(e.message)}`, {
        chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML',
      });
    }
  }

  // ── "I've paid" — verify Razorpay payment ─────────────────
  async function handlePaidRazorpay(chatId, tid, orderId, amount) {
    const sess = store.getSession(tid);
    if (!sess?.userId) return bot.sendMessage(chatId, '❌ Please complete account setup first.');

    const m = await bot.sendMessage(chatId, '⏳ Verifying payment…');
    try {
      const Razorpay = require('razorpay');
      const razorpay = new Razorpay({
        key_id:     process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
      const order = await razorpay.orders.fetch(orderId);

      if (order.status === 'paid') {
        await store.addWalletBalance(sess.userId, amount, 'INR', `Razorpay ${orderId}`);
        const newBal = await getDisplayBalance(tid);
        bot.editMessageText(
          `✅ <b>Payment Successful!</b>\n\n` +
          `Amount:      <b>₹${amount}</b>\n` +
          `Order ID:    \`${escape(orderId)}\`\n` +
          `New Balance: <b>₹${newBal.toFixed(2)}</b>\n\n` +
          `Thank you for using PromptCloud.`,
          {
            chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
          }
        );
      } else {
        bot.editMessageText(
          `⏳ <b>Payment Pending</b>\n\n` +
          `Order status: ${escape(order.status)}\n\n` +
          `<i>If you completed the payment, please wait a few minutes and check your balance with /balance.</i>`,
          { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' }
        );
      }
    } catch (e) {
      console.error('[RAZORPAY VERIFY] Error:', e.message);
      bot.editMessageText(`❌ Verification failed: ${escape(e.message)}. Contact support if payment was deducted.`, {
        chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML',
      });
    }
  }

  // ── Top-up: UPI QR code screen ──────────────────────────
  async function showUPIQR(chatId, tid, amount) {
    if (!authCheck(bot, chatId, tid)) return;
    const upi = payments.getUPIDetails(amount);
    pendingTopUp[chatId] = { method: 'upi', amount };

    const qrPath = payments.getUPIQRPath();
    const hasQR  = qrPath && fs.existsSync(qrPath);

    const text =
      `🔵 <b>Pay via UPI</b>\n\n` +
      `Amount:  <b>₹${amount}</b>\n` +
      `UPI ID:  \`${escape(upi.upiId)}\`\n` +
      `Name:    ${escape(upi.name)}\n\n` +
      `<b>How to pay:</b>\n` +
      `1. Scan the QR code below OR open GPay/PhonePe/Paytm\n` +
      `2. Send <b>₹${amount}</b> to \`${escape(upi.upiId)}\`\n` +
      `3. Copy the <b>UTR number</b> from your payment app\n` +
      `4. Tap <b>"I've Paid"</b> and enter your UTR\n\n` +
      `<i>⚠️ Your balance will be updated after we verify the UTR.</i>`;

    const keyboard = {
      inline_keyboard: [
        [{ text: `📲 Open UPI App (₹${amount})`, url: upi.deepLink }],
        [{ text: "✅ I've Paid — Enter UTR", callback_data: 'topup_paid_upi' },
         { text: '❌ Cancel',                callback_data: 'topup_cancel'   }],
      ]
    };

    if (hasQR) {
      await bot.sendPhoto(chatId, qrPath, { caption: text, parse_mode: 'HTML', reply_markup: keyboard });
    } else {
      await bot.sendMessage(chatId, text + '\n\n<i>⚠️ QR code not configured. Use the UPI ID above.</i>', {
        parse_mode: 'HTML', reply_markup: keyboard,
      });
    }
  }

  // ── "I've paid" — ask for UTR ────────────────────────────
  async function askForUTR(chatId, tid) {
    const pending = pendingTopUp[chatId];
    if (!pending) return bot.sendMessage(chatId, '❌ No pending top-up found. Start again.');

    const sess = store.getSession(tid);
    if (!sess?.userId) return bot.sendMessage(chatId, '❌ Please complete account setup first.');

    const paymentId = await store.createPendingPayment({
      userId: sess.userId, telegramId: String(tid),
      amount: pending.amount, currency: 'INR',
    });

    awaitingUTR[chatId] = { paymentId, amount: pending.amount };
    delete pendingTopUp[chatId];

    bot.sendMessage(chatId,
      `✅ <b>Payment Noted!</b>\n\n` +
      `Amount: ₹${pending.amount}\n\n` +
      `Please enter your <b>UTR number</b> (12-digit reference from your UPI app):\n\n` +
      `<i>You can also send a screenshot of the payment.</i>`,
      { parse_mode: 'HTML' }
    );
  }

  // ── Handle UTR text input ────────────────────────────────
  async function handleUTRText(chatId, tid, text) {
    const state = awaitingUTR[chatId];
    if (!state) return false;

    const utr = text.trim().replace(/\s/g, '').replace(/[^0-9]/g, '');
    if (utr.length < 8 || utr.length > 20) {
      bot.sendMessage(chatId, '❌ Invalid UTR. Please enter a valid 8-20 digit UTR number.');
      return true;
    }

    await store.dbRun('UPDATE pending_payments SET utr_number = ? WHERE id = ?', [utr, state.paymentId]);

    const sess      = store.getSession(tid);
    const adminTgId = process.env.ADMIN_TELEGRAM_ID;
    if (adminTgId && bot) {
      bot.sendMessage(adminTgId,
        `🔔 <b>New Payment Pending Verification</b>\n\n` +
        `User: ${escape(sess.email)}\n` +
        `Amount: ₹${state.amount}\n` +
        `UTR: \`${utr}\`\n` +
        `Payment ID: \`${state.paymentId}\`\n\n` +
        `Use /verify ${state.paymentId} to approve\n` +
        `Use /reject ${state.paymentId} to decline`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
    }

    delete awaitingUTR[chatId];

    bot.sendMessage(chatId,
      `⏳ <b>Payment Submitted for Verification</b>\n\n` +
      `UTR: \`${utr}\`\n` +
      `Amount: ₹${state.amount}\n\n` +
      `<i>Your wallet will be credited within 15-30 minutes after verification.</i>`,
      {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
      }
    );
    return true;
  }

  // ── Handle screenshot upload ─────────────────────────────
  async function handleScreenshot(chatId, tid, photo) {
    const state = awaitingUTR[chatId];
    if (!state) return false;

    try {
      const fileId  = photo[photo.length - 1].file_id;
      const file    = await bot.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

      const screenshotsDir = path.join(__dirname, '..', 'screenshots');
      if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

      const ext       = path.extname(file.file_path) || '.jpg';
      const localPath = path.join(screenshotsDir, `${state.paymentId}${ext}`);

      const response = await fetch(fileUrl);
      const buffer   = await response.arrayBuffer();
      fs.writeFileSync(localPath, Buffer.from(buffer));

      await store.dbRun('UPDATE pending_payments SET screenshot_path = ? WHERE id = ?', [localPath, state.paymentId]);

      bot.sendMessage(chatId, '📸 Screenshot received. Now please enter your <b>UTR number</b>:', { parse_mode: 'HTML' });
      return true;
    } catch (e) {
      console.error('[SCREENSHOT] Error:', e.message);
      bot.sendMessage(chatId, '⚠️ Failed to process screenshot. Please enter your UTR number instead.');
      return true;
    }
  }

  // ── Top-up: crypto coin picker ──────────────────────────
  function showCryptoPicker(chatId, tid, amount) {
    if (!authCheck(bot, chatId, tid)) return;
    const wallets = payments.getCryptoWallets();
    if (!wallets.length) return bot.sendMessage(chatId, '⚠️ No crypto wallets configured yet. Check .env file.');
    pendingTopUp[chatId] = { method: 'crypto', amount };
    const buttons = wallets.map(w => [{ text: `${w.emoji} ${w.label}`, callback_data: `topup_coin:${w.id}` }]);
    buttons.push([{ text: '← Back', callback_data: `topup_amount_back:crypto` }]);
    bot.sendMessage(chatId, `🔶 <b>Choose Crypto</b>\n\nPaying ₹${amount} equivalent — select your coin:`, {
      parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons },
    });
  }

  // ── Top-up: show crypto wallet address ──────────────────
  function showCryptoAddress(chatId, tid, coinId) {
    if (!authCheck(bot, chatId, tid)) return;
    const wallet  = payments.getWallet(coinId);
    if (!wallet || !wallet.address) return bot.sendMessage(chatId, '⚠️ This wallet is not configured. Add it in .env.');
    const pending = pendingTopUp[chatId];
    const amount  = pending?.amount || '?';

    bot.sendMessage(chatId,
      `${wallet.emoji} <b>${escape(wallet.label)}</b>\n\n` +
      `Send your ₹${amount} equivalent to:\n\n` +
      `\`${escape(wallet.address)}\`\n\n` +
      `Network: <b>${escape(wallet.network)}</b>\n\n` +
      `⚠️ <i>${escape(wallet.note)}</i>\n\n` +
      `After sending, tap <b>"I've Sent"</b> and our team will verify & credit your wallet within 30 minutes.`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ I've Sent", callback_data: `topup_paid_crypto:${coinId}` },
             { text: '❌ Cancel',    callback_data: 'topup_cancel'                }],
          ]
        }
      }
    );
  }

  // ── "I've sent" confirmation (Crypto) — queue for manual verification ──
  async function handlePaidCrypto(chatId, tid, coinId) {
    const pending = pendingTopUp[chatId];
    if (!pending) return bot.sendMessage(chatId, '❌ No pending top-up found. Start again.');
    const wallet = payments.getWallet(coinId);
    delete pendingTopUp[chatId];

    const sess = store.getSession(tid);
    if (!sess?.userId) return bot.sendMessage(chatId, '❌ Please complete account setup first.');

    // Create a pending payment record — admin must verify on-chain before crediting
    const paymentId = await store.createPendingPayment({
      userId: sess.userId, telegramId: String(tid),
      amount: pending.amount, currency: 'INR',
      method: `crypto_${coinId}`,
    });

    const adminTgId = process.env.ADMIN_TELEGRAM_ID;
    if (adminTgId && bot) {
      bot.sendMessage(adminTgId,
        `🔔 <b>Crypto Payment Pending Verification</b>\n\n` +
        `User: ${escape(sess.email)}\n` +
        `Coin: ${escape(wallet?.label || coinId)}\n` +
        `Amount: ₹${pending.amount}\n` +
        `Payment ID: \`${paymentId}\`\n\n` +
        `Use /verify ${paymentId} to approve\n` +
        `Use /reject ${paymentId} to decline`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
    }

    bot.sendMessage(chatId,
      `🔶 <b>Crypto Payment Noted!</b>\n\n` +
      `Coin:        ${escape(wallet?.label || coinId)}\n` +
      `INR Amount:  ₹${pending.amount}\n\n` +
      `<i>Our team will verify the on-chain transaction and credit your wallet within 30 minutes. If not credited, contact support.</i>`,
      {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
      }
    );
  }

  // ── Custom amount ────────────────────────────────────────
  const awaitingCustomAmount = {};

  function askCustomAmount(chatId, tid, method) {
    if (!authCheck(bot, chatId, tid)) return;
    awaitingCustomAmount[chatId] = method;
    bot.sendMessage(chatId, `✏️ Enter a custom amount in INR (e.g. <b>750</b>):`, { parse_mode: 'HTML' });
  }

  function handleCustomAmountText(chatId, tid, text) {
    if (!awaitingCustomAmount[chatId]) return false;
    const method = awaitingCustomAmount[chatId];
    delete awaitingCustomAmount[chatId];
    const amount = parseFloat(text);
    if (isNaN(amount) || amount < 10) {
      bot.sendMessage(chatId, '❌ Invalid amount. Minimum is ₹10. Try again with /wallet.');
      return true;
    }
    if (method === 'upi')    showUPIQR(chatId, tid, amount);
    else                     showCryptoPicker(chatId, tid, amount);
    return true;
  }

  // ── Callback dispatcher ──────────────────────────────────
  function handleCallback(chatId, tid, data) {
    if (data === 'wallet_home')    return showWalletHome(chatId, tid);
    if (data === 'topup_home')     return showAmountPicker(chatId, tid, 'upi');
    if (data === 'topup_razorpay') return showAmountPicker(chatId, tid, 'razorpay');
    if (data === 'topup_upi')      return showAmountPicker(chatId, tid, 'upi');
    if (data === 'topup_crypto')   return showAmountPicker(chatId, tid, 'crypto');
    if (data === 'tx_history')     return showTxHistory(chatId, tid);
    if (data.startsWith('topup_amount_back:')) return showAmountPicker(chatId, tid, data.slice(18));
    if (data === 'topup_cancel') {
      delete pendingTopUp[chatId];
      delete awaitingUTR[chatId];
      delete awaitingCustomAmount[chatId];
      return bot.sendMessage(chatId, '❌ Top-up cancelled.', {
        reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
      });
    }
    if (data === 'topup_paid_upi') return askForUTR(chatId, tid);
    if (data.startsWith('topup_paid_razorpay:')) {
      const parts  = data.split(':');
      const orderId = parts[1];
      const amount  = parseFloat(parts[2]);
      return handlePaidRazorpay(chatId, tid, orderId, amount);
    }
    if (data.startsWith('topup_paid_crypto:')) return handlePaidCrypto(chatId, tid, data.slice(18));
    if (data.startsWith('topup_coin:'))        return showCryptoAddress(chatId, tid, data.slice(11));
    if (data.startsWith('topup_custom:'))      return askCustomAmount(chatId, tid, data.slice(13));
    if (data.startsWith('topup_amount:')) {
      const [, method, amount] = data.split(':');
      if (method === 'razorpay') return showRazorpayLink(chatId, tid, parseFloat(amount));
      if (method === 'upi')      return showUPIQR(chatId, tid, parseFloat(amount));
      if (method === 'crypto')   return showCryptoPicker(chatId, tid, parseFloat(amount));
    }
    return false;
  }

  return { handleCallback, handleCustomAmountText, handleUTRText, handleScreenshot };
}

module.exports = { register };
