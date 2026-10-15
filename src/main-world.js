(function () {
  function buildSnapshot() {
    const S = window.Shopify;
    const shopify =
      S && typeof S === 'object'
        ? {
            shop: S.shop,
            theme: S.theme ? { name: S.theme.name } : null,
            currency: S.currency ? { active: S.currency.active } : null,
          }
        : null;
    const og = document.querySelector('meta[property="og:site_name"]');
    return {
      hostname: location.hostname,
      title: document.title,
      ogSiteName: og ? og.getAttribute('content') : null,
      metaNames: [...document.querySelectorAll('meta[name]')].map((m) => m.getAttribute('name')),
      scriptUrls: [
        ...[...document.scripts].map((s) => s.src),
        ...[...document.querySelectorAll('link[href]')].map((l) => l.href),
      ].filter(Boolean),
      shopify,
    };
  }

  document.addEventListener('shopify-detector:request', function () {
    try {
      document.dispatchEvent(
        new CustomEvent('shopify-detector:snapshot', { detail: JSON.stringify(buildSnapshot()) })
      );
    } catch (e) {
      /* never break the host page */
    }
  });
})();
