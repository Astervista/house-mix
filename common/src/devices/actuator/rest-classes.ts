/**
 * This module contains some support classes to be used in the communication
 * regarding operations about {@link Actuator|`Actuator`s}.
 *
 * @module
 */
// noinspection ES6UnusedImports
import type {Actuator} from "./actuator";
import {ActuatorType} from "./actuator";
import {IsEnum, IsNotEmpty, IsOptional, Matches} from "rest-decorators";
import {UNIQUE_NAME_PATTERN} from "../../utils/constants";
import {DeviceEditChanges} from "../rest-classes";

/**
 * Query parameters that represent the options during the request of the creation of an {@link Actuator|`Actuator`} in the REST API.
 */
export class ActuatorCreateOptions {
    
    /**
     * Which parent group the actuator will be assigned to. If not specified, it will not be added to any group.
     */
    @IsOptional()
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public parent?: string;
}

/**
 * Data transfer class that represents an edit to a {@link Actuator|`Actuator`}, used for communication with the REST API.
 */
export class ActuatorEditChanges extends DeviceEditChanges {
    
    /**
     * An edit to {@link Actuator#type|`Actuator.type`}. If `undefined`, the actuator's type remains unchanged.
     */
    @IsOptional()
    @IsEnum(ActuatorType)
    public type?: ActuatorType;
    
}
