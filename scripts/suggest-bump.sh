#!/bin/sh
# Analyse commits since last tag and perform version bumps.
# Usage: ./scripts/suggest-bump.sh [--yes]
set -e

AUTO=${1:-}

last_tag() { git tag --list "$1" --sort=-version:refname | head -1; }

analyse() {
    scope="$1"; prefix="$2"
    tag=$(last_tag "${prefix}v*")
    range="${tag:+${tag}..}HEAD"
    since="${tag:-no previous tag}"

    commits=$(git log "$range" --pretty="%s" 2>/dev/null)
    [ -z "$commits" ] && { echo "[$scope] no new commits since $since"; return; }

    breaking=$(echo "$commits" | grep -cE 'BREAKING CHANGE|!:' || true)
    feat=$(echo "$commits"     | grep -cE '^feat'              || true)
    fix=$(echo "$commits"      | grep -cE '^fix|^perf'         || true)

    if   [ "$breaking" -gt 0 ]; then bump="major"
    elif [ "$feat"     -gt 0 ]; then bump="minor"
    elif [ "$fix"      -gt 0 ]; then bump="patch"
    else bump=""; fi

    echo ""
    echo "[$scope] commits since $since:"
    echo "$commits" | sed 's/^/  /'
    echo ""

    if [ -z "$bump" ]; then
        echo "  → no release needed (only chore/docs/ci)"
        return
    fi

    echo "  breaking=$breaking  feat=$feat  fix/perf=$fix  → suggest: $bump"

    if [ "$AUTO" = "--yes" ]; then
        answer="y"
    else
        printf "  Run bump-%s.sh %s? [y/N] " "$scope" "$bump"
        read -r answer
    fi

    [ "$answer" = "y" ] || [ "$answer" = "Y" ] || return

    "$(dirname "$0")/bump-${scope}.sh" "$bump"
}

analyse "sdk"    "sdk/"
analyse "sdk-lite"    "sdk-lite/"
analyse "server" "server/"
