#!/bin/bash
set -e

# Default values
MQTT_USERNAME=""
MQTT_PASSWORD=""
MQTT_URL=""
HOUSEMIX_VERSION=""
HOST_DATA_LOCATION=""
PROXY_NETWORK_NAME="house-mix-network" # Default proxy network name
WEBSERVER_LOCAL_PORT=""
ADD_ZIGBEE2MQTT="false"
ADD_MQTT_SERVER="false"
ZIGBEE_COORDINATOR_PORT="/dev/ttyACM0" # Default value

# GitHub URL for docker-compose parts (placeholder)
BASE_GIT_URL="https://github.com/Astervista/house-mix/raw/refs/heads/main/containers/bundle/"

# Function to display usage
usage() {
  echo "Usage: $0 [OPTIONS]"
  echo "Options:"
  echo "  --mqtt-username <username>        MQTT username (optional)"
  echo "  --mqtt-password <password>        MQTT password (optional)"
  echo "  --mqtt-url <url>                  MQTT broker URL (e.g., mqtt://localhost:1883 or mqtt://mqtt-server:1883)"
  echo "  --housemix-version <version>      HouseMix version (e.g., 1.0.0)"
  echo "  --host-data-location <path>       Host path for data storage"
  echo "  --proxy-network <network_name>    Name of the proxy network (optional, default: house-mix-network)"
  echo "  --webserver-local-port <port>     Local port for webserver forwarding (optional)"
  echo "  --add-zigbee2mqtt                 Add Zigbee2MQTT service"
  echo "  --zigbee-coordinator-port <path>  Path to the Zigbee coordinator (default: /dev/ttyACM0)"
  echo "  --add-mqtt-server                 Add MQTT server service"
  echo "  -h, --help                        Display this help message"
  exit 1
}

# Parse command-line arguments
while (( "$#" )); do
  case "$1" in
    --mqtt-username)
      MQTT_USERNAME="$2"
      shift 2
      ;;
    --mqtt-password)
      MQTT_PASSWORD="$2"
      shift 2
      ;;
    --mqtt-url)
      MQTT_URL="$2"
      shift 2
      ;;
    --housemix-version)
      HOUSEMIX_VERSION="$2"
      shift 2
      ;;
    --host-data-location)
      HOST_DATA_LOCATION="$2"
      shift 2
      ;;
    --proxy-network)
      PROXY_NETWORK_NAME="$2" # Assign to new variable
      shift 2
      ;;
    --webserver-local-port)
      WEBSERVER_LOCAL_PORT="$2"
      shift 2
      ;;
    --add-zigbee2mqtt)
      ADD_ZIGBEE2MQTT="true"
      shift
      ;;
    --zigbee-coordinator-port)
      ZIGBEE_COORDINATOR_PORT="$2"
      shift 2
      ;;
    --add-mqtt-server)
      ADD_MQTT_SERVER="true"
      shift
      ;;
    -h|--help)
      usage
      ;;
    --) # end argument parsing
      shift
      break
      ;;
    -*) # unsupported flags
      echo "Error: Unsupported flag $1" >&2
      usage
      ;;
    *) # preserve positional arguments
      PARAMS="$PARAMS $1"
      shift
      ;;
  esac
done

# Validate required arguments (PROXY_NETWORK_NAME is now optional)
if [ -z "$HOUSEMIX_VERSION" ] || [ -z "$HOST_DATA_LOCATION" ]; then
  echo "Error: Missing required arguments. Please provide --housemix-version and --host-data-location."
  usage
fi

# Check for github_token.txt
if [ ! -f "secrets/github_token.txt" ]; then
  echo "Error: Required secret 'secrets/github_token.txt' is missing!"
  exit 1
fi
GITHUB_TOKEN=$(cat ./secrets/github_token.txt)

# Create necessary directories
mkdir -p secrets

if [ "$ADD_MQTT_SERVER" = "true" ]; then
  mkdir -p mosquitto/config
  mkdir -p mosquitto/data

  # Generate mosquitto.conf
  MOSQUITTO_CONF_PATH="mosquitto/config/mosquitto.conf"
  echo "Generating default mosquitto.conf at ${MOSQUITTO_CONF_PATH}"
  cat <<EOF > "${MOSQUITTO_CONF_PATH}"
