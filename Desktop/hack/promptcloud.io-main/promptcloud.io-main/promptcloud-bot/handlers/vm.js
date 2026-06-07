// handlers/vm.js — list, deploy, start, stop, details
const store = require('../utils/store');
const cs    = require('../utils/cloudstack');
const { escape, stateEmoji, vmSummary } = require('../utils/tg');

// Per-chat deploy wizard state
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
        return bot.editMessageText('📭 No VMs found\\. Deploy one\\!', {
          chat_id: chatId, message_id: m.message_id,
          parse_mode: 'MarkdownV2',
          reply_markup: { inline_keyboard: [[{ text: '🚀 Deploy VM', callback_data: 'deploy_start' }]] }
        });
      }
      const summary = vms.map(vmSummary).join('\n\n');
      await bot.editMessageText(summary, { chat_id: chatId, message_id: m.message_id, parse_mode: 'MarkdownV2' });

      for (const vm of vms.slice(0, 8)) {
        const running = vm.state === 'Running';
        bot.sendMessage(chatId, `🖥 Actions for *${escape(vm.name)}*:`, {
          parse_mode: 'MarkdownV2',
          reply_markup: {
            inline_keyboard: [[
              running
                ? { text: '🔴 Stop',    callback_data: `vm_stop:${vm.id}`    }
                : { text: '🟢 Start',   callback_data: `vm_start:${vm.id}`   },
              { text: '🔍 Details',     callback_data: `vm_details:${vm.id}` },
            ]]
          }
        });
      }
    } catch (e) {
      bot.editMessageText(`❌ Error: ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'MarkdownV2' });
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
        `🖥 *${escape(vm.name)}*`,
        `State:      ${stateEmoji(vm.state)} ${escape(vm.state)}`,
        `Zone:       ${escape(vm.zonename)}`,
        `OS:         ${escape(vm.templatedisplaytext || vm.templatename)}`,
        `CPU:        ${vm.cpunumber} cores @ ${vm.cpuspeed || '?'} MHz`,
        `RAM:        ${vm.memory} MB`,
        `IP:         \`${escape(ip)}\``,
        `Public IP:  \`${escape(vm.publicip || '—')}\``,
        `Hypervisor: ${escape(vm.hypervisor)}`,
        `Created:    ${escape(vm.created ? new Date(vm.created).toLocaleString('en-IN') : '—')}`,
        `ID:         \`${escape(vm.id)}\``,
      ].join('\n');
      bot.editMessageText(text, { chat_id: chatId, message_id: m.message_id, parse_mode: 'MarkdownV2' });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'MarkdownV2' });
    }
  }

  // ── Start / Stop ─────────────────────────────────────────
  async function startVM(chatId, id) {
    const m = await bot.sendMessage(chatId, '⏳ Starting VM…');
    try {
      await cs.startVM(id);
      bot.editMessageText('🟢 Start command sent\\! VM booting up\\.', { chat_id: chatId, message_id: m.message_id, parse_mode: 'MarkdownV2' });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'MarkdownV2' });
    }
  }

  async function stopVM(chatId, id) {
    const m = await bot.sendMessage(chatId, '⏳ Stopping VM…');
    try {
      await cs.stopVM(id);
      bot.editMessageText('🔴 Stop command sent\\! VM shutting down\\.', { chat_id: chatId, message_id: m.message_id, parse_mode: 'MarkdownV2' });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'MarkdownV2' });
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
        `💾 *${escape(v.name)}*\n  ${Math.round((v.size || 0) / 1073741824)} GB · ${escape(v.type)} · ${escape(v.state)}`
      ).join('\n\n');
      bot.editMessageText(text, { chat_id: chatId, message_id: m.message_id, parse_mode: 'MarkdownV2' });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'MarkdownV2' });
    }
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
      bot.editMessageText('🌍 *Step 1/4* — Pick a zone:', {
        chat_id: chatId, message_id: m.message_id,
        parse_mode: 'MarkdownV2',
        reply_markup: { inline_keyboard: buttons }
      });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'MarkdownV2' });
    }
  }

  async function deployZone(chatId, zoneId) {
    deployState[chatId] = { zoneId };
    const m = await bot.sendMessage(chatId, '⏳ Loading offerings…');
    try {
      const offs = await cs.listOfferings();
      const buttons = offs.slice(0, 8).map(o => [{ text: `${o.name} — ${o.cpunumber}vCPU·${o.memory}MB`, callback_data: `do:${o.id}` }]);
      buttons.push([{ text: '❌ Cancel', callback_data: 'main_menu' }]);
      bot.editMessageText('⚙️ *Step 2/4* — Pick a service offering:', {
        chat_id: chatId, message_id: m.message_id,
        parse_mode: 'MarkdownV2',
        reply_markup: { inline_keyboard: buttons }
      });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'MarkdownV2' });
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
      bot.editMessageText('💿 *Step 3/4* — Pick a template \\(OS\\):', {
        chat_id: chatId, message_id: m.message_id,
        parse_mode: 'MarkdownV2',
        reply_markup: { inline_keyboard: buttons }
      });
    } catch (e) {
      bot.editMessageText(`❌ ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'MarkdownV2' });
    }
  }

  function deployTemplate(chatId, templateId) {
    deployState[chatId] = { ...deployState[chatId], templateId };
    bot.sendMessage(chatId, '✏️ *Step 4/4* — Send me the VM name \\(or type `skip` for auto\\):', { parse_mode: 'MarkdownV2' });
  }

  async function deployConfirm(chatId) {
    const s = deployState[chatId];
    if (!s?.name) return bot.sendMessage(chatId, '❌ Session lost. Start again.');
    const m = await bot.sendMessage(chatId, '🚀 Deploying VM…');
    try {
      await cs.deployVM({ name: s.name, zoneId: s.zoneId, offeringId: s.offeringId, templateId: s.templateId });
      delete deployState[chatId];
      bot.editMessageText(`✅ VM *${escape(s.name)}* is deploying\\! Check /vms in a minute\\.`, {
        chat_id: chatId, message_id: m.message_id, parse_mode: 'MarkdownV2'
      });
    } catch (e) {
      delete deployState[chatId];
      bot.editMessageText(`❌ Deploy failed: ${escape(e.message)}`, { chat_id: chatId, message_id: m.message_id, parse_mode: 'MarkdownV2' });
    }
  }

  // Capture VM name during deploy wizard
  function handleDeployNameText(chatId, text) {
    const s = deployState[chatId];
    if (!s || !s.templateId || s.name) return false;
    if (text.startsWith('/')) return false;
    const name = text.trim() === 'skip' ? ('vm-' + Date.now().toString(36)) : text.trim();
    deployState[chatId].name = name;
    bot.sendMessage(chatId,
      `✅ *Ready to deploy\\!*\n\nName:     \`${escape(name)}\`\nZone:     \`${escape(s.zoneId)}\`\nOffering: \`${escape(s.offeringId)}\`\nTemplate: \`${escape(s.templateId)}\`\n\nConfirm?`,
      {
        parse_mode: 'MarkdownV2',
        reply_markup: { inline_keyboard: [[
          { text: '🚀 Deploy Now', callback_data: 'deploy_confirm' },
          { text: '❌ Cancel',     callback_data: 'main_menu'      },
        ]]}
      }
    );
    return true;
  }

  function handleCallback(chatId, tid, data) {
    if (data === 'list_vms')      return listVMs(chatId, tid);
    if (data === 'list_volumes')  return listVolumes(chatId, tid);
    if (data === 'deploy_start')  return deployStart(chatId, tid);
    if (data === 'deploy_confirm')return deployConfirm(chatId);
    if (data.startsWith('dz:'))   return deployZone(chatId, data.slice(3));
    if (data.startsWith('do:'))   return deployOffering(chatId, data.slice(3));
    if (data.startsWith('dt:'))   return deployTemplate(chatId, data.slice(3));
    if (data.startsWith('vm_start:'))   return startVM(chatId, data.slice(9));
    if (data.startsWith('vm_stop:'))    return stopVM(chatId, data.slice(8));
    if (data.startsWith('vm_details:')) return vmDetails(chatId, data.slice(11));
    return false;
  }

  return { handleCallback, handleDeployNameText };
}

module.exports = { register };
