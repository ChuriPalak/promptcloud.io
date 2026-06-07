// utils/cloudstack.js
const crypto = require('crypto');
const fetch  = (...a) => import('node-fetch').then(({ default: f }) => f(...a));

const CS_URL    = process.env.CLOUDSTACK_API_URL;
const CS_KEY    = process.env.CLOUDSTACK_API_KEY;
const CS_SECRET = process.env.CLOUDSTACK_SECRET_KEY;

function sign(secret, message) {
  return crypto.createHmac('sha1', secret).update(message).digest('base64');
}

async function csRequest(command, extra = {}) {
  const params = { command, apiKey: CS_KEY, response: 'json', ...extra };
  const sorted = Object.keys(params).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const qs     = sorted.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  const sig    = sign(CS_SECRET, qs.toLowerCase());
  const res    = await fetch(`${CS_URL}?${qs}&signature=${encodeURIComponent(sig)}`);
  if (!res.ok) throw new Error(`CloudStack HTTP ${res.status}`);
  return res.json();
}

const listVMs      = ()           => csRequest('listVirtualMachines', { listall: 'true' }).then(d => d?.listvirtualmachinesresponse?.virtualmachine || []);
const getVM        = id           => csRequest('listVirtualMachines', { id, listall: 'true' }).then(d => (d?.listvirtualmachinesresponse?.virtualmachine || [])[0] || null);
const startVM      = id           => csRequest('startVirtualMachine', { id });
const stopVM       = id           => csRequest('stopVirtualMachine',  { id });
const listZones    = ()           => csRequest('listZones').then(d => d?.listzonesresponse?.zone || []);
const listOfferings= ()           => csRequest('listServiceOfferings').then(d => d?.listserviceofferingsresponse?.serviceoffering || []);
const listTemplates= zoneId       => csRequest('listTemplates', { templatefilter: 'featured', zoneid: zoneId }).then(d => d?.listtemplatesresponse?.template || []);
const deployVM     = p            => csRequest('deployVirtualMachine', { name: p.name, zoneid: p.zoneId, serviceofferingid: p.offeringId, templateid: p.templateId });
const listVolumes  = ()           => csRequest('listVolumes', { listall: 'true' }).then(d => d?.listvolumesresponse?.volume || []);

module.exports = { csRequest, listVMs, getVM, startVM, stopVM, listZones, listOfferings, listTemplates, deployVM, listVolumes };
