import {IsEnum, IsNotEmpty, IsOptional, Matches, Type, ValidateNested} from "rest-decorators";
import {MixJSON} from "./mix";
import {UNIQUE_NAME_PATTERN} from "../../utils/constants";

export enum MixPhase {
    SENSORS   = "SENSORS",
    CENTER    = "CENTER",
    ACTUATORS = "ACTUATORS"
}

export enum MixTarget {
    DEVICE = "DEVICE",
    GROUP  = "GROUP",
    CENTER = "CENTER",
}

export type MixPositionInfo = MixPositionInfoSensors | MixPositionInfoCenter | MixPositionInfoActuators;

export type MixPositionInfoSensors = MixPositionInfoSensorsDevice | MixPositionInfoSensorsGroup;

export interface MixPositionInfoCenter {
    phase: MixPhase.CENTER,
    target: MixTarget.CENTER,
    mixName: string,
    mixDisplayName: string
}

export type MixPositionInfoActuators = MixPositionInfoActuatorsDevice | MixPositionInfoActuatorsGroup;

export interface MixPositionInfoSensorsDevice {
    phase: MixPhase.SENSORS,
    target: MixTarget.DEVICE,
    sensorName: string
}

export interface MixPositionInfoSensorsGroup {
    phase: MixPhase.SENSORS,
    target: MixTarget.GROUP,
    groupName: string
}

export interface MixPositionInfoActuatorsDevice {
    phase: MixPhase.ACTUATORS,
    target: MixTarget.DEVICE,
    actuatorName: string
}

export interface MixPositionInfoActuatorsGroup {
    phase: MixPhase.ACTUATORS,
    target: MixTarget.GROUP,
    groupName: string
}

export function createMixInfo(values: Record<string, string>): MixPositionInfo | null {
    if (
        values["phase"] == MixPhase.CENTER) {
        if (values["target"] == MixTarget.CENTER) {
            if (values["mixName"] != null && values["mixDisplayName"] != null) {
                return {
                    phase:          values["phase"],
                    target:         values["target"],
                    mixName:        values["mixName"],
                    mixDisplayName: values["mixDisplayName"]
                };
            } else {
                return null;
            }
        } else {
            return null;
        }
    }
    if (values["target"] == MixTarget.CENTER) {
        return null;
    } else if (values["target"] == MixTarget.DEVICE) {
        if (values["phase"] == MixPhase.ACTUATORS) {
            if (values["actuatorName"] != null) {
                return {
                    phase:        values["phase"],
                    target:       values["target"],
                    actuatorName: values["actuatorName"]
                };
            } else {
                return null;
            }
        } else if (values["phase"] == MixPhase.SENSORS) {
            if (values["sensorName"] != null) {
                return {
                    phase:      values["phase"],
                    target:     values["target"],
                    sensorName: values["sensorName"]
                };
            } else {
                return null;
            }
        } else {
            return null;
        }
    } else if (values["target"] == MixTarget.GROUP) {
        if (values["phase"] == MixPhase.ACTUATORS) {
            if (values["groupName"] != null) {
                return {
                    phase:     values["phase"],
                    target:    values["target"],
                    groupName: values["groupName"]
                };
            } else {
                return null;
            }
        } else if (values["phase"] == MixPhase.SENSORS) {
            if (values["groupName"] != null) {
                return {
                    phase:     values["phase"],
                    target:    values["target"],
                    groupName: values["groupName"]
                };
            } else {
                return null;
            }
        } else {
            return null;
        }
    } else {
        return null;
    }
}

export function mixInfoFromJSON(json: MixPositionInfoJSON): MixPositionInfo | null {
    const values: Record<string, string> = {
        phase:  json.phase,
        target: json.target
    };
    if (json.actuatorName != null) {
        values["actuatorName"] = json.actuatorName;
    }
    if (json.groupName != null) {
        values["groupName"] = json.groupName;
    }
    if (json.sensorName != null) {
        values["sensorName"] = json.sensorName;
    }
    if (json.mixName != null) {
        values["mixName"] = json.mixName;
    }
    if (json.mixDisplayName != null) {
        values["mixDisplayName"] = json.mixDisplayName;
    }
    return createMixInfo(values);
}

export class MixPositionInfoJSON {
    
    @IsEnum(MixPhase)
    public phase: MixPhase;
    
    @IsEnum(MixTarget)
    public target: MixTarget;
    
    @IsOptional()
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public actuatorName?: string;
    
    @IsOptional()
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public groupName?: string;
    
    @IsOptional()
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public sensorName?: string;
    
    @IsOptional()
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public mixName?: string;
    
    @IsOptional()
    @IsNotEmpty()
    public mixDisplayName?: string;
    
    constructor(phase: MixPhase, target: MixTarget) {
        this.phase  = phase;
        this.target = target;
    }
    
    public static toJSON(mixInfo: MixPositionInfo): MixPositionInfoJSON {
        return {
            phase:          mixInfo.phase,
            target:         mixInfo.target,
            sensorName:     (mixInfo as MixPositionInfoSensorsDevice).sensorName,
            actuatorName:   (mixInfo as MixPositionInfoActuatorsDevice).actuatorName,
            groupName:      (mixInfo as MixPositionInfoActuatorsGroup | MixPositionInfoSensorsGroup).groupName,
            mixName:        (mixInfo as MixPositionInfoCenter).mixName,
            mixDisplayName: (mixInfo as MixPositionInfoCenter).mixDisplayName
        };
    }
}

export class PutMixBodyJSON {
    
    @ValidateNested()
    @Type(() => MixPositionInfoJSON)
    public position: MixPositionInfoJSON;
    
    @ValidateNested()
    @Type(() => MixJSON)
    public mix: MixJSON;
    
    constructor(position: MixPositionInfoJSON, mix: MixJSON) {
        this.position = position;
        this.mix      = mix;
    }
    
}

export enum PutMixShowableError {
    IMPORTS_UNAVAILABLE   = "IMPORTS_UNAVAILABLE",
    INPUTS_WITHOUT_IMPORT = "INPUTS_WITHOUT_IMPORT",
    CYCLE                 = "CYCLE",
    WRONG_CONNECTIONS     = "WRONG_CONNECTIONS",
    OUTPUTS_IN_USE        = "OUTPUTS_IN_USE"
}


