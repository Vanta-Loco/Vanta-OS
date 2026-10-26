#!/usr/bin/env bash
set -euo pipefail

# The app uses DATABASE_URL; some workspaces expose the same Neon connection
# under NEON_DATABASE_URL instead.
if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -n "${NEON_DATABASE_URL:-}" ]]; then
    export DATABASE_URL="${NEON_DATABASE_URL}"
  else
    echo "DATABASE_URL or NEON_DATABASE_URL is required for post-merge migrations." >&2
    exit 1
  fi
fi

npm ci --no-audit --no-fund
npm run db:migrate
npm run build