listener 1883
allow_anonymous true
persistence true
persistence_location /mosquitto/data/
log_dest stdout
EOF

  # Handle MQTT authentication for Mosquitto
  if [ -n "$MQTT_USERNAME" ] && [ -n "$MQTT_PASSWORD" ]; then
    echo "Configuring Mosquitto for password authentication using a Docker container."
    # Generate password entry using a temporary Docker container and capture output
    # Using -c to prevent mosquitto_passwd from trying to create a backup file
    PASSWORD_ENTRY=$(docker run --rm eclipse-mosquitto:2.0.15 mosquitto_passwd -b -c /dev/stdout "${MQTT_USERNAME}" "${MQTT_PASSWORD}")

    # Write the captured password entry to the file on the host
    echo "${PASSWORD_ENTRY}" > mosquitto/config/mosquitto_passwd

    echo "password_file /mosquitto/config/mosquitto_passwd" >> "${MOSQUITTO_CONF_PATH}"
    echo "allow_anonymous false" >> "${MOSQUITTO_CONF_PATH}" # Disable anonymous if password file is used
  else
    echo "Warning: MQTT server will allow anonymous access as no username/password was provided."
  fi
fi


if [ -n "$MQTT_URL" ]; then
  # Check if MQTT_URL already contains a port
  if [[ ! "$MQTT_URL" =~ :[0-9]+$ ]]; then
    # If no port is specified, append default port
    MQTT_URL="${MQTT_URL}:1883"
  fi
else
    MQTT_URL="mqtt://mqtt-server:1883"
fi

if [ "$ADD_ZIGBEE2MQTT" = "true" ]; then
  mkdir -p zigbee2mqtt/data

  # Check if Zigbee coordinator port exists
  if [ ! -e "$ZIGBEE_COORDINATOR_PORT" ]; then
    echo "Error: Zigbee coordinator port '${ZIGBEE_COORDINATOR_PORT}' not found on the host. Please ensure the device is connected and accessible."
    exit 1
  fi

  # Generate Zigbee2MQTT configuration.yaml
  Z2M_CONFIG_PATH="zigbee2mqtt/data/configuration.yaml"
  echo "Generating Zigbee2MQTT configuration at ${Z2M_CONFIG_PATH}"
  cat <<EOF > "${Z2M_CONFIG_PATH}"
version: 5
mqtt:
  base_topic: zigbee2mqtt
  server: ${MQTT_URL}
$(if [ -n "$MQTT_USERNAME" ]; then echo "  user: ${MQTT_USERNAME}"; fi)
$(if [ -n "$MQTT_PASSWORD" ]; then echo "  password: ${MQTT_PASSWORD}"; fi)
serial:
  port: ${ZIGBEE_COORDINATOR_PORT}
advanced:
  log_level: info
  channel: 11
  network_key: GENERATE
  pan_id: GENERATE
  ext_pan_id: GENERATE
  enable_external_js: false
frontend:
  enabled: false
  port: 8080
homeassistant:
  enabled: false
onboarding: false
EOF
fi

# Ensure the proxy network exists
echo "Checking for Docker network: ${PROXY_NETWORK_NAME}"
if ! docker network inspect "${PROXY_NETWORK_NAME}" &>/dev/null; then
  echo "Docker network '${PROXY_NETWORK_NAME}' not found. Creating it as an external bridge network."
  docker network create --driver bridge "${PROXY_NETWORK_NAME}"
else
  echo "Docker network '${PROXY_NETWORK_NAME}' already exists."
fi


# Create .env file
echo "# Generated by build.sh" > .env
echo "HOUSEMIX_VERSION=${HOUSEMIX_VERSION}" >> .env
echo "HOST_DATA_LOCATION=${HOST_DATA_LOCATION}" >> .env
echo "PROXY_NETWORK=${PROXY_NETWORK_NAME}" >> .env # Use the determined network name
echo "MQTT_URL=${MQTT_URL}" >> .env

# Handle MQTT credentials
if [ -n "$MQTT_USERNAME" ]; then
  echo "MQTT_USERNAME=${MQTT_USERNAME}" >> .env
  if [ -n "$MQTT_PASSWORD" ]; then
    echo -n "${MQTT_PASSWORD}" > secrets/mqtt_password.txt
  else
    echo "Warning: MQTT_USERNAME provided without MQTT_PASSWORD. MQTT_PASSWORD will not be set."
  fi
