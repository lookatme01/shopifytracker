importScripts('store.js');

let queue = Promise.resolve();
function enqueue(task) {
  const run = queue.then(task);
  queue = run.catch(() => {});
  return run;
}

async function readStores() {
  const { stores = [] } = await chrome.storage.local.get('stores');
  return stores;
}

function setBadge(tabId) {
  if (tabId == null) return;
  chrome.action.setBadgeText({ tabId, text: 'S' });
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#008060' });
}

async function enrichFetch(domain) {
  const store = (await readStores()).find((s) => s.domain === domain);
  if (!store) throw new Error('Store is no longer in the list');
  const host = store.siteHost || store.customDomain;
  if (!(await chrome.permissions.contains({ origins: [`https://${host}/*`] }))) {
    throw new Error('Permission for this site was not granted');
  }
  const res = await fetch(`https://${host}/meta.json`, { credentials: 'omit' });
  if (!res.ok) throw new Error(`meta.json returned ${res.status}`);
  const data = ShopifyStore.enrichmentFromMeta(await res.json());
  const stores = await readStores();
  await chrome.storage.local.set({ stores: ShopifyStore.applyEnrichment(stores, domain, data) });
}

const handlers = {
  async 'store-detected'(msg, sender) {
    const d = msg.detected;
    if (!d || typeof d.domain !== 'string' || !Array.isArray(d.apps)) return;
    const { logIncognito = false } = await chrome.storage.local.get('logIncognito');
    if (sender.tab && sender.tab.incognito && !logIncognito) return;
    const stores = await readStores();
    await chrome.storage.local.set({ stores: ShopifyStore.upsertStore(stores, d, Date.now()) });
    setBadge(sender.tab && sender.tab.id);
  },
  async 'delete-store'(msg) {
    const stores = await readStores();
    await chrome.storage.local.set({ stores: ShopifyStore.removeStore(stores, msg.domain) });
  },
  async 'clear-stores'() {
    await chrome.storage.local.set({ stores: [] });
  },
  async 'enrich-fetch'(msg) {
    await enrichFetch(msg.domain);
  },
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const handler = msg && handlers[msg.type];
  if (!handler) return false;
  enqueue(() => handler(msg, sender))
    .then(() => sendResponse({ ok: true }))
    .catch((e) => sendResponse({ ok: false, error: String(e) }));
  return true;
});

// The permission prompt can close the popup; finish the enrich it started from here.
chrome.permissions.onAdded.addListener(async () => {
  const { pendingEnrich } = await chrome.storage.local.get('pendingEnrich');
  if (!pendingEnrich) return;
  await chrome.storage.local.remove('pendingEnrich');
  enqueue(() => enrichFetch(pendingEnrich)).catch(() => {});
});
