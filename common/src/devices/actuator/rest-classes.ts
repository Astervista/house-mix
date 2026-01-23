import {ActuatorType} from "./actuator";
import {IsEnum, IsNotEmpty, IsOptional, Matches} from "rest-decorators";
import {UNIQUE_NAME_PATTERN} from "../../utils/constants";
import {DeviceEditChanges} from "../rest-classes";

export class ActuatorCreateOptions {
    
    @IsOptional()
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public parent?: string;
}

export class ActuatorEditChanges extends DeviceEditChanges {
    
    @IsOptional()
    @IsEnum(ActuatorType)
    public type?: ActuatorType;
    
}
