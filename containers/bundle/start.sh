#!/bin/sh
set -e

# Required environment variables / files
REQUIRED_ENV_FILE=".env"
REQUIRED_SECRETS="secrets/github_token.txt secrets/mqtt_password.txt"

# Check if .env exists
if [ ! -f "$REQUIRED_ENV_FILE" ]; then
  echo "Error: Environment file '$REQUIRED_ENV_FILE' is missing! If you don't know what its contents should be, copy example.env and edit its values."
  exit 1
fi

# Check if each secret exists
for secret in $REQUIRED_SECRETS; do
  if [ ! -f "$secret" ]; then
    echo "Error: Required secret '$secret' is missing!"
    exit 1
  fi
done

# The github_token.txt is still needed for logging into ghcr.io
# The user will remove this later, but for now, we assume it exists.
GITHUB_TOKEN=$(cat ./secrets/github_token.txt)

# --- 2. Login to GitHub Container Registry ---
echo "$GITHUB_TOKEN" | docker login ghcr.io -u astervista --password-stdin

# --- 3. Start Docker Compose ---
docker compose up -d
