#!/bin/sh
# Usage: ./scripts/bump-sdk.sh [patch|minor|major]
set -e

TYPE=${1:-patch}
PKG=sdk/package.json

current=$(node -p "require('./$PKG').version")
IFS='.' read -r major minor patch << EOF
$current
EOF

case "$TYPE" in
  major) major=$((major+1)); minor=0; patch=0 ;;
  minor) minor=$((minor+1)); patch=0 ;;
  patch) patch=$((patch+1)) ;;
  *) echo "Usage: $0 [patch|minor|major]"; exit 1 ;;
esac

next="$major.$minor.$patch"

# Bump package.json
node -e "
  const fs = require('fs');
  const p = JSON.parse(fs.readFileSync('$PKG'));
  p.version = '$next';
  fs.writeFileSync('$PKG', JSON.stringify(p, null, 2) + '\n');
"

echo "SDK: $current → $next"

git add $PKG
git commit -m "chore(sdk): bump version to $next"
git tag "sdk/v$next"

echo "Created tag sdk/v$next"
echo "Push with: git push origin develop && git push origin sdk/v$next"
