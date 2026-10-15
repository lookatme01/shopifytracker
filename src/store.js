(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ShopifyStore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  function definedOnly(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== null && v !== undefined) out[k] = v;
    }
    return out;
  }

  function upsertStore(stores, detected, now) {
    const i = stores.findIndex((s) => s.domain === detected.domain);
    if (i === -1) {
      return [...stores, { ...detected, apps: [...detected.apps], firstSeen: now, lastSeen: now, visitCount: 1 }];
    }
    const prev = stores[i];
    const merged = {
      ...prev,
      ...definedOnly(detected),
      apps: detected.apps.length ? [...detected.apps] : prev.apps,
      firstSeen: prev.firstSeen,
      lastSeen: now,
      visitCount: prev.visitCount + 1,
    };
    const next = stores.slice();
    next[i] = merged;
    return next;
  }

  function removeStore(stores, domain) {
    return stores.filter((s) => s.domain !== domain);
  }

  function applyEnrichment(stores, domain, data) {
    const i = stores.findIndex((s) => s.domain === domain);
    if (i === -1) return stores;
    const next = stores.slice();
    next[i] = { ...stores[i], ...definedOnly({
      productCount: data.productCount,
      description: data.description,
      name: data.name,
    }) };
    return next;
  }

  return { upsertStore, removeStore, applyEnrichment };
});
