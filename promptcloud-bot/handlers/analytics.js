// handlers/analytics.js — Wallet analytics & spending insights
const store = require('../utils/store');
const { escape } = require('../utils/tg');

// Helper: escape a number formatted as ₹X.XX for MarkdownV2
function esc(num) {
  return escape(num.toFixed(2));
}

function register(bot) {
  async function showAnalytics(chatId, tid) {
    const sess = store.getSession(tid);
    if (!sess?.userId) {
      return bot.sendMessage(chatId, '🔒 Please /start and verify first.');
    }

    try {
      const txs  = await store.getTransactions(sess.userId, 1000);
      const deps = await store.getDeployments(sess.userId);

      if (!txs.length) {
        return bot.sendMessage(chatId, '📊 No transaction data yet. Deploy a VM or top up to see analytics.');
      }

      const deposits = txs.filter(t => t.type === 'deposit');
      const charges  = txs.filter(t => t.type === 'charge');

      const totalDeposited = deposits.reduce((s, t) => s + t.amount, 0);
      const totalCharged   = charges.reduce((s, t) => s + t.amount, 0);
      const currentBalance = totalDeposited - totalCharged;

      const vmCharges     = charges.filter(t => t.description?.includes('VM'));
      const deployCharges = charges.filter(t => t.description?.includes('deployment'));
      const usageCharges  = charges.filter(t => t.description?.includes('usage'));

      const vmTotal     = vmCharges.reduce((s, t) => s + t.amount, 0);
      const deployTotal = deployCharges.reduce((s, t) => s + t.amount, 0);
      const usageTotal  = usageCharges.reduce((s, t) => s + t.amount, 0);

      const activeDeps  = deps.filter(d => d.status === 'running');
      const hourlyBurn  = activeDeps.reduce((s, d) => s + (d.cost_per_hour || 0), 0);
      const dailyBurn   = hourlyBurn * 24;
      const monthlyBurn = dailyBurn * 30;

      const daysUntilEmpty = hourlyBurn > 0 ? (currentBalance / dailyBurn) : Infinity;

      const weekAgo        = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentCharges  = charges.filter(t => new Date(t.created_at) > weekAgo);
      const weeklySpend    = recentCharges.reduce((s, t) => s + t.amount, 0);

      const daysLine = daysUntilEmpty === Infinity
        ? 'No active VMs'
        : `Days until empty: ${escape(daysUntilEmpty.toFixed(1))}`;

      const otherVm = vmTotal - deployTotal - usageTotal;

      // Fix: otherVm can go negative if charges match multiple filters; clamp to 0
      const otherVmSafe = Math.max(0, otherVm);

      const msg =
        `📊 <b>Wallet Analytics</b>\n\n` +
        `💰 <b>Balance</b>\n` +
        `   Current: ₹${esc(currentBalance)}\n` +
        `   Total Deposited: ₹${esc(totalDeposited)}\n` +
        `   Total Spent: ₹${esc(totalCharged)}\n\n` +
        `🔥 <b>Burn Rate</b>\n` +
        `   Per Hour: ₹${esc(hourlyBurn)}\n` +
        `   Per Day: ₹${esc(dailyBurn)}\n` +
        `   Per Month: ₹${esc(monthlyBurn)}\n` +
        `   ${escape(daysLine)}\n\n` +
        `💸 <b>Spending Breakdown</b>\n` +
        `   VM Deployments: ₹${esc(deployTotal)}\n` +
        `   VM Usage (hourly): ₹${esc(usageTotal)}\n` +
        `   Other VM Charges: ₹${esc(otherVmSafe)}\n` +
        `   Total: ₹${esc(vmTotal)}\n\n` +
        `📈 <b>Recent Activity</b>\n` +
        `   Last 7 days: ₹${esc(weeklySpend)}\n` +
        `   Active VMs: ${escape(String(activeDeps.length))}\n` +
        `   Total VMs: ${escape(String(deps.length))}\n`;

      bot.sendMessage(chatId, msg, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💰 Wallet', callback_data: 'wallet_home' }, { text: '📜 History', callback_data: 'tx_history' }],
            [{ text: '🏠 Menu', callback_data: 'main_menu' }]
          ]
        }
      });
    } catch (e) {
      bot.sendMessage(chatId, `❌ Error: ${escape(e.message)}`);
    }
  }

  bot.onText(/\/analytics/, (msg) => {
    if (!store.isVerified(msg.from.id)) {
      return bot.sendMessage(msg.chat.id, '🔒 Please /start and verify first.');
    }
    showAnalytics(msg.chat.id, msg.from.id);
  });

  return { showAnalytics };
}

module.exports = { register };
