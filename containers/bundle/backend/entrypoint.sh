#!/bin/sh
set -e

# Load MQTT password from Docker secret into environment variable
if [ -f "/run/secrets/mqtt_password" ]; then
  export MQTT_PASSWORD=$(cat /run/secrets/mqtt_password)
fi
if [ -f "/run/secrets/github_token" ]; then
  export GITHUB_TOKEN=$(cat /run/secrets/github_token)
fi


echo "@astervista:registry=https://npm.pkg.github.com/" > ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> ~/.npmrc

PACKAGE="@astervista/house-mix-backend"
VERSION="${HOUSEMIX_VERSION:-latest}"
export NPM_CONFIG_USERCONFIG=/root/.npmrc

echo "Installing $PACKAGE@$VERSION..."
npm install "$PACKAGE@$VERSION" --omit=dev

echo "Starting backend at the correct point..."
exec node node_modules/@astervista/house-mix-backend/dist/backend/src/main.js
