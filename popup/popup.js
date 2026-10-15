const $ = (id) => document.getElementById(id);
let stores = [];

function setStatus(text, isError) {
  const el = $('status');
  el.textContent = text;
  el.className = isError ? 'error' : '';
}

function send(message) {
  return chrome.runtime.sendMessage(message).then((res) => {
    if (!res || !res.ok) throw new Error((res && res.error) || 'Request failed');
    return res;
  });
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label, onClick, className) {
  const b = el('button', className || '', label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

// Stores first logged after this moment are flagged NEW; set from the previous popup open.
let lastOpened = Date.now();

function field(label, value, valueClass) {
  const box = el('div');
  box.append(el('dt', '', label), el('dd', valueClass || '', value || '\u2014'));
  return box;
}

function when(ts) {
  const day = 86400000;
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  if (ts >= startOfToday) return 'today';
  if (ts >= startOfToday - day) return 'yesterday';
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function render() {
  const q = $('search').value.trim().toLowerCase();
  const shown = stores
    .filter((s) => !q || [s.domain, s.customDomain, s.name, s.theme].some((v) => String(v || '').toLowerCase().includes(q)))
    .sort((a, b) => b.lastSeen - a.lastSeen);

  $('count').textContent = String(stores.length);
  $('empty').hidden = shown.length > 0;
  $('empty').textContent = stores.length
    ? 'No stores match that search.'
    : 'Nothing logged yet. Visit a Shopify store and it will be listed here.';
  const list = $('list');
  list.replaceChildren();

  for (const s of shown) {
    const isNew = s.firstSeen > lastOpened;
    const li = el('li', isNew ? 'row is-new' : 'row');

    const head = el('div', 'row-head');
    head.append(el('span', 'name', s.name));
    if (isNew) head.append(el('span', 'tag', 'NEW'));
    const actions = el('span', 'row-actions');
    actions.append(
      button('Enrich', () => enrich(s)),
      button('Delete', () => remove(s), 'danger')
    );
    head.append(actions);
    li.append(head);

    const fields = el('dl', 'fields');
    fields.append(field('Domain', s.customDomain, 'domain'), field('Theme', s.theme), field('Cur', s.currency));
    li.append(fields);

    const bits = [`Seen ${s.visitCount}\u00d7`, `last ${when(s.lastSeen)}`];
    if (s.productCount != null) bits.push(`${s.productCount} products`);
    if (s.apps && s.apps.length) bits.push(s.apps.join(', '));
    li.append(el('p', 'note', bits.join(' \u00b7 ')));
    if (s.description) li.append(el('p', 'desc', s.description));
    list.append(li);
  }
}

async function load() {
  const data = await chrome.storage.local.get(['stores', 'logIncognito', 'lastOpened']);
  stores = data.stores || [];
  if (typeof data.lastOpened === 'number') lastOpened = data.lastOpened;
  $('incognito').checked = Boolean(data.logIncognito);
  render();
  chrome.storage.local.set({ lastOpened: Date.now() });
}

async function remove(store) {
  try { await send({ type: 'delete-store', domain: store.domain }); } catch (e) { setStatus(e.message, true); }
}

async function enrich(store) {
  setStatus('');
  try {
    const host = store.siteHost || store.customDomain;
    // permissions.request must be called directly inside the click gesture.
    const request = chrome.permissions.request({ origins: [`https://${host}/*`] });
    // The prompt can close this popup; the service worker finishes the job from this marker.
    chrome.storage.local.set({ pendingEnrich: store.domain });
    const granted = await request;
    await chrome.storage.local.remove('pendingEnrich');
    if (!granted) return setStatus('Permission denied; cannot enrich.', true);
    await send({ type: 'enrich-fetch', domain: store.domain });
    setStatus(`Enriched ${store.customDomain}.`);
  } catch (e) {
    setStatus(`Enrich failed: ${e.message}`, true);
  }
}

function download(filename, mime, text) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stamp() { return new Date().toISOString().slice(0, 10); }

$('export-csv').addEventListener('click', () =>
  download(`shopify-stores-${stamp()}.csv`, 'text/csv;charset=utf-8', ShopifyCsv.toCsv(stores)));
$('export-json').addEventListener('click', () =>
  download(`shopify-stores-${stamp()}.json`, 'application/json', JSON.stringify(stores, null, 2)));
$('clear').addEventListener('click', async () => {
  if (!stores.length || !confirm(`Delete all ${stores.length} saved stores? This cannot be undone.`)) return;
  try { await send({ type: 'clear-stores' }); } catch (e) { setStatus(e.message, true); }
});
$('incognito').addEventListener('change', (e) => chrome.storage.local.set({ logIncognito: e.target.checked }));
$('search').addEventListener('input', render);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.stores) { stores = changes.stores.newValue || []; render(); }
});

load();
