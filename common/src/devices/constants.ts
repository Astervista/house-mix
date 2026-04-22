/**
 * This module contains constants useful in operations with {@link Device|`Device`s}.
 *
 * @module
 */
// noinspection ES6UnusedImports
import type {Group} from "./group/group";
// noinspection ES6UnusedImports
import type {Actuator} from "./actuator/actuator";
// noinspection ES6UnusedImports
import type {Sensor} from "./sensor/sensor";
// noinspection ES6UnusedImports
import type {Device} from "./device";

/**
 * This enum defines the different types of entity. An entity is a generic part of
 * the device graph (Actuators and Sensors and how they relate to each other).
 *
 * @readonly
 */
export enum EntityType {
    /** The entity is a {@link Group|`Group`}. */
    GROUP    = "GROUP",
    /** The entity is an {@link Actuator|`Actuator`}. */
    ACTUATOR = "ACTUATOR",
    /** The entity is a {@link Sensor|`Sensor`}. */
    SENSOR   = "SENSOR"
}
