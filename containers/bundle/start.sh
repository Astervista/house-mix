#!/bin/sh
set -e

GITHUB_TOKEN=$(cat ./secrets/github_token.txt)


echo "$GITHUB_TOKEN"

# --- 2. Login to GitHub Container Registry ---
echo "$GITHUB_TOKEN" | docker login ghcr.io -u astervista --password-stdin

# --- 3. Start Docker Compose ---
docker compose up
