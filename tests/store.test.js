const test = require('node:test');
const assert = require('node:assert/strict');
const { upsertStore, removeStore, applyEnrichment } = require('../src/store.js');

const det = (o = {}) => ({
  domain: 'a.myshopify.com', customDomain: 'a.com', name: 'A',
  theme: 'Dawn', currency: 'USD', apps: ['Klaviyo'], ...o,
});

test('inserts a new store with timestamps and visitCount 1', () => {
  const out = upsertStore([], det(), 1000);
  assert.equal(out.length, 1);
  assert.equal(out[0].firstSeen, 1000);
  assert.equal(out[0].lastSeen, 1000);
  assert.equal(out[0].visitCount, 1);
});

test('revisit updates lastSeen and visitCount without duplicating', () => {
  const first = upsertStore([], det(), 1000);
  const out = upsertStore(first, det(), 2000);
  assert.equal(out.length, 1);
  assert.equal(out[0].firstSeen, 1000);
  assert.equal(out[0].lastSeen, 2000);
  assert.equal(out[0].visitCount, 2);
});

test('does not overwrite known values with nulls or empty apps', () => {
  const first = upsertStore([], det(), 1000);
  const out = upsertStore(first, det({ theme: null, currency: null, apps: [] }), 2000);
  assert.equal(out[0].theme, 'Dawn');
  assert.equal(out[0].currency, 'USD');
  assert.deepEqual(out[0].apps, ['Klaviyo']);
});

test('keeps enrichment fields across revisits', () => {
  let s = upsertStore([], det(), 1000);
  s = applyEnrichment(s, 'a.myshopify.com', { productCount: 42, description: 'Hi' });
  s = upsertStore(s, det(), 2000);
  assert.equal(s[0].productCount, 42);
  assert.equal(s[0].description, 'Hi');
});

test('does not mutate its input', () => {
  const first = upsertStore([], det(), 1000);
  const snapshot = JSON.stringify(first);
  upsertStore(first, det(), 2000);
  assert.equal(JSON.stringify(first), snapshot);
});

test('removeStore removes only the matching domain', () => {
  let s = upsertStore([], det(), 1);
  s = upsertStore(s, det({ domain: 'b.myshopify.com' }), 1);
  const out = removeStore(s, 'a.myshopify.com');
  assert.deepEqual(out.map((x) => x.domain), ['b.myshopify.com']);
});

test('applyEnrichment ignores unknown domains and null fields', () => {
  const s = upsertStore([], det(), 1);
  assert.deepEqual(applyEnrichment(s, 'nope.myshopify.com', { productCount: 1 }), s);
  const out = applyEnrichment(s, 'a.myshopify.com', { productCount: null, description: 'D', name: null });
  assert.equal(out[0].name, 'A');
  assert.equal(out[0].description, 'D');
  assert.ok(!('productCount' in out[0]) || out[0].productCount === undefined);
});
