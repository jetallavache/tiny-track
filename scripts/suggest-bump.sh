#!/bin/sh
# Analyse commits since last tag and suggest version bumps.
# Usage: ./scripts/suggest-bump.sh
set -e

# ── helpers ────────────────────────────────────────────────────────────────
last_tag() {
    git tag --list "$1" --sort=-version:refname | head -1
}

suggest() {
    scope="$1"; prefix="$2"
    tag=$(last_tag "${prefix}v*")
    if [ -z "$tag" ]; then
        range="HEAD"
        since="(no previous tag)"
    else
        range="${tag}..HEAD"
        since="since $tag"
    fi

    commits=$(git log "$range" --pretty="%s" 2>/dev/null)
    if [ -z "$commits" ]; then
        echo "[$scope] no commits $since"
        return
    fi

    breaking=$(echo "$commits" | grep -c 'BREAKING CHANGE\|!:' || true)
    feat=$(echo "$commits"     | grep -c '^feat'              || true)
    fix=$(echo "$commits"      | grep -c '^fix\|^perf'        || true)

    if   [ "$breaking" -gt 0 ]; then bump="MAJOR"
    elif [ "$feat"     -gt 0 ]; then bump="MINOR"
    elif [ "$fix"      -gt 0 ]; then bump="PATCH"
    else                              bump="none (only chore/docs/ci)"
    fi

    echo ""
    echo "[$scope] commits $since:"
    echo "$commits" | sed 's/^/  /'
    echo ""
    echo "  breaking=$breaking  feat=$feat  fix/perf=$fix  → suggest: $bump"
}

suggest "sdk"    "sdk/"
suggest "server" "server/"
