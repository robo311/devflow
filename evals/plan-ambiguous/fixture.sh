#!/usr/bin/env bash
set -euo pipefail
git init -q
git config user.email eval@example.com
git config user.name eval

mkdir -p src test
cat > CLAUDE.md <<'EOF'
# Orders API

Small Node HTTP API. Money is stored as integer cents. Run tests with `npm test`.
EOF

cat > package.json <<'EOF'
{
  "name": "orders-api",
  "private": true,
  "scripts": { "test": "node --test" }
}
EOF

cat > src/orders.js <<'EOF'
function orderTotal(order) {
  return order.items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
}

function createOrder(db, input) {
  const order = { id: db.nextId(), items: input.items, customerId: input.customerId };
  order.totalCents = orderTotal(order);
  db.orders.push(order);
  return order;
}

module.exports = { orderTotal, createOrder };
EOF

cat > test/orders.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { orderTotal } = require('../src/orders');

test('sums item prices', () => {
  assert.strictEqual(orderTotal({ items: [{ priceCents: 500, quantity: 2 }] }), 1000);
});
EOF
git add -A && git commit -qm "Orders"
