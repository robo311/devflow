#!/usr/bin/env bash
set -euo pipefail
git init -q
git config user.email eval@example.com
git config user.name eval

mkdir -p src test
cat > CLAUDE.md <<'EOF'
# Orders API

Small Node HTTP API. The UI is Slovak only. Money is stored as integer cents (`totalCents`).
Run tests with `npm test`.
EOF

cat > package.json <<'EOF'
{
  "name": "orders-api",
  "private": true,
  "scripts": { "test": "node --test" }
}
EOF

cat > src/orders.js <<'EOF'
function orderSummary(order) {
  return {
    id: order.id,
    items: order.items.length,
    totalCents: order.totalCents,
  };
}

module.exports = { orderSummary };
EOF

cat > test/orders.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { orderSummary } = require('../src/orders');

test('summarises an order', () => {
  const summary = orderSummary({ id: 'o1', items: [{}, {}], totalCents: 1250 });
  assert.strictEqual(summary.items, 2);
  assert.strictEqual(summary.totalCents, 1250);
});
EOF
git add -A && git commit -qm "Order summary"

cat > src/price.js <<'EOF'
const formatter = new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' });

function formatPrice(cents) {
  return formatter.format(cents / 100);
}

module.exports = { formatPrice };
EOF

cat > src/orders.js <<'EOF'
const { formatPrice } = require('./price');

function orderSummary(order) {
  return {
    id: order.id,
    items: order.items.length,
    totalCents: order.totalCents,
    totalFormatted: formatPrice(order.totalCents),
  };
}

module.exports = { orderSummary };
EOF

cat > test/price.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { formatPrice } = require('../src/price');

test('formats cents as euros', () => {
  assert.match(formatPrice(1250), /^12,50\s€$/);
  assert.match(formatPrice(0), /^0,00\s€$/);
});
EOF
