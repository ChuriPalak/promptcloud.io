// utils/tg.js — Telegram formatting helpers

function escape(text) {
  if (!text) return '';
  return String(text)
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!');
}

function mainMenu() {
  return {
    inline_keyboard: [
      [
        { text: '🖥 My VMs', callback_data: 'list_vms' },
        { text: '💰 Wallet', callback_data: 'wallet_home' },
      ],
      [
        { text: '🚀 Deploy VM', callback_data: 'deploy_start' },
        { text: '📊 Volumes', callback_data: 'list_volumes' },
      ],
      [
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
    `🖥 *${escape(vm.name)}*`,
    `   ${stateEmoji(vm.state)} ${escape(vm.state)} · \`${escape(ip)}\` · ${vm.cpunumber}vCPU · ${vm.memory}MB`,
  ].join('\n');
}

module.exports = { escape, mainMenu, stateEmoji, vmSummary };
