#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
archive="$root/fintrack-api-source.zip"
maximum_bytes=$((300 * 1024 * 1024))

if ! command -v zip >/dev/null 2>&1; then
  echo "The zip command is required to create the source archive." >&2
  exit 1
fi

cd "$root"
rm -f "$archive"
zip -q -r "$archive" \
  .gitignore \
  .github/copilot-instructions.md \
  ARCHITECTURE.md \
  REVIEW.md \
  PROMPTS.md \
  PR-DESCRIPTION.md \
  TOOL_STRATEGY.md \
  README.md \
  UNIT_TEST_CASES.md \
  package.json \
  package-lock.json \
  tsconfig.json \
  src \
  tests \
  scripts/create-source-zip.sh

archive_bytes="$(stat -c '%s' "$archive")"
if (( archive_bytes >= maximum_bytes )); then
  rm -f "$archive"
  echo "Source archive must be below 300 MiB." >&2
  exit 1
fi

echo "Created $archive ($(numfmt --to=iec-i --suffix=B "$archive_bytes"))"
