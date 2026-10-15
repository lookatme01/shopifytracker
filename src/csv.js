(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ShopifyCsv = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const COLUMNS = [
    'domain', 'customDomain', 'name', 'theme', 'currency', 'apps',
    'productCount', 'description', 'firstSeen', 'lastSeen', 'visitCount',
  ];
  const DATE_COLUMNS = new Set(['firstSeen', 'lastSeen']);

  function cell(column, value) {
    if (value === null || value === undefined) return '';
    let s;
    if (Array.isArray(value)) s = value.join(';');
    else if (DATE_COLUMNS.has(column) && typeof value === 'number') s = new Date(value).toISOString();
    else s = String(value);
    if (typeof value !== 'number' && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function toCsv(stores) {
    const rows = stores.map((st) => COLUMNS.map((c) => cell(c, st[c])).join(','));
    return [COLUMNS.join(','), ...rows].join('\r\n') + '\r\n';
  }

  return { toCsv, COLUMNS };
});
