#!/usr/bin/env bash
set -euo pipefail
git init -q
git config user.email eval@example.com
git config user.name eval

mkdir -p src
cat > CLAUDE.md <<'EOF'
# Orders API

Small Node HTTP API. Pages are 1-based everywhere: `?page=1` is the first page.
EOF

cat > src/http.js <<'EOF'
function readPaging(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const size = Math.min(100, Math.max(1, Number(query.size) || 20));
  return { page, size };
}

module.exports = { readPaging };
EOF

cat > src/orders.js <<'EOF'
const { readPaging } = require('./http');

function listOrders(db, query) {
  const { page, size } = readPaging(query);
  const all = db.orders.slice().sort((a, b) => b.createdAt - a.createdAt);
  return { page, size, total: all.length, items: all };
}

module.exports = { listOrders };
EOF
git add -A && git commit -qm "Orders list"

cat > src/paginate.js <<'EOF'
function paginate(items, page, size) {
  return items.slice(page * size, page * size + size);
}

module.exports = { paginate };
EOF

cat > src/orders.js <<'EOF'
const { readPaging } = require('./http');
const { paginate } = require('./paginate');

function listOrders(db, query) {
  const { page, size } = readPaging(query);
  const all = db.orders.slice().sort((a, b) => b.createdAt - a.createdAt);
  return { page, size, total: all.length, items: paginate(all, page, size) };
}

module.exports = { listOrders };
EOF
