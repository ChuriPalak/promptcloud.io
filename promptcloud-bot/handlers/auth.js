// handlers/auth.js — /start, email entry, OTP verification
const store  = require('../utils/store');
const mailer = require('../utils/mailer');
const { escape, mainMenu } = require('../utils/tg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const awaitingEmail = {};
const awaitingOTP   = {};
const otpAttempts   = {}; // track failed attempts per chatId

function register(bot) {

  // ── /start ─────────────────────────────────────────────
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const tid    = msg.from.id;

    if (store.isVerified(tid)) {
      const sess = store.getSession(tid);
      return bot.sendMessage(chatId,
        `👋 Welcome back, <b>${escape(sess.name || sess.email)}</b>!\n\nYou're logged in. What would you like to do?`,
        { parse_mode: 'HTML', reply_markup: mainMenu() }
      );
    }

    delete awaitingEmail[chatId];
    delete awaitingOTP[chatId];
    awaitingEmail[chatId] = true;

    bot.sendMessage(chatId,
      `☁️ <b>Welcome to PromptCloud</b>\n\n` +
      `Manage your cloud infrastructure, top up your wallet, and deploy VMs — right from Telegram.\n\n` +
      `<b>Available Commands:</b>\n` +
      `/deploy - Spin up a new VM\n` +
      `/status - List all running VMs\n` +
      `/stop &lt;vm-name&gt; - Stop a VM\n` +
      `/destroy &lt;vm-name&gt; - Delete a VM permanently\n` +
      `/volumes - List all volumes\n` +
      `/createvol - Create a new volume\n` +
      `/attachvol - Attach volume to VM\n` +
      `/detachvol - Detach volume from VM\n` +
      `/deletevol - Delete a volume\n` +
      `/db - Deploy a database\n` +
      `/topup &lt;amount&gt; [razorpay|upi|crypto] - Add wallet credits\n` +
      `/balance - Check wallet balance\n` +
      `/wallet - Open wallet menu\n` +
      `/history - Transaction history\n` +
      `/menu - Main menu\n` +
      `/signout - Log out\n\n` +
      `To get started, please enter the <b>email address</b> linked to your PromptCloud account:`,
      { parse_mode: 'HTML' }
    );
  });

  // ── /signout ────────────────────────────────────────────
  bot.onText(/\/signout/, (msg) => {
    store.clearSession(msg.from.id);
    delete awaitingEmail[msg.chat.id];
    delete awaitingOTP[msg.chat.id];
    delete otpAttempts[msg.chat.id];
    bot.sendMessage(msg.chat.id, '👋 Signed out. Send /start to log in again.');
  });

  // ── Text message router ─────────────────────────────────
  bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    const chatId = msg.chat.id;
    const tid    = msg.from.id;
    const text   = msg.text.trim();

    // ── Step 1: collect email
    if (awaitingEmail[chatId]) {
      delete awaitingEmail[chatId];

      if (!EMAIL_RE.test(text)) {
        awaitingEmail[chatId] = true;
        return bot.sendMessage(chatId, "❌ That doesn't look like a valid email. Please try again:");
      }

      const email = text.toLowerCase();
      const code  = mailer.generateOTP();
      store.storeOTP(email, code, tid);
      awaitingOTP[chatId] = email;

      store.setSession(tid, { email, verified: false });

      try {
        await mailer.sendOTP(email, code);
        bot.sendMessage(chatId,
          `📧 A 6-digit OTP has been sent to <b>${escape(email)}</b>.\n\nPlease enter it below:\n<i>(Expires in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes)</i>`,
          { parse_mode: 'HTML' }
        );
      } catch (e) {
        console.error('Mail error:', e.message);
        bot.sendMessage(chatId, '❌ Failed to send OTP email. Check your SMTP config in .env and try again with /start.');
      }
      return;
    }

    // ── Step 2: verify OTP
    if (awaitingOTP[chatId]) {
      const email = awaitingOTP[chatId];

      // Rate-limit: max 5 attempts
      otpAttempts[chatId] = (otpAttempts[chatId] || 0) + 1;
      if (otpAttempts[chatId] > 5) {
        delete awaitingOTP[chatId];
        delete otpAttempts[chatId];
        return bot.sendMessage(chatId, '🔒 Too many incorrect attempts. Please send /start to request a new OTP.');
      }

      const result = store.verifyOTP(email, text);

      if (!result.ok) {
        return bot.sendMessage(chatId, `❌ ${result.reason} (Attempt ${otpAttempts[chatId]}/5)`);
      }

      delete otpAttempts[chatId];

      delete awaitingOTP[chatId];
      const name = email.split('@')[0];

      let user = await store.getUserByEmail(email);
      if (!user) {
        const randomPassword = await bcrypt.hash(uuidv4(), 10);
        user = await store.createUser({
          id: uuidv4(),
          email,
          password: randomPassword,
          name,
          phone: null,
          company_name: null,
        });
      } else {
        await store.updateUser(user.id, { is_verified: 1 });
      }

      store.setSession(tid, {
        userId: user.id,
        email,
        name,
        verified: true,
        balance: user.wallet_balance || 0,
        txHistory: [],
        linkedAt: new Date().toISOString(),
      });

      // Persist telegram_chat_id so billing engine can notify this user
      await store.updateUser(user.id, { telegram_chat_id: String(chatId) }).catch(() => {});

      bot.sendMessage(chatId,
        `✅ <b>Verified!</b> Welcome, <b>${escape(name)}</b>.\n\nYour account is now linked to this Telegram. Here's your dashboard:`,
        { parse_mode: 'HTML', reply_markup: mainMenu() }
      );
      return;
    }
  });
}

module.exports = { register, awaitingEmail, awaitingOTP };
