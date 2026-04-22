<p align="center">
  <img src="backend-banner.svg" height="120" alt="HouseMix Logo - Backend" />
</p>

# Description

This subproject contains the backend for HouseMix, built with node.js + nest.js

This backend uses the common library and serves the REST apis for the system, manages the connection with
the zigbee2mqtt server through mqtt, and runs all the logic to calculate the status of all the zigbee devices,
publishing it back to the devices on mqtt.

# Executing

The project can be run using npm, either in development or in production.

## Development

```shell
npm run start:debug
```

## Production

```shell
npm run start:prod
```

## Parameters

The backend requires some parameters to run, passed as environment variables:

| Variable        | Description                                                | Example                                                    |
|:----------------|:-----------------------------------------------------------|:-----------------------------------------------------------|
| `APP_BASE_DIR`  | The local directory where the application stores its data  | `/root/house-mix/backend/data`                             |
| `MQTT_URL`      | The URL of the MQTT broker on which zigbee2mqtt is running | `mqtt://192.168.1.100/` or `mqtt://docker-mqtt-container/` |
| `MQTT_USERNAME` | Username for MQTT authentication                           | `username`                                                 |
| `MQTT_PASSWORD` | Password for MQTT authentication                           | `********`                                                 |
| `PORT`          | The port on which the Nest.js server will listen           | `3001`                                                     |

# Project outline

## Services

Primarily, this backend achieves the following macro-tasks, each handled by a different service in nest.js:

### MQTT Integration

[`ZigbeeService`](src/zigbee/zigbee.service.ts) is the service that handles a persistent connection with the MQTT broker, subscribing to topics from zigbee2mqtt
to receive real-time updates from physical devices. It also manages the update and throttling of the messages sent to the lights, doing a simple caching and load balancing
to avoid clogging the zigbee network. It also handles the logic of some [behavior adjustments](#behavior-adjustments) that relate to zigbee messaging.

### Devices

Devices are handled by their respective service that have little logic other than data management for the representation of the devices and their organization. The services are:

- [`ActuatorService`](src/devices/actuator/actuator.service.ts) for the actuators.
- [`SensorService`](src/devices/sensor/sensor.service.ts) for the sensors.
- [`GroupService`](src/devices/group/group.service.ts) for the groups of devices.

### Main engine

[`EngineService`](src/engine/engine.service.ts) handles the execution of the main elaboration cycle. Following the network of dependencies between the mixes, it runs its evaluation from
sensor towards actuators when some trigger or change in the environment requires it. The service also keeps track of the status of the storage and sensors as required by the mixes. The
main engine is just the coordinator, the [mixing service](#mixing) performs the actual calculations for each mix in the chain.

### Mixing

[`MixService`](src/mixing/mix/mix.service.ts) performs the calculations for each mix during the main cycle handled by the [main engine service](#main-engine). It also handles the logic
behind the REST endpoint related to operations on mixes, handling the persistence on storage.

### Additional features

Some services tweak the behavior of the system or add functionality to it. Each additional feature corresponds with a service in the [system directory](src/system). Each of them has a
corresponding controller for handling the relative REST endpoint, while the service handles the actual logic and elaboration.

#### Behavior adjustments

[`AdjustmentsService`](src/system/adjustments/adjustments.service.ts) provides different tweaks to the behavior of the system, primarily on the calculation of the cycle or publishing of
messages to MQTT. Refer to the docs to understand which adjustments are provided.

#### Device monitoring

[`DeviceMonitorService`](src/system/device-monitor/device-monitor.service.ts) watches the network for the presence of devices by pinging IPs. When changes on the status are registered, the
service triggers a new elaboration cycle and the status of devices is available to mixes in the _System_ category.

#### Parameters

Parameters are constant values that are available to all mixes, and can be edited easily from the frontend. [`ParametersService`](src/system/parameters/parameters.service.ts) handles those.

#### Settings

[`SettingsService`](src/system/settings/settings.service.ts) handles system-wide settings that customize the behavior of the backend. It is also responsible for notifying the relevant
service
of the changes.

#### Timers

[`TimersService`](src/system/timers/timers.service.ts) allows the creation of scheduled events. These timers can be used as inputs in mixes to trigger logic at specific times or intervals.

## REST endpoints

Every entity group has a corresponding controller that handles REST operations, allowing the frontend or external tools to manage the system configuration and state:

- [`ActuatorController`](src/devices/actuator/actuator.controller.ts)
- [`SensorController`](src/devices/sensor/sensor.controller.ts)
- [`GroupController`](src/devices/group/group.controller.ts)
- [`MixController`](src/mixing/mix/mix.controller.ts)

The system components also expose their own controllers:

- [`AdjustmentsController`](src/system/adjustments/adjustments.controller.ts)
- [`DeviceMonitorController`](src/system/device-monitor/device-monitor.controller.ts)
- [`ParametersController`](src/system/parameters/parameters.controller.ts)
- [`SettingsController`](src/system/settings/settings.controller.ts)
- [`TimersController`](src/system/timers/timers.controller.ts)

The REST endpoint is documented in the [REST documentation](/documentation/REST) which is compiled from the [yaml definitions](doc-src).
