(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports ? require('./apps.js') : root.ShopifyApps
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ShopifyDetect = api;
})(typeof self !== 'undefined' ? self : this, function (apps) {
  function normalizeHost(h) {
    return String(h || '').trim().toLowerCase().replace(/^www\./, '');
  }

  function isShopifyOwned(host) {
    return host === 'shopify.com' || host.endsWith('.shopify.com');
  }

  function detectApps(urls) {
    const found = new Set();
    for (const sig of apps.APP_SIGNATURES) {
      if (urls.some((u) => typeof u === 'string' && u.includes(sig.match))) found.add(sig.name);
    }
    return [...found].sort();
  }

  function detect(snapshot) {
    const host = normalizeHost(snapshot.hostname);
    if (!host || isShopifyOwned(host)) return null;

    const s = snapshot.shopify && typeof snapshot.shopify === 'object' ? snapshot.shopify : null;
    const shop = s && typeof s.shop === 'string' && s.shop ? normalizeHost(s.shop) : null;
    const metaNames = snapshot.metaNames || [];
    const strong =
      Boolean(shop) ||
      metaNames.includes('shopify-checkout-api-token') ||
      metaNames.includes('shopify-digital-wallet');
    if (!strong) return null;

    const name =
      (snapshot.ogSiteName || '').trim() || (snapshot.title || '').trim() || host;

    return {
      domain: shop || host,
      customDomain: host,
      name,
      theme: (s && s.theme && typeof s.theme.name === 'string' && s.theme.name) || null,
      currency: (s && s.currency && typeof s.currency.active === 'string' && s.currency.active) || null,
      apps: detectApps(snapshot.scriptUrls || []),
    };
  }

  return { detect, detectApps, normalizeHost };
});
