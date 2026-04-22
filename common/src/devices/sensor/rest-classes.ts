/**
 * This module contains support classes to be used in the communication
 * regarding operations about {@link Sensor|`Sensor`s}.
 *
 * @module
 */
// noinspection ES6UnusedImports
import type {Sensor} from "./sensor";
import {SensorType} from "./sensor";
import {IsEnum, IsNotEmpty, IsOptional, Matches} from "rest-decorators";
import {UNIQUE_NAME_PATTERN} from "../../utils/constants";
import {DeviceEditChanges} from "../rest-classes";

/**
 * Query parameters that represents the options during the request of the creation of a {@link Sensor|`Sensor`} in the REST API.
 */
export class SensorCreateOptions {
    
    /**
     * Which parent group the sensor will be assigned to. If not specified, it will not be added to any group.
     */
    @IsOptional()
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public parent?: string;
}

/**
 * Data transfer class that represents an edit to a {@link Sensor|`Sensor`}, used for communication with the REST API.
 */
export class SensorEditChanges extends DeviceEditChanges {
    
    /**
     * An edit to {@link Sensor#type|`Sensor.type`}. If `undefined`, the sensor's type remains unchanged.
     */
    @IsOptional()
    @IsEnum(SensorType)
    public type?: SensorType;
}
