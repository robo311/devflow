#!/usr/bin/env bash
set -euo pipefail
git init -q
git config user.email eval@example.com
git config user.name eval

mkdir -p src/jobs src/export docs test
cat > CLAUDE.md <<'MD'
# Orders API

Node HTTP API for an online shop. Money is stored as integer cents, in EUR. Run tests with `npm test`.
MD

cat > package.json <<'JSON'
{
  "name": "orders-api",
  "private": true,
  "scripts": { "test": "node --test" }
}
JSON

cat > src/orders.js <<'JS'
function orderTotal(order) {
  return order.items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
}

function createOrder(db, input) {
  const order = {
    id: db.nextId(),
    customerId: input.customerId,
    items: input.items,
    createdAt: new Date().toISOString(),
  };
  order.totalCents = orderTotal(order);
  db.orders.push(order);
  return order;
}

module.exports = { orderTotal, createOrder };
JS

cat > src/invoice.js <<'JS'
function formatAmount(cents) {
  return `${(cents / 100).toFixed(2)} €`;
}

function renderInvoice(order) {
  const lines = order.items.map(i => `${i.name} x${i.quantity}  ${formatAmount(i.priceCents * i.quantity)}`);
  return [`Invoice #${order.id}`, ...lines, `Total: ${formatAmount(order.totalCents)}`].join('\n');
}

module.exports = { formatAmount, renderInvoice };
JS

cat > src/jobs/daily-revenue.js <<'JS'
// Runs every night at 01:00; the result is emailed to finance.
function dailyRevenue(db, day) {
  const orders = db.orders.filter(o => o.createdAt.startsWith(day));
  const totalCents = orders.reduce((sum, o) => sum + o.totalCents, 0);
  return { day, orders: orders.length, totalCents };
}

module.exports = { dailyRevenue };
JS

cat > src/export/accounting.js <<'JS'
// Nightly CSV picked up by the accounting software. Columns are fixed, see docs/accounting.md.
function accountingCsv(orders) {
  const rows = orders.map(o => [o.id, o.createdAt.slice(0, 10), (o.totalCents / 100).toFixed(2)].join(';'));
  return ['id;date;total_eur', ...rows].join('\n');
}

module.exports = { accountingCsv };
JS

cat > docs/accounting.md <<'MD'
# Accounting export

The accounting software imports `accountingCsv` output every night. Its import accepts exactly
the columns `id;date;total_eur` and amounts in EUR only. Changing the format needs a change on
the vendor's side, which goes through our support contract with them.
MD

cat > test/orders.test.js <<'JS'
const test = require('node:test');
const assert = require('node:assert');
const { orderTotal } = require('../src/orders');

test('sums item prices', () => {
  assert.strictEqual(orderTotal({ items: [{ priceCents: 500, quantity: 2 }] }), 1000);
});
JS
git add -A && git commit -qm "Orders API"
