// utils/billing.js — Usage-based billing engine
const cs    = require('./cloudstack');
const store = require('./store');
const { escape } = require('./tg');

const PRICING = {
  cpu_per_core_hour:   5,
  ram_per_gb_hour:     2,
  storage_per_gb_hour: 0.5,
};

function calculateHourlyCost(cpuCores, ramMB, storageGB) {
  const ramGB = ramMB / 1024;
  return (
    cpuCores * PRICING.cpu_per_core_hour +
    ramGB    * PRICING.ram_per_gb_hour +
    (storageGB || 10) * PRICING.storage_per_gb_hour
  );
}

async function runBillingCycle(bot) {
  try {
    const vms        = await cs.listVMs();
    const runningVMs = vms.filter(v => v.state === 'Running');

    for (const vm of runningVMs) {
      const deployments = await store.dbAll(
        'SELECT * FROM deployments WHERE vm_id = ? AND status = ?',
        [vm.id, 'running']
      );

      for (const dep of deployments) {
        const costPerHour = dep.cost_per_hour || calculateHourlyCost(dep.cpu_cores, dep.ram_mb, dep.storage_gb);
        const chargeAmount = costPerHour / 4;

        const result = await store.deductWalletBalance(
          dep.user_id,
          chargeAmount,
          'INR',
          `VM usage: ${dep.name} (${vm.state})`
        );

        if (!result.ok) {
          console.log(`[BILLING] Stopping VM ${vm.id} for user ${dep.user_id}: insufficient balance`);
          try {
            await cs.stopVM(vm.id);
            await store.updateDeployment(dep.id, { status: 'stopped_by_billing', stopped_at: new Date().toISOString() });

            const user = await store.getUserById(dep.user_id);
            // telegram_chat_id may be stored as a string; coerce safely
            const chatId = user?.telegram_chat_id ? String(user.telegram_chat_id) : null;
            if (chatId && bot) {
              bot.sendMessage(chatId,
                `⚠️ <b>VM Auto-Stopped</b>\n\n` +
                `VM <b>${escape(vm.name)}</b> was stopped due to insufficient wallet balance.\n` +
                `Top up to restart it.`,
                { parse_mode: 'HTML' }
              ).catch(() => {});
            }
          } catch (e) {
            console.error('[BILLING] Failed to stop VM:', e.message);
          }
        } else {
          await store.updateDeployment(dep.id, {
            total_cost: (dep.total_cost || 0) + chargeAmount,
          });
        }
      }
    }

    await checkLowBalance(bot);
  } catch (e) {
    console.error('[BILLING] Cycle error:', e.message);
  }
}

const LOW_BALANCE_THRESHOLD = 100;
const alertedUsers = new Set();

async function checkLowBalance(bot) {
  if (!bot) return;
  try {
    const users = await store.dbAll(
      'SELECT * FROM users WHERE wallet_balance < ? AND wallet_balance > 0',
      [LOW_BALANCE_THRESHOLD]
    );

    for (const user of users) {
      if (alertedUsers.has(user.id)) continue;
      alertedUsers.add(user.id);

      const userChatId = user.telegram_chat_id ? String(user.telegram_chat_id) : null;
      if (userChatId) {
        bot.sendMessage(userChatId,
          `⚠️ <b>Low Balance Alert</b>\n\n` +
          `Your wallet balance is ₹${escape(user.wallet_balance.toFixed(2))}.` +
          `\nTop up soon to avoid VM auto-shutdown.`,
          {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[{ text: '➕ Top Up', callback_data: 'wallet_home' }]] }
          }
        ).catch(() => {});
      }
    }

    const recovered = await store.dbAll(
      'SELECT id FROM users WHERE wallet_balance >= ?',
      [LOW_BALANCE_THRESHOLD]
    );
    for (const u of recovered) alertedUsers.delete(u.id);
  } catch (e) {
    console.error('[BILLING] Low balance check error:', e.message);
  }
}

async function trackDeployment(userId, vmId, vmDetails) {
  const costPerHour = calculateHourlyCost(
    vmDetails.cpunumber,
    vmDetails.memory,
    10
  );

  return store.createDeployment({
    user_id:       userId,
    vm_id:         vmId,
    name:          vmDetails.name || vmDetails.displayname,
    status:        'running',
    cpu_cores:     vmDetails.cpunumber,
    ram_mb:        vmDetails.memory,
    cost_per_hour: costPerHour,
    started_at:    new Date().toISOString(),
  });
}

module.exports = { calculateHourlyCost, runBillingCycle, checkLowBalance, trackDeployment, PRICING };
