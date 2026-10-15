(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ShopifyApps = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const APP_SIGNATURES = [
    { name: 'Judge.me', match: 'judge.me' },
    { name: 'Klaviyo', match: 'klaviyo.com' },
    { name: 'Loox', match: 'loox.io' },
    { name: 'Gorgias', match: 'gorgias.chat' },
    { name: 'Okendo', match: 'okendo.io' },
    { name: 'Privy', match: 'privy.com' },
    { name: 'Recharge', match: 'rechargeapps.com' },
    { name: 'Recharge', match: 'rechargecdn.com' },
    { name: 'Smile.io', match: 'smile.io' },
    { name: 'Stamped', match: 'stamped.io' },
    { name: 'Yotpo', match: 'yotpo.com' },
  ];
  return { APP_SIGNATURES };
});
