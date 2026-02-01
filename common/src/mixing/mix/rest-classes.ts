import {IsEnum, IsNotEmpty, IsOptional, Matches, Type, ValidateNested} from "rest-decorators";
import {Connection, MixJSON} from "./mix";
import {UNIQUE_NAME_PATTERN} from "../../utils/constants";
import {Datum, ExportedDatum} from "./datum";

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
    sensorName: string,
    sensorDisplayName: string
}

export interface MixPositionInfoSensorsGroup {
    phase: MixPhase.SENSORS,
    target: MixTarget.GROUP,
    groupName: string,
    groupDisplayName: string
}

export interface MixPositionInfoActuatorsDevice {
    phase: MixPhase.ACTUATORS,
    target: MixTarget.DEVICE,
    actuatorName: string
    actuatorDisplayName: string
}

export interface MixPositionInfoActuatorsGroup {
    phase: MixPhase.ACTUATORS,
    target: MixTarget.GROUP,
    groupName: string,
    groupDisplayName: string
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
            if (values["actuatorName"] != null && values["actuatorDisplayName"] != null) {
                return {
                    phase:        values["phase"],
                    target:       values["target"],
                    actuatorName: values["actuatorName"],
                    actuatorDisplayName: values["actuatorDisplayName"]
                };
            } else {
                return null;
            }
        } else if (values["phase"] == MixPhase.SENSORS) {
            if (values["sensorName"] != null && values["sensorDisplayName"] != null) {
                return {
                    phase:      values["phase"],
                    target:     values["target"],
                    sensorName: values["sensorName"],
                    sensorDisplayName: values["sensorDisplayName"]
                };
            } else {
                return null;
            }
        } else {
            return null;
        }
    } else if (values["target"] == MixTarget.GROUP) {
        if (values["phase"] == MixPhase.ACTUATORS) {
            if (values["groupName"] != null && values["groupDisplayName"] != null) {
                return {
                    phase:     values["phase"],
                    target:    values["target"],
                    groupName: values["groupName"],
                    groupDisplayName: values["groupDisplayName"]
                };
            } else {
                return null;
            }
        } else if (values["phase"] == MixPhase.SENSORS) {
            if (values["groupName"] != null && values["groupDisplayName"] != null) {
                return {
                    phase:     values["phase"],
                    target:    values["target"],
                    groupName: values["groupName"],
                    groupDisplayName: values["groupDisplayName"]
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
    if (json.actuatorDisplayName != null) {
        values["actuatorDisplayName"] = json.actuatorDisplayName;
    }
    if (json.groupName != null) {
        values["groupName"] = json.groupName;
    }
    if (json.groupDisplayName != null) {
        values["groupDisplayName"] = json.groupDisplayName;
    }
    if (json.sensorName != null) {
        values["sensorName"] = json.sensorName;
    }
    if (json.sensorDisplayName != null) {
        values["sensorDisplayName"] = json.sensorDisplayName;
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
    public actuatorDisplayName?: string;
    
    @IsOptional()
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public groupName?: string;
    
    @IsOptional()
    @IsNotEmpty()
    public groupDisplayName?: string;
    
    @IsOptional()
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public sensorName?: string;
    
    @IsOptional()
    @IsNotEmpty()
    public sensorDisplayName?: string;
    
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
            sensorDisplayName: (mixInfo as MixPositionInfoSensorsDevice).sensorDisplayName,
            actuatorName:   (mixInfo as MixPositionInfoActuatorsDevice).actuatorName,
            actuatorDisplayName: (mixInfo as MixPositionInfoActuatorsDevice).actuatorDisplayName,
            groupName:      (mixInfo as MixPositionInfoActuatorsGroup | MixPositionInfoSensorsGroup).groupName,
            groupDisplayName: (mixInfo as MixPositionInfoActuatorsGroup | MixPositionInfoSensorsGroup).groupDisplayName,
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

export type PutMixShowableErrorObject = {
    showable:  true,
    errorType: PutMixShowableError.INPUTS_WITHOUT_IMPORT,
    orphanInputs: Datum[],
    message: string
} | {
    showable:  true,
    errorType: PutMixShowableError.IMPORTS_UNAVAILABLE,
    unavailableImports: ExportedDatum[],
    message:  string
} | {
    showable:         true,
    errorType:        PutMixShowableError.OUTPUTS_IN_USE,
    dependingOutputs: string[],
    message:          string
} | {
    showable:  true,
    errorType: PutMixShowableError.CYCLE,
    message:   string
} | {
    showable:  true,
    errorType: PutMixShowableError.WRONG_CONNECTIONS,
    wrongConnections: Connection[],
    message:   string
} | {
    showable?: false
}
