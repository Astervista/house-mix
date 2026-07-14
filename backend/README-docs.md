# Introduction

This is the documentation for HouseMix's backend subproject.

The backend is built as a NestJs application, and performs business logic for the system, connects and handles the communication with the Zigbee service through MQTT to perform the results of the system's calculation.

The vast majority of the classes and modules here are structured in two-class clusters composed of a NestJs controller handling the REST endpoints and a NestJs service performing the relative business logic. These are all tied to one model defined in the common project each, on which they operate.

The subfolders that contain such double class clusters are the same as the ones in the common project: `/devices/`, `/mixing/` and `/system/`.

Two additional services handle business logic without being provided with a controller, since they are not connected to a model, but perform more interconnected functions. These are the [engine module](modules/engine_engine.service.html) and the [Zigbee module](modules/zigbee_zigbee.service.html), and are contained inside their respective `/engine/` and `/zigbee` folders.

Lastly, the folder `/helpers/` contains support classes to be used throughout the system, such as the [`PersistentDataService`](classes/helpers_file_persistent-data-service.PersistentDataService.html) class that can be extended to give a NestJs service easy data persistency features.

## Notable modules

### Engine module

The engine is the main elaboration point in the system. It responds to inputs from the system or from the sensors attached to Zigbee and performs all the calculations on the mixes from the status of the system, resulting in a new status to be sent to the devices. This module contains the [EngineService](classes/engine_engine.service.EngineService.html) class and all the support classes for the correct elaboration of all the required calculations.

### Zigbee module

The Zigbee module contains the [ZigbeeService](classes/zigbee_zigbee.service.ZigbeeService.html) class that acts as a bridge between the system and the Zigbee2MQTT server. It listens for and writes to the relevant topics as required by the [engine](#engine-module), offering an easier interface to it.


