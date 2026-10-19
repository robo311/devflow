#!/usr/bin/env bash
set -euo pipefail
git init -q
git config user.email eval@example.com
git config user.name eval

mkdir -p src
cat > README.md <<'EOF'
# Ordres API

Small Node HTTP API for listing and fetching orders.
EOF

cat > src/orders.js <<'EOF'
function listOrders(db) {
  return db.orders;
}

module.exports = { listOrders };
EOF
git add -A && git commit -qm "Init"
