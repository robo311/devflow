#!/usr/bin/env bash
set -euo pipefail
git init -q
git config user.email eval@example.com
git config user.name eval

mkdir -p src/handlers src/client
cat > CLAUDE.md <<'EOF'
# Shop API

Express-style HTTP handlers in src/handlers, a small browser client in src/client.
EOF

cat > src/http.js <<'EOF'
function respondError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

module.exports = { respondError };
EOF

cat > src/handlers/users.js <<'EOF'
const { respondError } = require('../http');

function getUser(db) {
  return (req, res) => {
    const user = db.users.find((u) => u.id === req.params.id);
    if (!user) return respondError(res, 404, 'not_found', 'User not found');
    return res.json(user);
  };
}

module.exports = { getUser };
EOF

cat > src/handlers/products.js <<'EOF'
const { respondError } = require('../http');

function getProduct(db) {
  return (req, res) => {
    const product = db.products.find((p) => p.id === req.params.id);
    if (!product) return respondError(res, 404, 'not_found', 'Product not found');
    return res.json(product);
  };
}

module.exports = { getProduct };
EOF

cat > src/client/api.js <<'EOF'
async function request(path) {
  const res = await fetch(path);
  const body = await res.json();
  if (!res.ok) {
    if (body.error.code === 'not_found') return null;
    throw new Error(body.error.message);
  }
  return body;
}

module.exports = { request };
EOF
git add -A && git commit -qm "Users and products"

cat > src/handlers/orders.js <<'EOF'
function getOrder(db) {
  return (req, res) => {
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    return res.json(order);
  };
}

module.exports = { getOrder };
EOF
