<p align="center">
  <img src="backend-banner.svg" height="120" alt="HouseMix Logo - Backend" />
</p>

## Description

This subproject contains the backend for HouseMix, built with nodejs + nest.js

This backend uses the common library and serves the REST apis for the system, manages the connection with
the zigbee2mqtt server through mqtt, and runs all the logic to calculate the status of all the zigbee devices,
publishing it back to the devices on mqtt.

## Executing

The project can be run using npm, either in development or in production.

### Development

```shell
npm run start:debug
```

### Production

```shell
npm run start:prod
```

### Parameters

The backend requires some parameters to run, passed as environment variables:

| Variable        | Description                                                | Example                                                    |
|:----------------|:-----------------------------------------------------------|:-----------------------------------------------------------|
| `APP_BASE_DIR`  | The local directory where the application stores its data  | `/root/house-mix/backend/data`                             |
| `MQTT_URL`      | The URL of the MQTT broker on which zigbee2mqtt is running | `mqtt://192.168.1.100/` or `mqtt://docker-mqtt-container/` |
| `MQTT_USERNAME` | Username for MQTT authentication                           | `username`                                                 |
| `MQTT_PASSWORD` | Password for MQTT authentication                           | `********`                                                 |
| `PORT`          | The port on which the Nest.js server will listen           | `3001`                                                     |

## What the backend does

Primarily, this backend accomplishes the following macro-tasks:

#### MQTT Integration

It maintains a persistent connection with the MQTT broker, subscribing to topics from zigbee2mqtt
to receive real-time updates from physical devices. It also manages the update and

- **State Management**: It processes incoming raw data from sensors and switches, maintaining an internal representation of the entire Zigbee network's state.
- **Business Logic**: It executes the core automation logic, determining how devices should react to specific events (e.g., turning on a light when a motion sensor is triggered).
- **REST API Gateway**: It exposes a set of endpoints that allow the frontend or external services to query the current state of the house and send manual override commands.
- **Device Synchronization**: It ensures that any changes made via the API or internal logic are correctly formatted and published back to the MQTT broker to update the physical hardware.
