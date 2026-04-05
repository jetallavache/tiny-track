#!/bin/sh
# Usage: ./scripts/bump-server.sh [patch|minor|major]
set -e

TYPE=${1:-patch}
AC=server/configure.ac

current=$(grep 'AC_INIT' $AC | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
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

# Bump configure.ac
sed -i "s/AC_INIT(\([^,]*\), \[$current\]/AC_INIT(\1, [$next]/" $AC

echo "Server: $current → $next"

git add $AC
git commit -m "chore(server): bump version to $next"
git tag "server/v$next"

echo "Created tag server/v$next"
echo "Push with: git push origin develop && git push origin server/v$next"