elif [ -n "$MQTT_PASSWORD" ]; then
  echo "Error: MQTT_PASSWORD provided without MQTT_USERNAME. Please provide both or neither."
  usage
fi

# Add Zigbee coordinator port to .env if Zigbee2MQTT is enabled
if [ "$ADD_ZIGBEE2MQTT" = "true" ]; then
  echo "ZIGBEE_COORDINATOR_PORT=${ZIGBEE_COORDINATOR_PORT}" >> .env
fi

# Initialize docker-compose content
DOCKER_COMPOSE_CONTENT="version: '3.8'\n" # Start with version

# Fetch base docker-compose parts
echo "Fetching docker-compose base parts..."
curl -s "${BASE_GIT_URL}docker-compose.parts/docker-compose.base.yaml" > docker-compose.yaml.tmp
DOCKER_COMPOSE_CONTENT+=$(cat docker-compose.yaml.tmp)
rm docker-compose.yaml.tmp

# Add frontend service
echo "Adding house-mix-frontend service..."
curl -s "${BASE_GIT_URL}docker-compose.parts/docker-compose.frontend.yaml" > docker-compose.yaml.tmp
FRONTEND_SERVICE=$(cat docker-compose.yaml.tmp)
rm docker-compose.yaml.tmp

# Apply webserver-local-port if provided
if [ -n "$WEBSERVER_LOCAL_PORT" ]; then
  PORTS_BLOCK="    ports:\n      - \"${WEBSERVER_LOCAL_PORT}:80\""
  FRONTEND_SERVICE=$(echo "$FRONTEND_SERVICE" | awk -v ports_block="$PORTS_BLOCK" '
    /networks:/ {
      print ports_block
      print
      next
    }
    { print }
  ')
fi
DOCKER_COMPOSE_CONTENT+="\n${FRONTEND_SERVICE}"

# Add backend service
echo "Adding house-mix-backend service..."
curl -s "${BASE_GIT_URL}docker-compose.parts/docker-compose.backend.yaml" > docker-compose.yaml.tmp
DOCKER_COMPOSE_CONTENT+="\n$(cat docker-compose.yaml.tmp)"
rm docker-compose.yaml.tmp

# Add MQTT server if requested
if [ "$ADD_MQTT_SERVER" = "true" ]; then
  echo "Adding MQTT server service..."
  curl -s "${BASE_GIT_URL}docker-compose.parts/docker-compose.mqtt.yaml" > docker-compose.yaml.tmp
  DOCKER_COMPOSE_CONTENT+="\n$(cat docker-compose.yaml.tmp)"
  rm docker-compose.yaml.tmp
fi

# Add Zigbee2MQTT if requested
if [ "$ADD_ZIGBEE2MQTT" = "true" ]; then
  echo "Adding Zigbee2MQTT service..."
  curl -s "${BASE_GIT_URL}docker-compose.parts/docker-compose.zigbee2mqtt.yaml" > docker-compose.yaml.tmp
  DOCKER_COMPOSE_CONTENT+="\n$(cat docker-compose.yaml.tmp)"
  rm docker-compose.yaml.tmp
fi

# Write the final docker-compose.yaml
echo -e "$DOCKER_COMPOSE_CONTENT" > docker-compose.yaml

echo "Successfully generated .env and docker-compose.yaml"

# --- Login to GitHub Container Registry ---
echo "$GITHUB_TOKEN" | docker login ghcr.io -u astervista --password-stdin

# --- Fetch backend files and build house-mix-backend-runner image ---
echo "Fetching backend files..."
mkdir -p backend
curl -s "${BASE_GIT_URL}backend/Dockerfile" > backend/Dockerfile
curl -s "${BASE_GIT_URL}backend/entrypoint.sh" > backend/entrypoint.sh

echo "Building house-mix-backend-runner:latest Docker image..."
docker build -t house-mix-backend-runner:latest ./backend

# --- Start Docker Compose ---
docker compose up -d

echo "Docker Compose services started."

# --- Clean up backend files ---
echo "Cleaning up backend files..."
rm -rf backend
