#!/usr/bin/env bash
set -euo pipefail

if [ -z "${VERCEL_TOKEN:-}" ]; then
  echo "VERCEL_TOKEN is required. Export it before running this script."
  exit 1
fi

npm install
npm run build
npx vercel --prod --token "$VERCEL_TOKEN"
