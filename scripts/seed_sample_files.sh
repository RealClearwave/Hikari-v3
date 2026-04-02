#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="$ROOT_DIR/problem_data"

mkdir -p "$DATA_DIR/1000" "$DATA_DIR/1001" "$DATA_DIR/1002"

cat > "$DATA_DIR/1000/1.in" <<'EOF'
1 2
EOF
cat > "$DATA_DIR/1000/1.out" <<'EOF'
3
EOF
cat > "$DATA_DIR/1000/2.in" <<'EOF'
10 20
EOF
cat > "$DATA_DIR/1000/2.out" <<'EOF'
30
EOF

cat > "$DATA_DIR/1001/1.in" <<'EOF'
5
-2 1 -3 4 5
EOF
cat > "$DATA_DIR/1001/1.out" <<'EOF'
9
EOF
cat > "$DATA_DIR/1001/2.in" <<'EOF'
8
-5 -1 -9 -3 -4 -2 -8 -7
EOF
cat > "$DATA_DIR/1001/2.out" <<'EOF'
-1
EOF

cat > "$DATA_DIR/1002/1.in" <<'EOF'
4 4 1
1 2 3
2 3 4
1 3 10
3 4 1
EOF
cat > "$DATA_DIR/1002/1.out" <<'EOF'
0 3 7 8
EOF

echo "Sample files created under: $DATA_DIR"
