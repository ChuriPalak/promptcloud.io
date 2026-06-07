// handlers/auth.js — /start, email entry, OTP verification
const store  = require('../utils/store');
const mailer = require('../utils/mailer');
const { escape, mainMenu } = require('../utils/tg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Pending email collection: chatId → true
const awaitingEmail = {};
const awaitingOTP   = {}; // chatId → email

function register(bot) {

  // ── /start ─────────────────────────────────────────────
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const tid    = msg.from.id;

    // Already verified — go straight to dashboard
    if (store.isVerified(tid)) {
      const sess = store.getSession(tid);
      return bot.sendMessage(chatId,
        `👋 Welcome back, *${escape(sess.name || sess.email)}*\\!\n\nYou're logged in\\. What would you like to do?`,
        { parse_mode: 'MarkdownV2', reply_markup: mainMenu() }
      );
    }

    // Fresh start
    delete awaitingEmail[chatId];
    delete awaitingOTP[chatId];
    awaitingEmail[chatId] = true;

    bot.sendMessage(chatId,
      `☁️ *Welcome to PromptCloud*\n\n` +
      `Manage your cloud infrastructure, top up your wallet, and deploy VMs — right from Telegram\\.\n\n` +
      `To get started, please enter the *email address* linked to your PromptCloud account:`,
      { parse_mode: 'MarkdownV2' }
    );
  });

  // ── /signout ────────────────────────────────────────────
  bot.onText(/\/signout/, (msg) => {
    store.clearSession(msg.from.id);
    delete awaitingEmail[msg.chat.id];
    delete awaitingOTP[msg.chat.id];
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
        return bot.sendMessage(chatId, '❌ That doesn\'t look like a valid email. Please try again:');
      }

      const email = text.toLowerCase();
      const code  = mailer.generateOTP();
      store.storeOTP(email, code, tid);
      awaitingOTP[chatId] = email;

      // Optimistically store email in session
      store.setSession(tid, { email, verified: false });

      try {
        await mailer.sendOTP(email, code);
        bot.sendMessage(chatId,
          `📧 A 6\\-digit OTP has been sent to *${escape(email)}*\\.\n\nPlease enter it below:\n_\\(Expires in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes\\)_`,
          { parse_mode: 'MarkdownV2' }
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
      const result = store.verifyOTP(email, text);

      if (!result.ok) {
        return bot.sendMessage(chatId, `❌ ${result.reason}`);
      }

      // Verified!
      delete awaitingOTP[chatId];
      const name = email.split('@')[0];

      // Ensure user exists in SQLite (auto-provision Telegram users)
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

      bot.sendMessage(chatId,
        `✅ *Verified\\!* Welcome, *${escape(name)}*\\.\n\nYour account is now linked to this Telegram\\. Here's your dashboard:`,
        { parse_mode: 'MarkdownV2', reply_markup: mainMenu() }
      );
      return;
    }
  });
}

module.exports = { register, awaitingEmail, awaitingOTP };
