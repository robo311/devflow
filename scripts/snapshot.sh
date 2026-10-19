#!/usr/bin/env bash
# Prints a git tree id for the working tree as it is now: tracked and untracked files,
# .gitignore and .git/info/exclude respected. The real index is never touched.
# Diff two states with: git diff <before> <after>   (a commit or a tree on either side)
set -euo pipefail

top=$(git rev-parse --show-toplevel)
git_dir=$(git -C "$top" rev-parse --absolute-git-dir)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# Start from the real index so unchanged files are not rehashed.
if [ -f "$git_dir/index" ]; then
  cp "$git_dir/index" "$tmp/index"
fi

GIT_INDEX_FILE="$tmp/index" git -C "$top" add -A
GIT_INDEX_FILE="$tmp/index" git -C "$top" write-tree
