#!/usr/bin/env bash

set -u

contexts=(
  "frontend:./src/app"
  "common:./src"
  "backend:./src"
)

failed_contexts=()
failed_details=()

run_eslint() {
  local context="$1"
  local folder="$2"

  echo "=========================================="
  echo "Running ESLint in: $context ($folder)"
  echo "=========================================="

  if (
    cd "$context" &&
    npx eslint "$folder"
  ); then
    echo "✅   $context passed"
  else
    local exit_code=$?
    echo "❌   $context failed with exit code $exit_code"
    failed_contexts+=("$context")
    failed_details+=("$context -> $folder (exit code $exit_code)")
  fi

  echo
}

for entry in "${contexts[@]}"; do
  context="${entry%%:*}"
  folder="${entry#*:}"
  run_eslint "$context" "$folder"
done

echo "=========================================="
echo "             ESLint summary"
echo "=========================================="

if [ ${#failed_contexts[@]} -eq 0 ]; then
  echo "✅   All ESLint checks passed:"
  for entry in "${contexts[@]}"; do
    context="${entry%%:*}"
    folder="${entry#*:}"
    echo "  - $context -> $folder"
  done
  exit 0
fi

echo "❌   ESLint failed in the following context(s):"
for detail in "${failed_details[@]}"; do
  echo "  - $detail"
done

exit 1
