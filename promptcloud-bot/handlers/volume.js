// handlers/volume.js — Volume & Database management via Telegram
const store   = require('../utils/store');
const cs      = require('../utils/cloudstack');
const { escape } = require('../utils/tg');

// Per-chat wizard state
const volumeState = {};
const dbState = {};

function authCheck(bot, chatId, tid) {
  if (!store.isVerified(tid)) {
    bot.sendMessage(chatId, '🔒 Please /start and verify your account first.');
    return false;
  }
  return true;
}

function register(bot) {

  // ── List Volumes ─────────────────────────────────────────
  async function listVolumes(chatId, tid) {
    if (!authCheck(bot, chatId, tid)) return;
    const m = await bot.sendMessage(chatId, '⏳ Fetching volumes…');
    try {
      const vols = await cs.listVolumes();
      if (!vols.length) {
        return bot.editMessageText('📭 No volumes found. Create one!', {
          chat_id: chatId, message_id: m.message_id,
          reply_markup: { inline_keyboard: [[{ text: '➕ Create Volume', callback_data: 'vol_create_start' }]] }
        });
      }
      const lines = vols.slice(0, 12).map(v => {
        const sizeGB = Math.round((v.size || 0) / 1073741824);
        const attached = v.virtualmachineid ? `📎 ${v.vmname || 'VM'}` : '🔓 Detached';
        return `💾 <b>${escape(v.name)}</b>\n  ${sizeGB} GB · ${escape(v.type)} · ${escape(v.state)} · ${attached}`;
      }).join('\n\n');
      bot.editMessageText(lines, {
        chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '➕ Create Volume', callback_data: 'vol_create_start' }]] }
      });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  // ── Create Volume Wizard ─────────────────────────────────
  async function createVolumeStart(chatId, tid) {
    if (!authCheck(bot, chatId, tid)) return;
    volumeState[chatId] = { step: 'name' };
    bot.sendMessage(chatId, '✏️ <b>Step 1/4</b> — Send me the volume name:', { parse_mode: 'HTML' });
  }

  async function createVolumeName(chatId, tid, name) {
    volumeState[chatId] = { ...volumeState[chatId], name, step: 'zone' };
    const m = await bot.sendMessage(chatId, '⏳ Loading zones…');
    try {
      const zones = await cs.listZones();
      const buttons = zones.slice(0, 8).map(z => [{ text: z.name, callback_data: `vol_zone:${z.id}` }]);
      buttons.push([{ text: '❌ Cancel', callback_data: 'vol_cancel' }]);
      bot.editMessageText('🌍 <b>Step 2/4</b> — Pick a zone:', {
        chat_id: chatId, message_id: m.message_id,
        parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons }
      });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  async function createVolumeZone(chatId, zoneId) {
    volumeState[chatId] = { ...volumeState[chatId], zoneId, step: 'disk' };
    const m = await bot.sendMessage(chatId, '⏳ Loading disk offerings…');
    try {
      const disks = await cs.listDiskOfferings();
      if (!disks.length) {
        return bot.editMessageText('❌ No disk offerings available.', { chat_id: chatId, message_id: m.message_id });
      }
      const buttons = disks.slice(0, 8).map(d => {
        const sizeText = d.iscustomized ? 'Custom size' : `${d.disksize || '?'}GB`;
        return [{ text: `${d.name} (${sizeText})`, callback_data: `vol_disk:${d.id}` }];
      });
      buttons.push([{ text: '❌ Cancel', callback_data: 'vol_cancel' }]);
      bot.editMessageText('💾 <b>Step 3/5</b> — Pick disk type:', {
        chat_id: chatId, message_id: m.message_id,
        parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons }
      });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  async function createVolumeDisk(chatId, diskOfferingId) {
    volumeState[chatId] = { ...volumeState[chatId], diskOfferingId, step: 'size' };
    bot.sendMessage(chatId,
      `✏️ <b>Step 4/5</b> — Enter size in GB \\(e\.g\. <b>10</b>, <b>50</b>, <b>100</b>\\):\n\n` +
      `_Pricing: ₹0\.5 per GB per hour_`,
      { parse_mode: 'HTML' }
    );
  }

  async function createVolumeSize(chatId, tid, sizeStr) {
    const size = parseInt(sizeStr);
    if (isNaN(size) || size < 1 || size > 1000) {
      return bot.sendMessage(chatId, '❌ Invalid size. Enter 1-1000 GB:');
    }
    volumeState[chatId] = { ...volumeState[chatId], size, step: 'confirm' };
    const s = volumeState[chatId];

    // Check balance
    const sess = store.getSession(tid);
    const balance = sess?.userId ? await store.getWalletBalance(sess.userId) : { inr: store.getBalance(tid) };
    const cost = size * 0.5; // ₹0.5 per GB

    if ((balance.inr || 0) < cost) {
      delete volumeState[chatId];
      return bot.sendMessage(chatId,
        `❌ Insufficient balance\. You need at least ₹${cost.toFixed(2)}\.\nYour balance: ₹${(balance.inr || 0).toFixed(2)}`,
        { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '➕ Top Up', callback_data: 'wallet_home' }]] } }
      );
    }

    bot.sendMessage(chatId,
      `✅ <b>Ready to create volume!</b>\n\n` +
      `Name: \`${escape(s.name)}\`\n` +
      `Zone: \`${escape(s.zoneId)}\`\n` +
      `Disk: \`${escape(s.diskOfferingId)}\`\n` +
      `Size: \`${size} GB\`\n` +
      `Cost: ₹${cost.toFixed(2)}\\/hour\n\n` +
      `Confirm?`,
      {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[
          { text: '✅ Create', callback_data: 'vol_create_confirm' },
          { text: '❌ Cancel', callback_data: 'vol_cancel' },
        ]]}
      }
    );
  }

  async function createVolumeConfirm(chatId, tid) {
    const s = volumeState[chatId];
    if (!s?.name) return bot.sendMessage(chatId, '❌ Session lost. Start again.');

    const m = await bot.sendMessage(chatId, '⏳ Creating volume…');
    try {
      // Get custom disk offering (or use first available)
      const offerings = await cs.listDiskOfferings();
      const customOffering = offerings.find(o => o.iscustomized) || offerings[0];
      if (!customOffering) throw new Error('No disk offerings available');

      await cs.createVolume({
        name: s.name,
        zoneId: s.zoneId,
        diskOfferingId: customOffering.id,
        size: s.size,
      });

      // Deduct from wallet
      const sess = store.getSession(tid);
      const cost = s.size * 0.5;
      if (sess?.userId) {
        await store.deductWalletBalance(sess.userId, cost, 'INR', `Volume creation: ${s.name}`);
      }

      delete volumeState[chatId];
      bot.editMessageText(
        `✅ Volume <b>${escape(s.name)}</b> created!\n${s.size} GB · ₹${cost.toFixed(2)}\\/hour`,
        { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' }
      );
    } catch (e) {
      delete volumeState[chatId];
      bot.editMessageText(`❌ Failed: ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  // ── Attach Volume ────────────────────────────────────────
  async function attachVolumeStart(chatId, tid) {
    if (!authCheck(bot, chatId, tid)) return;
    const m = await bot.sendMessage(chatId, '⏳ Loading volumes…');
    try {
      const [vols, vms] = await Promise.all([cs.listVolumes(), cs.listVMs()]);
      const detached = vols.filter(v => !v.virtualmachineid);
      if (!detached.length) {
        return bot.editMessageText('📭 No detached volumes available.', { chat_id: chatId, message_id: m.message_id });
      }
      const buttons = detached.slice(0, 8).map(v => {
        const sizeGB = Math.round((v.size || 0) / 1073741824);
        return [{ text: `${v.name} (${sizeGB}GB)`, callback_data: `vol_attach_sel:${v.id}` }];
      });
      buttons.push([{ text: '❌ Cancel', callback_data: 'vol_cancel' }]);
      bot.editMessageText('💾 <b>Select volume to attach:</b>', {
        chat_id: chatId, message_id: m.message_id,
        parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons }
      });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  async function attachVolumeVM(chatId, tid, volumeId) {
    const m = await bot.sendMessage(chatId, '⏳ Loading VMs…');
    try {
      const vms = await cs.listVMs();
      const running = vms.filter(v => v.state === 'Running');
      if (!running.length) {
        return bot.editMessageText('⚠️ No running VMs. Start a VM first.', { chat_id: chatId, message_id: m.message_id });
      }
      const buttons = running.slice(0, 8).map(v => [{ text: v.name, callback_data: `vol_attach_vm:${volumeId}:${v.id}` }]);
      buttons.push([{ text: '❌ Cancel', callback_data: 'vol_cancel' }]);
      bot.editMessageText('🖥 <b>Select VM to attach to:</b>', {
        chat_id: chatId, message_id: m.message_id,
        parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons }
      });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  async function attachVolumeConfirm(chatId, volumeId, vmId) {
    const m = await bot.sendMessage(chatId, '⏳ Attaching volume…');
    try {
      await cs.attachVolume(volumeId, vmId);
      bot.editMessageText('✅ Volume attached successfully\.', { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  // ── Detach Volume ────────────────────────────────────────
  async function detachVolumeStart(chatId, tid) {
    if (!authCheck(bot, chatId, tid)) return;
    const m = await bot.sendMessage(chatId, '⏳ Loading attached volumes…');
    try {
      const vols = await cs.listVolumes();
      const attached = vols.filter(v => v.virtualmachineid);
      if (!attached.length) {
        return bot.editMessageText('📭 No attached volumes.', { chat_id: chatId, message_id: m.message_id });
      }
      const buttons = attached.slice(0, 8).map(v => {
        const sizeGB = Math.round((v.size || 0) / 1073741824);
        return [{ text: `${v.name} (${sizeGB}GB → ${v.vmname})`, callback_data: `vol_detach:${v.id}` }];
      });
      buttons.push([{ text: '❌ Cancel', callback_data: 'vol_cancel' }]);
      bot.editMessageText('💾 <b>Select volume to detach:</b>', {
        chat_id: chatId, message_id: m.message_id,
        parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons }
      });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  async function detachVolumeConfirm(chatId, volumeId) {
    const m = await bot.sendMessage(chatId, '⏳ Detaching volume…');
    try {
      await cs.detachVolume(volumeId);
      bot.editMessageText('✅ Volume detached successfully\.', { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  // ── Delete Volume ────────────────────────────────────────
  async function deleteVolumeStart(chatId, tid) {
    if (!authCheck(bot, chatId, tid)) return;
    const m = await bot.sendMessage(chatId, '⏳ Loading volumes…');
    try {
      const vols = await cs.listVolumes();
      const detached = vols.filter(v => !v.virtualmachineid);
      if (!detached.length) {
        return bot.editMessageText('📭 No detached volumes to delete. Detach first.', { chat_id: chatId, message_id: m.message_id });
      }
      const buttons = detached.slice(0, 8).map(v => {
        const sizeGB = Math.round((v.size || 0) / 1073741824);
        return [{ text: `${v.name} (${sizeGB}GB)`, callback_data: `vol_delete:${v.id}` }];
      });
      buttons.push([{ text: '❌ Cancel', callback_data: 'vol_cancel' }]);
      bot.editMessageText('🗑 <b>Select volume to delete:</b>', {
        chat_id: chatId, message_id: m.message_id,
        parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons }
      });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  async function deleteVolumeConfirm(chatId, volumeId) {
    const m = await bot.sendMessage(chatId, '⏳ Deleting volume…');
    try {
      await cs.deleteVolume(volumeId);
      bot.editMessageText('🗑 Volume deleted successfully\.', { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  // ── Database (simplified — deploy DB VM from template) ───
  async function deployDBStart(chatId, tid) {
    if (!authCheck(bot, chatId, tid)) return;
    dbState[chatId] = { step: 'type' };
    bot.sendMessage(chatId,
      `🗄 <b>Deploy Database</b>\n\n` +
      `Select database type:`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🐘 PostgreSQL', callback_data: 'db_type:postgres' }],
            [{ text: '🐬 MySQL', callback_data: 'db_type:mysql' }],
            [{ text: '🍃 MongoDB', callback_data: 'db_type:mongodb' }],
            [{ text: '❌ Cancel', callback_data: 'db_cancel' }],
          ]
        }
      }
    );
  }

  // ── Text input handler for volume name / size ────────────
  function handleVolumeText(chatId, tid, text) {
    const state = volumeState[chatId];
    if (!state) return false;
    if (text.startsWith('/')) return false;

    if (state.step === 'name') {
      createVolumeName(chatId, tid, text.trim());
      return true;
    }
    if (state.step === 'size') {
      createVolumeSize(chatId, tid, text.trim());
      return true;
    }
    return false;
  }

  // ── Callback dispatcher ──────────────────────────────────
  function handleCallback(chatId, tid, data) {
    if (data === 'vol_list')         return listVolumes(chatId, tid);
    if (data === 'vol_create_start') return createVolumeStart(chatId, tid);
    if (data === 'vol_attach_start') return attachVolumeStart(chatId, tid);
    if (data === 'vol_detach_start') return detachVolumeStart(chatId, tid);
    if (data === 'vol_delete_start') return deleteVolumeStart(chatId, tid);
    if (data === 'vol_create_confirm') return createVolumeConfirm(chatId, tid);
    if (data === 'vol_cancel') {
      delete volumeState[chatId];
      return bot.sendMessage(chatId, '❌ Cancelled.', { reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] } });
    }
    if (data.startsWith('vol_zone:'))      return createVolumeZone(chatId, data.slice(9));
    if (data.startsWith('vol_attach_sel:')) return attachVolumeVM(chatId, tid, data.slice(14));
    if (data.startsWith('vol_attach_vm:')) {
      const [, volumeId, vmId] = data.split(':');
      return attachVolumeConfirm(chatId, volumeId, vmId);
    }
    if (data.startsWith('vol_detach:'))    return detachVolumeConfirm(chatId, data.slice(11));
    if (data.startsWith('vol_delete:'))    return deleteVolumeConfirm(chatId, data.slice(11));

    // DB
    if (data === 'db_deploy_start') return deployDBStart(chatId, tid);
    if (data === 'db_cancel') {
      delete dbState[chatId];
      return bot.sendMessage(chatId, '❌ Cancelled.', { reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] } });
    }

    return false;
  }

  return { handleCallback, handleVolumeText };
}

module.exports = { register };
