#!/usr/bin/env bash
set -euo pipefail
git init -q
git config user.email eval@example.com
git config user.name eval

mkdir -p src
cat > CLAUDE.md <<'EOF'
# Orders API

Orders only enter the app through `loadOrder()`, which validates them with `validateOrder()`.
A loaded order always has `customer` and a non-empty string `customer.email`.
EOF

cat > src/validate.js <<'EOF'
function validateOrder(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid order');
  if (!raw.customer || typeof raw.customer.email !== 'string' || raw.customer.email === '') {
    throw new Error('Order has no customer email');
  }
  return raw;
}

module.exports = { validateOrder };
EOF

cat > src/orders.js <<'EOF'
const { validateOrder } = require('./validate');

async function loadOrder(db, id) {
  const raw = await db.find('orders', id);
  return validateOrder(raw);
}

module.exports = { loadOrder };
EOF

cat > src/receipts.js <<'EOF'
const { loadOrder } = require('./orders');

async function receiptFor(db, id) {
  const order = await loadOrder(db, id);
  return { orderId: order.id };
}

module.exports = { receiptFor };
EOF
git add -A && git commit -qm "Orders and receipts"

cat > src/receipts.js <<'EOF'
const { loadOrder } = require('./orders');

function receiptRecipient(order) {
  return order.customer.email.trim().toLowerCase();
}

async function receiptFor(db, id) {
  const order = await loadOrder(db, id);
  return { orderId: order.id, sendTo: receiptRecipient(order) };
}

module.exports = { receiptFor };
EOF
