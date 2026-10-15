const test = require('node:test');
const assert = require('node:assert/strict');
const { toCsv, COLUMNS } = require('../src/csv.js');

const rec = (o = {}) => ({
  domain: 'a.myshopify.com', customDomain: 'a.com', name: 'A', theme: 'Dawn',
  currency: 'USD', apps: ['Judge.me', 'Klaviyo'], firstSeen: 0, lastSeen: 86400000,
  visitCount: 3, ...o,
});

test('header only for an empty list', () => {
  assert.equal(toCsv([]), COLUMNS.join(',') + '\r\n');
});

test('joins apps with semicolons and formats dates as ISO', () => {
  const lines = toCsv([rec()]).trim().split('\r\n');
  assert.equal(
    lines[1],
    'a.myshopify.com,a.com,A,Dawn,USD,Judge.me;Klaviyo,,,1970-01-01T00:00:00.000Z,1970-01-02T00:00:00.000Z,3'
  );
});

test('quotes commas, quotes and newlines', () => {
  const out = toCsv([rec({ name: 'He said "hi", ok\nbye' })]);
  assert.ok(out.includes('"He said ""hi"", ok\nbye"'));
});

test('neutralizes spreadsheet formula injection', () => {
  for (const bad of ['=SUM(A1)', '+1', '-1', '@cmd', '\tx']) {
    const out = toCsv([rec({ name: bad })]);
    assert.ok(out.includes(",'" + bad), `not neutralized: ${JSON.stringify(bad)}`);
  }
});

test('missing fields become empty cells', () => {
  const lines = toCsv([rec({ theme: null, currency: undefined })]).trim().split('\r\n');
  assert.ok(lines[1].startsWith('a.myshopify.com,a.com,A,,,'));
});
