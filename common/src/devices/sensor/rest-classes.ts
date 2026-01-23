import {SensorType} from "./sensor";
import {IsEnum, IsNotEmpty, IsOptional, Matches} from "rest-decorators";
import {UNIQUE_NAME_PATTERN} from "../../utils/constants";
import {DeviceEditChanges} from "../rest-classes";

export class SensorCreateOptions {
    
    @IsOptional()
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public parent?: string;
}

export class SensorEditChanges extends DeviceEditChanges {
    
    @IsOptional()
    @IsEnum(SensorType)
    public type?: SensorType;
}
