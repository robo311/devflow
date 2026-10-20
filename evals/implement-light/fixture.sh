#!/usr/bin/env bash
set -euo pipefail
git init -q
git config user.email eval@example.com
git config user.name eval

mkdir -p src/handlers test .flow/order-status
cat > CLAUDE.md <<'EOF'
# Shop API

Express-style handlers in src/handlers, registered in src/routes.js. Errors go through
`respondError()` from src/http.js. Run tests with `npm test`.
EOF

cat > package.json <<'EOF'
{
  "name": "shop-api",
  "private": true,
  "scripts": { "test": "node --test" }
}
EOF

cat > src/http.js <<'EOF'
function respondError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

module.exports = { respondError };
EOF

cat > src/handlers/orders.js <<'EOF'
const { respondError } = require('../http');

function getOrder(db) {
  return (req, res) => {
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return respondError(res, 404, 'not_found', 'Order not found');
    return res.json(order);
  };
}

module.exports = { getOrder };
EOF

cat > src/routes.js <<'EOF'
const { getOrder } = require('./handlers/orders');

function registerRoutes(app, db) {
  app.get('/orders/:id', getOrder(db));
}

module.exports = { registerRoutes };
EOF

cat > test/orders.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { getOrder } = require('../src/handlers/orders');

function fakeRes() {
  return { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
}

test('returns 404 for a missing order', () => {
  const res = fakeRes();
  getOrder({ orders: [] })({ params: { id: 'x' } }, res);
  assert.strictEqual(res.code, 404);
});
EOF
git add -A && git commit -qm "Orders endpoint"

echo ".flow/" >> .git/info/exclude
cat > .flow/order-status/plan.md <<'EOF'
## Order status endpoint
Status: approved
Tier: light (one small endpoint following an existing pattern) · review: deep (public API contract)

Intent:      API consumers can fetch just an order's status.
Change:      new handler getOrderStatus in src/handlers/orders.js, registered as
             GET /orders/:id/status in src/routes.js, plus a test in test/orders.test.js.
Behaviour:   new endpoint; existing endpoints unchanged.
Affects:     nothing else (no existing callers).
Decisions:   response is { "status": order.status }  [you]
             missing order → 404 via respondError, same as GET /orders/:id  [you]

### Parts
1. Order status endpoint  (layer: be · depends on: none)
   Changes:    src/handlers/orders.js, src/routes.js, test/orders.test.js
   Acceptance: GET /orders/:id/status returns 200 { status } for an existing order;
               returns 404 { error: { code: "not_found", ... } } for a missing one.
   Tasks:
   - [ ] add getOrderStatus to src/handlers/orders.js, with tests for 200 and 404
   - [ ] register GET /orders/:id/status in src/routes.js
   - [ ] run npm test

Done when:   npm test passes with tests for both criteria.
EOF
