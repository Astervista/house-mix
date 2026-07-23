<p align="center">
  <img src="bundle-banner.svg" height="120" alt="HouseMix Logo - Backend" />
</p>

## Description

This is a folder containing a docker-compose that can run <a href="https://github.com/Astervista/house-mix">HouseMix</a>
as a complete package. The docker-compose also handles updating the version of HouseMix when needed.

## Setup

### Requirements

All installations assume that you have the following already installed (for more info, read
<a href="https://github.com/Astervista/house-mix/blob/main/README.md">the repository's readme</a>):

- [Zigbee2MQTT pre-requisites](https://www.zigbee2mqtt.io/guide/getting-started/)
- [Zigbee2MQTT installation](https://www.zigbee2mqtt.io/guide/installation/)
- [Node.js](https://nodejs.org/en/download)
- Some proxy software to route different paths coming to the server between the backend server (/house-mix/api/*) and the frontend server (every other /house-mix/* paths)

### Environment variables

To be able to run the bundle, in addition to the setup needed for any execution of HouseMix, a file
with the environment settings has to be created, and saved as `/.env` in the same folder as the `docker-compose.yaml` file.
An example can be found
<a href="https://github.com/Astervista/house-mix/blob/main/containers/bundle/example.md">in this folder</a>.

The available environment variables are:

| Variable             | Description                                                                                                                              | Example                                                    |
|:---------------------|:-----------------------------------------------------------------------------------------------------------------------------------------|:-----------------------------------------------------------|
| `MQTT_URL`           | The URL of the MQTT broker on which zigbee2mqtt is running                                                                               | `mqtt://192.168.1.100/` or `mqtt://docker-mqtt-container/` |
| `MQTT_USERNAME`      | Username for MQTT authentication                                                                                                         | `username`                                                 |
| `HOUSEMIX_VERSION`   | Version of the backend and frontend that will be downloaded from the repositories                                                        | `0.2.2`                                                    |
| `HOST_DATA_LOCATION` | The local directory that will be mapped to the backend's docker volume where the backend will store its data                             | `/root/house-mix/backend/data`                             |
| `PROXY_NETWORK`      | An optional network to which the container will be attached, so that they can be reached by a proxy manager running in another container | 'proxy-network'                                            |

### Secrets

Password and sensitive data is passed to the container through secrets. The file is:

- `mqtt_password.txt`: contains the password for the mqtt connection

## Executing

To execute HouseMix, just run `./start.sh`.
