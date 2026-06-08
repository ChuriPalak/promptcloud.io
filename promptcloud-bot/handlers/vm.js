// handlers/vm.js — list, deploy, start, stop, destroy, ssh, details
const store   = require('../utils/store');
const billing = require('../utils/billing');
const cs      = require('../utils/cloudstack');
const { escape, stateEmoji, vmSummary } = require('../utils/tg');

const deployState = {};

function authCheck(bot, chatId, tid) {
  if (!store.isVerified(tid)) {
    bot.sendMessage(chatId, '🔒 Please /start and verify your account first.');
    return false;
  }
  return true;
}

function register(bot) {

  // ── List VMs ─────────────────────────────────────────────
  async function listVMs(chatId, tid) {
    if (!authCheck(bot, chatId, tid)) return;
    const m = await bot.sendMessage(chatId, '⏳ Fetching your VMs…');
    try {
      const vms = await cs.listVMs();
      if (!vms.length) {
        return bot.editMessageText('📭 No VMs found. Deploy one!', {
          chat_id: chatId, message_id: m.message_id,
          reply_markup: { inline_keyboard: [[{ text: '🚀 Deploy VM', callback_data: 'deploy_start' }]] }
        });
      }
      const summary = vms.map(vmSummary).join('\n\n');
      await bot.editMessageText(summary, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });

      for (const vm of vms.slice(0, 8)) {
        const running = vm.state === 'Running';
        bot.sendMessage(chatId, `🖥 Actions for <b>${escape(vm.name)}</b>:`, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              running
                ? { text: '🔴 Stop',    callback_data: `vm_stop:${vm.id}`    }
                : { text: '🟢 Start',   callback_data: `vm_start:${vm.id}`   },
              { text: '🔍 Details',     callback_data: `vm_details:${vm.id}` },
            ], [
              { text: '🗑 Destroy', callback_data: `vm_destroy:${vm.id}` },
              { text: '🔑 SSH',     callback_data: `vm_ssh:${vm.id}`     },
            ]]
          }
        });
      }
    } catch (e) {
      bot.editMessageText(`❌ Error: ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  // ── VM Details ───────────────────────────────────────────
  async function vmDetails(chatId, id) {
    const m = await bot.sendMessage(chatId, '⏳ Loading…');
    try {
      const vm = await cs.getVM(id);
      if (!vm) return bot.editMessageText('❌ VM not found.', { chat_id: chatId, message_id: m.message_id });
      const ip = vm.nic?.[0]?.ipaddress || '—';
      const text = [
        `🖥 <b>${escape(vm.name)}</b>`,
        `State:      ${stateEmoji(vm.state)} ${escape(vm.state)}`,
        `Zone:       ${escape(vm.zonename)}`,
        `OS:         ${escape(vm.templatedisplaytext || vm.templatename)}`,
        `CPU:        ${escape(String(vm.cpunumber))} cores @ ${escape(String(vm.cpuspeed || '?'))} MHz`,
        `RAM:        ${escape(String(vm.memory))} MB`,
        `IP:         \`${escape(ip)}\``,
        `Public IP:  \`${escape(vm.publicip || '—')}\``,
        `Hypervisor: ${escape(vm.hypervisor)}`,
        `Created:    ${escape(vm.created ? new Date(vm.created).toLocaleString('en-IN') : '—')}`,
        `ID:         \`${escape(vm.id)}\``,
      ].join('\\n');
      bot.editMessageText(text, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  // ── Start / Stop ─────────────────────────────────────────
  async function startVM(chatId, id) {
    const m = await bot.sendMessage(chatId, '⏳ Starting VM…');
    try {
      await cs.startVM(id);
      bot.editMessageText('🟢 Start command sent! VM booting up.', { chat_id: chatId, message_id: m.message_id });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  async function stopVM(chatId, id) {
    const m = await bot.sendMessage(chatId, '⏳ Stopping VM…');
    try {
      await cs.stopVM(id);
      bot.editMessageText('🔴 Stop command sent! VM shutting down.', { chat_id: chatId, message_id: m.message_id });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  // ── Stop VM by name ───────────────────────────────────────
  async function stopVMByName(chatId, tid, vmName) {
    if (!authCheck(bot, chatId, tid)) return;
    const m = await bot.sendMessage(chatId, `⏳ Looking for VM "${escape(vmName)}"…`);
    try {
      const vms = await cs.listVMs();
      const vm = vms.find(v => v.name === vmName || v.displayname === vmName);
      if (!vm) {
        return bot.editMessageText(`❌ VM "${escape(vmName)}" not found. Use /status to see your VMs.`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
      }
      if (vm.state !== 'Running') {
        return bot.editMessageText(`⚠️ VM "${escape(vmName)}" is already ${escape(vm.state)}.`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
      }
      await cs.stopVM(vm.id);
      bot.editMessageText(`🔴 VM "${escape(vmName)}" stop command sent!`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  // ── Destroy VM ───────────────────────────────────────────
  async function destroyVM(chatId, id) {
    const m = await bot.sendMessage(chatId, '⏳ Destroying VM…');
    try {
      await cs.destroyVM(id);
      bot.editMessageText('🗑 VM destroyed.', { chat_id: chatId, message_id: m.message_id });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  // ── SSH Info ─────────────────────────────────────────────
  async function sshInfo(chatId, id) {
    const m = await bot.sendMessage(chatId, '⏳ Fetching SSH info…');
    try {
      const vm = await cs.getVM(id);
      if (!vm) return bot.editMessageText('❌ VM not found.', { chat_id: chatId, message_id: m.message_id });
      const ip = vm.nic?.[0]?.ipaddress || vm.publicip || '—';
      const isWindows = (vm.templatedisplaytext || vm.templatename || '').toLowerCase().includes('windows');
      const username = isWindows ? 'Administrator' : 'root';
      const text = [
        `🔑 <b>SSH Access: ${escape(vm.name)}</b>`,
        ``,
        `IP:       \`${escape(ip)}\``,
        `Username: \`${escape(username)}\``,
        `Password: Use CloudStack console or portal`,
        ``,
        `Command:`,
        `\`ssh ${escape(username)}@${escape(ip)}\``,
      ].join('\n');
      bot.editMessageText(text, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  // ── List Volumes ─────────────────────────────────────────
  async function listVolumes(chatId, tid) {
    if (!authCheck(bot, chatId, tid)) return;
    const m = await bot.sendMessage(chatId, '⏳ Fetching volumes…');
    try {
      const vols = await cs.listVolumes();
      if (!vols.length) return bot.editMessageText('📭 No volumes found.', { chat_id: chatId, message_id: m.message_id });
      const text = vols.slice(0, 12).map(v =>
        `💾 <b>${escape(v.name)}</b>\n  ${Math.round((v.size || 0) / 1073741824)} GB · ${escape(v.type)} · ${escape(v.state)}`
      ).join('\n\n');
      bot.editMessageText(text, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  // ── Destroy VM by name ────────────────────────────────────
  async function destroyVMByName(chatId, tid, vmName) {
    if (!authCheck(bot, chatId, tid)) return;
    const m = await bot.sendMessage(chatId, `⏳ Looking for VM "${escape(vmName)}"…`);
    try {
      const vms = await cs.listVMs();
      const vm = vms.find(v => v.name === vmName || v.displayname === vmName);
      if (!vm) {
        return bot.editMessageText(`❌ VM "${escape(vmName)}" not found. Use /status to see your VMs.`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
      }
      await cs.destroyVM(vm.id);
      bot.editMessageText(`🗑 VM "${escape(vmName)}" destroyed.`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  // ── Volume Wizard ────────────────────────────────────────
  const volumeState = {};

  async function createVolumeStart(chatId, tid) {
    if (!authCheck(bot, chatId, tid)) return;
    volumeState[chatId] = {};
    const m = await bot.sendMessage(chatId, '⏳ Loading zones…');
    try {
      const zones = await cs.listZones();
      if (!zones.length) return bot.editMessageText('❌ No zones available.', { chat_id: chatId, message_id: m.message_id });
      const buttons = zones.slice(0, 8).map(z => [{ text: z.name, callback_data: `cvz:${z.id}` }]);
      buttons.push([{ text: '❌ Cancel', callback_data: 'main_menu' }]);
      bot.editMessageText('💾 <b>Create Volume</b> — Step 1/3: Pick a zone:', {
        chat_id: chatId, message_id: m.message_id,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons }
      });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  async function createVolumeZone(chatId, zoneId) {
    volumeState[chatId] = { zoneId };
    const m = await bot.sendMessage(chatId, '⏳ Loading disk offerings…');
    try {
      const disks = await cs.listDiskOfferings();
      const buttons = disks.slice(0, 8).map(d => [{ text: `${d.name} - ${d.disksize || 'Custom'}GB`, callback_data: `cvd:${d.id}` }]);
      buttons.push([{ text: '❌ Cancel', callback_data: 'main_menu' }]);
      bot.editMessageText('💾 <b>Create Volume</b> — Step 2/3: Pick disk type:', {
        chat_id: chatId, message_id: m.message_id,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons }
      });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  function createVolumeDisk(chatId, diskOfferingId) {
    volumeState[chatId] = { ...volumeState[chatId], diskOfferingId };
    bot.sendMessage(chatId, '✏️ <b>Create Volume</b> — Step 3/3: Send me the volume name (or type `skip` for auto):', { parse_mode: 'HTML' });
  }

  async function createVolumeConfirm(chatId, tid, name) {
    const s = volumeState[chatId];
    if (!s?.zoneId || !s?.diskOfferingId) return bot.sendMessage(chatId, '❌ Session lost. Start again with /createvol');

    const sess = store.getSession(tid);
    const balance = sess?.userId ? await store.getWalletBalance(sess.userId) : { inr: store.getBalance(tid) };

    // Get disk offering specs for pricing
    let disk;
    try {
      const disks = await cs.listDiskOfferings();
      disk = disks.find(d => d.id === s.diskOfferingId);
    } catch (e) { disk = null; }

    const sizeGB = disk?.disksize || 10;
    const hourlyCost = sizeGB * billing.PRICING.storage_per_gb_hour;
    const upfrontCost = Math.ceil(hourlyCost * 24); // charge 1 day minimum for storage

    if ((balance.inr || 0) < upfrontCost) {
      delete volumeState[chatId];
      return bot.sendMessage(chatId,
        `❌ <b>Insufficient Funds</b>\n\n` +
        `Volume: ${escape(name)}\n` +
        `Size: ${sizeGB}GB\n` +
        `Cost: <b>₹${hourlyCost.toFixed(2)}/hr</b> (₹${(hourlyCost * 24).toFixed(2)}/day)\n` +
        `Upfront (1 day): <b>₹${upfrontCost}</b>\n\n` +
        `Your balance: ₹${(balance.inr || 0).toFixed(2)}\n` +
        `Need: ₹${(upfrontCost - (balance.inr || 0)).toFixed(2)} more`,
        { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '➕ Top Up', callback_data: 'wallet_home' }]] } }
      );
    }

    const m = await bot.sendMessage(chatId, '💾 Creating volume…');
    try {
      await cs.createVolume({ name, zoneId: s.zoneId, diskOfferingId: s.diskOfferingId, size: sizeGB });
      if (sess?.userId) {
        await store.deductWalletBalance(sess.userId, upfrontCost, 'INR', `Volume creation: ${name} (${sizeGB}GB)`);
      }
      delete volumeState[chatId];
      const newBal = (balance.inr || 0) - upfrontCost;
      bot.editMessageText(
        `✅ <b>Volume Created!</b>\n\n` +
        `Name: <b>${escape(name)}</b>\n` +
        `Size: ${sizeGB}GB\n` +
        `Rate: ₹${hourlyCost.toFixed(2)}/hr\n` +
        `Upfront: ₹${upfrontCost} deducted\n` +
        `Balance: ₹${newBal.toFixed(2)}\n\n` +
        `Check /volumes.`,
        { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' }
      );
    } catch (e) {
      delete volumeState[chatId];
      bot.editMessageText(`❌ Volume creation failed: ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  function handleVolumeNameText(chatId, text) {
    const s = volumeState[chatId];
    if (!s || !s.diskOfferingId || s.name) return false;
    if (text.startsWith('/')) return false;
    const raw = text.trim() === 'skip' ? ('vol-' + Date.now().toString(36)) : text.trim();

    if (!/^[a-zA-Z0-9][a-zA-Z0-9\-]{0,62}$/.test(raw)) {
      bot.sendMessage(chatId, '❌ Invalid volume name. Use only letters, numbers, and hyphens. Try again:');
      return true;
    }

    const name = raw;
    volumeState[chatId].name = name;
    bot.sendMessage(chatId,
      `✅ <b>Ready to create volume!</b>\n\nName: ${escape(name)}\nZone: ${escape(s.zoneId)}\nDisk: ${escape(s.diskOfferingId)}\n\nConfirm?`,
      {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[
          { text: '💾 Create Now', callback_data: 'cv_confirm' },
          { text: '❌ Cancel', callback_data: 'main_menu' },
        ]]}
      }
    );
    return true;
  }

  // ── DB Deploy Wizard ─────────────────────────────────────
  const dbState = {};
  const DB_TEMPLATES = [
    { id: 'c7ae52cc-9519-49e0-8e7b-6df81976011b', name: 'Ubuntu 20.04 + PostgreSQL',    emoji: '🐘', pkg: 'postgresql' },
    { id: 'c7ae52cc-9519-49e0-8e7b-6df81976011b', name: 'Ubuntu 20.04 + MySQL',         emoji: '🐬', pkg: 'mysql-server' },
    { id: 'c7ae52cc-9519-49e0-8e7b-6df81976011b', name: 'Ubuntu 20.04 + MongoDB',       emoji: '🍃', pkg: 'mongodb' },
    { id: 'c7ae52cc-9519-49e0-8e7b-6df81976011b', name: 'Ubuntu 20.04 + Redis',         emoji: '🔴', pkg: 'redis' },
  ];

  async function deployDBStart(chatId, tid) {
    if (!authCheck(bot, chatId, tid)) return;
    dbState[chatId] = {};
    const m = await bot.sendMessage(chatId, '⏳ Loading zones…');
    try {
      const zones = await cs.listZones();
      if (!zones.length) return bot.editMessageText('❌ No zones available.', { chat_id: chatId, message_id: m.message_id });
      const buttons = zones.slice(0, 8).map(z => [{ text: z.name, callback_data: `dbz:${z.id}` }]);
      buttons.push([{ text: '❌ Cancel', callback_data: 'main_menu' }]);
      bot.editMessageText('🗄 <b>Deploy Database</b> — Step 1/4: Pick a zone:', {
        chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons }
      });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  async function deployDBZone(chatId, zoneId) {
    dbState[chatId] = { zoneId };
    const m = await bot.sendMessage(chatId, '⏳ Loading offerings…');
    try {
      const offs = await cs.listOfferings();
      dbState[chatId].offerings = offs;
      const buttons = offs.slice(0, 8).map(o => {
        const cpu = o.cpunumber || '?';
        const ram = o.memory ? `${Math.round(o.memory / 1024)}GB` : '?MB';
        return [{ text: `${o.name} - ${cpu}vCPU ${ram}`, callback_data: `dbo:${o.id}` }];
      });
      buttons.push([{ text: '❌ Cancel', callback_data: 'main_menu' }]);
      bot.editMessageText('⚙️ <b>Deploy Database</b> — Step 2/4: Pick a plan:', {
        chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons }
      });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  function deployDBOffering(chatId, offeringId) {
    const offering = dbState[chatId]?.offerings?.find(o => o.id === offeringId);
    dbState[chatId] = { ...dbState[chatId], offeringId, offering };
    const buttons = DB_TEMPLATES.map(t => [{ text: `${t.emoji} ${t.name}`, callback_data: `dbt:${t.id}` }]);
    buttons.push([{ text: '❌ Cancel', callback_data: 'main_menu' }]);
    bot.sendMessage(chatId, '🗄 <b>Deploy Database</b> — Step 3/4: Pick a database:', {
      parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons }
    });
  }

  async function deployDBTemplate(chatId, templateId) {
    dbState[chatId] = { ...dbState[chatId], templateId };
    const m = await bot.sendMessage(chatId, '⏳ Loading networks…');
    try {
      const nets = await cs.listNetworks();
      const usable = nets.filter(n => n.canusefordeploy !== false);
      if (!usable.length) {
        dbState[chatId].networkId = '';
        bot.editMessageText('⚠️ No networks available. Skipping to name step.', { chat_id: chatId, message_id: m.message_id });
        return bot.sendMessage(chatId, '✏️ <b>Deploy Database</b> — Step 4/4: Send me the DB name (or type `skip` for auto):', { parse_mode: 'HTML' });
      }
      const buttons = usable.slice(0, 8).map(n => [{ text: `${n.name} (${n.type})`, callback_data: `dbn:${n.id}` }]);
      buttons.push([{ text: '❌ Cancel', callback_data: 'main_menu' }]);
      bot.editMessageText('🌐 <b>Deploy Database</b> — Step 4/4: Pick a network:', {
        chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons }
      });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  function deployDBNetwork(chatId, networkId) {
    dbState[chatId] = { ...dbState[chatId], networkId };
    bot.sendMessage(chatId, '✏️ <b>Deploy Database</b> — Step 4/4: Send me the DB name (or type `skip` for auto):', { parse_mode: 'HTML' });
  }

  async function deployDBConfirm(chatId, tid) {
    const s = dbState[chatId];
    if (!s?.name) return bot.sendMessage(chatId, '❌ Session lost. Start again with /db');

    const sess = store.getSession(tid);
    const balance = sess?.userId ? await store.getWalletBalance(sess.userId) : { inr: store.getBalance(tid) };

    // Get offering specs for dynamic pricing
    let offering;
    try {
      const offs = await cs.listOfferings();
      offering = offs.find(o => o.id === s.offeringId);
    } catch (e) { offering = null; }

    const cpu = offering?.cpunumber || 1;
    const ramGB = (offering?.memory || 1024) / 1024;
    const diskGB = offering?.rootdisksize || 10;
    const hourlyCost = billing.calculateHourlyCost(cpu, ramGB * 1024, diskGB) * 1.5; // DB premium: 1.5x
    const upfrontCost = Math.ceil(hourlyCost);

    if ((balance.inr || 0) < upfrontCost) {
      delete dbState[chatId];
      return bot.sendMessage(chatId,
        `❌ <b>Insufficient Funds</b>\n\n` +
        `DB: ${escape(s.name)}\n` +
        `Specs: ${cpu}vCPU, ${ramGB.toFixed(1)}GB RAM, ${diskGB}GB Disk\n` +
        `Cost: <b>₹${hourlyCost.toFixed(2)}/hr</b> (DB premium)\n` +
        `Upfront (1hr): <b>₹${upfrontCost}</b>\n\n` +
        `Your balance: ₹${(balance.inr || 0).toFixed(2)}\n` +
        `Need: ₹${(upfrontCost - (balance.inr || 0)).toFixed(2)} more`,
        { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '➕ Top Up', callback_data: 'wallet_home' }]] } }
      );
    }

    const dbType = DB_TEMPLATES.find(t => t.id === s.templateId)?.name || s.templateId;
    const m = await bot.sendMessage(chatId, `🗄 Deploying ${escape(dbType)}…`, { parse_mode: 'HTML' });
    try {
      const vm = await cs.deployVM({ name: s.name, zoneId: s.zoneId, offeringId: s.offeringId, templateId: s.templateId, networkId: s.networkId });
      if (sess?.userId) {
        await store.deductWalletBalance(sess.userId, upfrontCost, 'INR', `DB deploy upfront: ${s.name} (${dbType})`);
        if (vm?.id) {
          await billing.trackDeployment(sess.userId, vm.id, { name: s.name, cpunumber: cpu, memory: ramGB * 1024 });
        }
      }
      delete dbState[chatId];
      const newBal = (balance.inr || 0) - upfrontCost;
      bot.editMessageText(
        `✅ <b>Database Deployed!</b>\n\n` +
        `Name: <b>${escape(s.name)}</b>\n` +
        `Type: ${escape(dbType)}\n` +
        `Specs: ${cpu}vCPU, ${ramGB.toFixed(1)}GB RAM, ${diskGB}GB Disk\n` +
        `Rate: ₹${hourlyCost.toFixed(2)}/hr\n` +
        `Upfront: ₹${upfrontCost} deducted\n` +
        `Balance: ₹${newBal.toFixed(2)}\n\n` +
        `Check /vms in a minute.`,
        { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' }
      );
    } catch (e) {
      delete dbState[chatId];
      bot.editMessageText(`❌ DB deploy failed: ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  function handleDBNameText(chatId, text) {
    const s = dbState[chatId];
    if (!s || !s.templateId || s.name) return false;
    if (text.startsWith('/')) return false;
    const name = text.trim() === 'skip' ? ('db-' + Date.now().toString(36)) : text.trim();
    dbState[chatId].name = name;
    const dbType = DB_TEMPLATES.find(t => t.id === s.templateId)?.name || s.templateId;

    // Calculate pricing for summary
    const cpu = s.offering?.cpunumber || 1;
    const ramGB = (s.offering?.memory || 1024) / 1024;
    const diskGB = s.offering?.rootdisksize || 10;
    const hourlyCost = billing.calculateHourlyCost(cpu, ramGB * 1024, diskGB) * 1.5;
    const upfrontCost = Math.ceil(hourlyCost);

    bot.sendMessage(chatId,
      `✅ <b>Ready to deploy database!</b>\n\n` +
      `Name: <b>${escape(name)}</b>\n` +
      `Type: ${escape(dbType)}\n` +
      `Zone: ${escape(s.zoneId)}\n` +
      `Plan: ${escape(s.offering?.name || s.offeringId)}\n` +
      `Specs: ${cpu}vCPU, ${ramGB.toFixed(1)}GB RAM, ${diskGB}GB Disk\n` +
      `Rate: <b>₹${hourlyCost.toFixed(2)}/hr</b> (DB premium 1.5x)\n` +
      `Upfront: <b>₹${upfrontCost}</b>\n\n` +
      `Confirm?`,
      {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[
          { text: '🗄 Deploy Now', callback_data: 'db_confirm' },
          { text: '❌ Cancel', callback_data: 'main_menu' },
        ]]}
      }
    );
    return true;
  }

  // ── Deploy Wizard ────────────────────────────────────────
  async function deployStart(chatId, tid) {
    if (!authCheck(bot, chatId, tid)) return;
    deployState[chatId] = {};
    const m = await bot.sendMessage(chatId, '⏳ Loading zones…');
    try {
      const zones = await cs.listZones();
      if (!zones.length) return bot.editMessageText('❌ No zones available.', { chat_id: chatId, message_id: m.message_id });
      const buttons = zones.slice(0, 8).map(z => [{ text: z.name, callback_data: `dz:${z.id}` }]);
      buttons.push([{ text: '❌ Cancel', callback_data: 'main_menu' }]);
      bot.editMessageText('🌍 <b>Step 1/5</b> — Pick a zone:', {
        chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons }
      });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  async function deployZone(chatId, zoneId) {
    deployState[chatId] = { zoneId };
    const m = await bot.sendMessage(chatId, '⏳ Loading offerings…');
    try {
      const offs = await cs.listOfferings();
      const buttons = offs.slice(0, 8).map(o => {
        const cpu  = o.cpunumber || '?';
        const ram  = o.memory ? `${Math.round(o.memory / 1024)}GB` : '?MB';
        const disk = o.rootdisksize ? `${o.rootdisksize}GB` : '10GB';
        return [{ text: `${o.name} - ${cpu}vCPU ${ram} ${disk}`, callback_data: `do:${o.id}` }];
      });
      buttons.push([{ text: '❌ Cancel', callback_data: 'main_menu' }]);
      bot.editMessageText('⚙️ <b>Step 2/5</b> — Pick a service offering:', {
        chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons }
      });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  async function deployOffering(chatId, offeringId) {
    deployState[chatId] = { ...deployState[chatId], offeringId };
    const m = await bot.sendMessage(chatId, '⏳ Loading templates…');
    try {
      const tpls = await cs.listTemplates(deployState[chatId].zoneId);
      if (!tpls.length) return bot.editMessageText('❌ No templates in this zone.', { chat_id: chatId, message_id: m.message_id });
      const buttons = tpls.slice(0, 8).map(t => [{ text: t.displaytext || t.name, callback_data: `dt:${t.id}` }]);
      buttons.push([{ text: '❌ Cancel', callback_data: 'main_menu' }]);
      bot.editMessageText('💿 <b>Step 3/5</b> — Pick a template (OS):', {
        chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons }
      });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  async function deployTemplate(chatId, templateId) {
    deployState[chatId] = { ...deployState[chatId], templateId };
    const m = await bot.sendMessage(chatId, '⏳ Loading networks…');
    try {
      const nets = await cs.listNetworks();
      const usable = nets.filter(n => n.canusefordeploy !== false);
      if (!usable.length) {
        deployState[chatId].networkId = '';
        bot.editMessageText('⚠️ No networks available. Skipping to name step.', { chat_id: chatId, message_id: m.message_id });
        return bot.sendMessage(chatId, '✏️ <b>Step 5/5</b> — Send me the VM name (or type `skip` for auto):', { parse_mode: 'HTML' });
      }
      const buttons = usable.slice(0, 8).map(n => [{ text: `${n.name} (${n.type})`, callback_data: `dn:${n.id}` }]);
      buttons.push([{ text: '❌ Cancel', callback_data: 'main_menu' }]);
      bot.editMessageText('🌐 <b>Step 4/5</b> — Pick a network:', {
        chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons }
      });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  function deployNetwork(chatId, networkId) {
    deployState[chatId] = { ...deployState[chatId], networkId };
    bot.sendMessage(chatId, '✏️ <b>Step 5/5</b> — Send me the VM name (or type `skip` for auto):', { parse_mode: 'HTML' });
  }

  async function deployConfirm(chatId, tid) {
    const s = deployState[chatId];
    if (!s?.name) return bot.sendMessage(chatId, '❌ Session lost. Start again.');

    const sess = store.getSession(tid);
    const balance = sess?.userId ? await store.getWalletBalance(sess.userId) : { inr: store.getBalance(tid) };

    // Get offering specs for dynamic pricing
    let offering;
    try {
      const offs = await cs.listOfferings();
      offering = offs.find(o => o.id === s.offeringId);
    } catch (e) { offering = null; }

    const cpu = offering?.cpunumber || 1;
    const ramGB = (offering?.memory || 1024) / 1024;
    const diskGB = offering?.rootdisksize || 10;
    const hourlyCost = billing.calculateHourlyCost(cpu, ramGB * 1024, diskGB);
    const upfrontCost = Math.ceil(hourlyCost); // charge 1 hour minimum upfront

    if ((balance.inr || 0) < upfrontCost) {
      delete deployState[chatId];
      return bot.sendMessage(chatId,
        `❌ <b>Insufficient Funds</b>\n\n` +
        `VM: ${escape(s.name)}\n` +
        `Specs: ${cpu}vCPU, ${ramGB.toFixed(1)}GB RAM, ${diskGB}GB Disk\n` +
        `Cost: <b>₹${hourlyCost.toFixed(2)}/hr</b>\n` +
        `Upfront (1hr): <b>₹${upfrontCost}</b>\n\n` +
        `Your balance: ₹${(balance.inr || 0).toFixed(2)}\n` +
        `Need: ₹${(upfrontCost - (balance.inr || 0)).toFixed(2)} more`,
        { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '➕ Top Up', callback_data: 'wallet_home' }]] } }
      );
    }

    const m = await bot.sendMessage(chatId, `🚀 Deploying VM <b>${escape(s.name)}</b>…`, { parse_mode: 'HTML' });
    try {
      const vm = await cs.deployVM({ name: s.name, zoneId: s.zoneId, offeringId: s.offeringId, templateId: s.templateId, networkId: s.networkId });
      if (sess?.userId) {
        await store.deductWalletBalance(sess.userId, upfrontCost, 'INR', `VM deploy upfront: ${s.name}`);
        // Track for ongoing billing
        if (vm?.id) {
          await billing.trackDeployment(sess.userId, vm.id, { name: s.name, cpunumber: cpu, memory: ramGB * 1024 });
        }
      }
      delete deployState[chatId];
      const newBal = (balance.inr || 0) - upfrontCost;
      bot.editMessageText(
        `✅ <b>VM Deployed!</b>\n\n` +
        `Name: <b>${escape(s.name)}</b>\n` +
        `Specs: ${cpu}vCPU, ${ramGB.toFixed(1)}GB RAM, ${diskGB}GB Disk\n` +
        `Rate: ₹${hourlyCost.toFixed(2)}/hr\n` +
        `Upfront: ₹${upfrontCost} deducted\n` +
        `Balance: ₹${newBal.toFixed(2)}\n\n` +
        `Check /vms in a minute.`,
        { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' }
      );
    } catch (e) {
      delete deployState[chatId];
      bot.editMessageText(`❌ Deploy failed: ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'HTML' });
    }
  }

  function handleDeployNameText(chatId, text) {
    const s = deployState[chatId];
    if (!s || !s.templateId || s.name) return false;
    if (text.startsWith('/')) return false;
    const raw = text.trim() === 'skip' ? ('vm-' + Date.now().toString(36)) : text.trim();

    // CloudStack rejects names with spaces or most special chars
    if (!/^[a-zA-Z0-9][a-zA-Z0-9\-]{0,62}$/.test(raw)) {
      bot.sendMessage(chatId, '❌ Invalid VM name. Use only letters, numbers, and hyphens (max 63 chars, must start with a letter or number). Try again:');
      return true;
    }

    const name = raw;
    deployState[chatId].name = name;
    bot.sendMessage(chatId,
      `✅ <b>Ready to deploy!</b>\n\n` +
      `Name:     \`${escape(name)}\`\n` +
      `Zone:     \`${escape(s.zoneId)}\`\n` +
      `Offering: \`${escape(s.offeringId)}\`\n` +
      `Template: \`${escape(s.templateId)}\`\n` +
      `Network:  \`${escape(s.networkId || 'default')}\`\n\n` +
      `Confirm?`,
      {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[
          { text: '🚀 Deploy Now', callback_data: 'deploy_confirm' },
          { text: '❌ Cancel',     callback_data: 'main_menu'      },
        ]]}
      }
    );
    return true;
  }

  function handleCallback(chatId, tid, data) {
    if (data === 'list_vms')           return listVMs(chatId, tid);
    if (data === 'list_volumes')       return listVolumes(chatId, tid);
    if (data === 'deploy_start')       return deployStart(chatId, tid);
    if (data === 'deploy_confirm')     return deployConfirm(chatId, tid);
    if (data === 'cv_confirm')         return createVolumeConfirm(chatId, tid, volumeState[chatId]?.name);
    if (data === 'db_confirm')         return deployDBConfirm(chatId, tid);
    if (data === 'deploy_db_start')    return deployDBStart(chatId, tid);
    if (data === 'createvolume')       return createVolumeStart(chatId, tid);
    if (data.startsWith('dz:'))        return deployZone(chatId, data.slice(3));
    if (data.startsWith('do:'))        return deployOffering(chatId, data.slice(3));
    if (data.startsWith('dt:'))        return deployTemplate(chatId, data.slice(3));
    if (data.startsWith('dn:'))        return deployNetwork(chatId, data.slice(3));
    if (data.startsWith('dbz:'))       return deployDBZone(chatId, data.slice(4));
    if (data.startsWith('dbo:'))       return deployDBOffering(chatId, data.slice(4));
    if (data.startsWith('dbt:'))       return deployDBTemplate(chatId, data.slice(4));
    if (data.startsWith('dbn:'))       return deployDBNetwork(chatId, data.slice(4));
    if (data.startsWith('cvz:'))       return createVolumeZone(chatId, data.slice(4));
    if (data.startsWith('cvd:'))       return createVolumeDisk(chatId, data.slice(4));
    if (data.startsWith('vm_start:'))       return startVM(chatId, data.slice(9));
    if (data.startsWith('vm_stop:'))        return stopVM(chatId, data.slice(8));
    if (data.startsWith('vm_details:'))     return vmDetails(chatId, data.slice(11));
    if (data.startsWith('vm_destroy:'))     return destroyVM(chatId, data.slice(11));
    if (data.startsWith('vm_ssh:'))         return sshInfo(chatId, data.slice(7));
    if (data.startsWith('stop_by_name:'))   return stopVMByName(chatId, tid, data.slice(13));
    if (data.startsWith('destroy_start:'))  return destroyVMByName(chatId, tid, data.slice(14));
    if (data.startsWith('ssh_info:'))       return sshInfo(chatId, data.slice(9));
    return false;
  }

  return { handleCallback, handleDeployNameText, handleVolumeNameText, handleDBNameText };
}

module.exports = { register };
