const test = require('node:test');
const assert = require('node:assert/strict');
const { detect } = require('../src/detect.js');

function snap(overrides = {}) {
  return {
    hostname: 'example.com',
    title: 'Example',
    ogSiteName: null,
    metaNames: [],
    scriptUrls: [],
    shopify: null,
    ...overrides,
  };
}

test('detects a store via window.Shopify and keys it by the myshopify domain', () => {
  const r = detect(snap({
    hostname: 'www.coolshop.com',
    title: 'Cool Shop – Home',
    ogSiteName: ' Cool Shop ',
    shopify: { shop: 'Cool-Shop.myshopify.com', theme: { name: 'Dawn' }, currency: { active: 'USD' } },
  }));
  assert.deepEqual(r, {
    domain: 'cool-shop.myshopify.com',
    customDomain: 'coolshop.com',
    name: 'Cool Shop',
    theme: 'Dawn',
    currency: 'USD',
    apps: [],
  });
});

test('detects via shopify-digital-wallet meta when window.Shopify is absent', () => {
  const r = detect(snap({ hostname: 'www.shop.io', metaNames: ['shopify-digital-wallet'] }));
  assert.equal(r.domain, 'shop.io');
  assert.equal(r.customDomain, 'shop.io');
});

test('detects via shopify-checkout-api-token meta', () => {
  assert.ok(detect(snap({ metaNames: ['shopify-checkout-api-token'] })));
});

test('returns null for a plain page', () => {
  assert.equal(detect(snap()), null);
});

test('returns null for a page that only mentions Shopify in its title', () => {
  assert.equal(detect(snap({ title: 'Shopify vs WooCommerce: which is better?' })), null);
});

test('returns null for a page that only loads cdn.shopify.com assets', () => {
  assert.equal(
    detect(snap({ scriptUrls: ['https://cdn.shopify.com/s/files/1/0001/buy-button.js'] })),
    null
  );
});

test('ignores shopify.com properties but accepts myshopify.com stores', () => {
  const shopify = { shop: 'x.myshopify.com' };
  assert.equal(detect(snap({ hostname: 'shopify.com', shopify })), null);
  assert.equal(detect(snap({ hostname: 'admin.shopify.com', shopify })), null);
  assert.ok(detect(snap({ hostname: 'foo.myshopify.com', shopify })));
});

test('handles a partial Shopify object without throwing', () => {
  const r = detect(snap({ shopify: { shop: 'a.myshopify.com' } }));
  assert.equal(r.theme, null);
  assert.equal(r.currency, null);
});

test('treats a non-string Shopify.shop as no signal', () => {
  assert.equal(detect(snap({ shopify: { shop: {} } })), null);
});

test('detects, sorts and dedupes known apps from script URLs', () => {
  const r = detect(snap({
    metaNames: ['shopify-digital-wallet'],
    scriptUrls: [
      'https://static.klaviyo.com/onsite/js/klaviyo.js',
      'https://static.klaviyo.com/onsite/js/other.js',
      'https://cdn.judge.me/widget.js',
    ],
  }));
  assert.deepEqual(r.apps, ['Judge.me', 'Klaviyo']);
});

test('name falls back from og:site_name to title to hostname', () => {
  const base = { metaNames: ['shopify-digital-wallet'], hostname: 'www.fallback.com' };
  assert.equal(detect(snap({ ...base, ogSiteName: 'OG', title: 'T' })).name, 'OG');
  assert.equal(detect(snap({ ...base, ogSiteName: '', title: ' T ' })).name, 'T');
  assert.equal(detect(snap({ ...base, ogSiteName: null, title: '' })).name, 'fallback.com');
});
