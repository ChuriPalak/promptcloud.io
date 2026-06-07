// utils/tg.js — Telegram formatting helpers

function escape(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function mainMenu() {
  return {
    inline_keyboard: [
      [
        { text: '🖥 My VMs', callback_data: 'list_vms' },
        { text: '🚀 Deploy VM', callback_data: 'deploy_start' },
      ],
      [
        { text: '💾 Volumes', callback_data: 'list_volumes' },
        { text: '💰 Wallet', callback_data: 'wallet_home' },
      ],
      [
        { text: '📊 History', callback_data: 'tx_history' },
        { text: '🔒 Sign Out', callback_data: 'signout' },
      ],
    ],
  };
}

function stateEmoji(state) {
  const map = {
    Running: '🟢',
    Stopped: '🔴',
    Starting: '🟡',
    Stopping: '🟡',
    Destroyed: '⚫',
    Error: '❌',
  };
  return map[state] || '⚪';
}

function vmSummary(vm) {
  const ip = vm.nic?.[0]?.ipaddress || '—';
  return [
    `🖥 <b>${escape(vm.name)}</b>`,
    `   ${stateEmoji(vm.state)} ${escape(vm.state)} - \`${escape(ip)}\` - ${escape(String(vm.cpunumber))}vCPU - ${escape(String(vm.memory))}MB`,
  ].join('\n');
}

module.exports = { escape, mainMenu, stateEmoji, vmSummary };
