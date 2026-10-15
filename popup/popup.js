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

function button(label, onClick) {
  const b = el('button', '', label);
  b.addEventListener('click', onClick);
  return b;
}

function render() {
  const q = $('search').value.trim().toLowerCase();
  const shown = stores
    .filter((s) => !q || [s.domain, s.customDomain, s.name, s.theme].some((v) => String(v || '').toLowerCase().includes(q)))
    .sort((a, b) => b.lastSeen - a.lastSeen);

  $('count').textContent = `(${stores.length})`;
  $('empty').hidden = stores.length > 0;
  const list = $('list');
  list.replaceChildren();

  for (const s of shown) {
    const li = el('li');
    const top = el('div', 'row-top');
    top.append(el('span', 'name', s.name));
    const actions = el('span', 'actions');
    actions.append(
      button('Enrich', () => enrich(s)),
      button('Delete', () => remove(s))
    );
    top.append(actions);
    li.append(top);

    const bits = [s.customDomain, s.theme && `Theme: ${s.theme}`, s.currency, s.productCount != null && `${s.productCount} products`]
      .filter(Boolean);
    li.append(el('div', 'meta', bits.join(' · ')));
    if (s.apps && s.apps.length) li.append(el('div', 'meta', `Apps: ${s.apps.join(', ')}`));
    if (s.description) li.append(el('div', 'desc', s.description));
    li.append(el('div', 'meta', `Seen ${s.visitCount}× · last ${new Date(s.lastSeen).toLocaleString()}`));
    list.append(li);
  }
}

async function load() {
  const data = await chrome.storage.local.get(['stores', 'logIncognito']);
  stores = data.stores || [];
  $('incognito').checked = Boolean(data.logIncognito);
  render();
}

async function remove(store) {
  try { await send({ type: 'delete-store', domain: store.domain }); } catch (e) { setStatus(e.message, true); }
}

async function enrich(store) {
  setStatus('');
  try {
    // permissions.request must run directly inside the click gesture.
    const granted = await chrome.permissions.request({ origins: [`https://${store.customDomain}/*`] });
    if (!granted) return setStatus('Permission denied; cannot enrich.', true);
    const res = await fetch(`https://${store.customDomain}/meta.json`, { credentials: 'omit' });
    if (!res.ok) throw new Error(`meta.json returned ${res.status}`);
    const meta = await res.json();
    await send({
      type: 'enrich-store',
      domain: store.domain,
      data: {
        productCount: Number.isFinite(meta.published_products_count) ? meta.published_products_count : null,
        description: typeof meta.description === 'string' ? meta.description : null,
        name: typeof meta.name === 'string' ? meta.name : null,
      },
    });
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
