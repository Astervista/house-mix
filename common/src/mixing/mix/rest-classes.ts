/**
 * This module contains support classes used for communication with the REST backend regarding {@link Mix|`Mix`es}.
 *
 * @module
 */
import {IsEnum, IsNotEmpty, IsOptional, Matches, Type, ValidateNested} from "rest-decorators";
// noinspection ES6UnusedImports
import type {Mix} from "./mix";
import {Connection, MixJSON} from "./mix";
import {UNIQUE_NAME_PATTERN} from "../../utils/constants";
import {Datum, ExportedDatum} from "./datum";
// noinspection ES6UnusedImports
import type {Sensor} from "../../devices/sensor/sensor";
// noinspection ES6UnusedImports
import type {Actuator} from "../../devices/actuator/actuator";
// noinspection ES6UnusedImports
import type {Group} from "../../devices/group/group";

/**
 *  The phase of the global cycle in which the {@link Mix|`Mix`} will be calculated.
 */
export enum MixPhase {
    /**
     * The mix is linked to a {@link Sensor|`Sensor`}, or to a {@link Group|`Group`}, in the phase when
     * the data coming from the sensors is elaborated towards the center of the system.
     */
    SENSORS   = "SENSORS",
    /**
     * The mix is in the center of the system, in the phase when the data coming from
     * the sensors has been elaborated and is starting to be sent towards the actuators.
     */
    CENTER    = "CENTER",
    /**
     * The mix is linked to a {@link Actuator|`Actuator`}, or to a {@link Group|`Group`}, in the phase when
     * the data coming from the center of the system is elaborated towards the actuators.
     */
    ACTUATORS = "ACTUATORS"
}

/**
 * The type of entity the mix is associated with.
 */
export enum MixTarget {
    /** The mix is associated with either a {@link Sensor|`Sensor`} or a {@link Actuator|`Actuator`}. */
    DEVICE = "DEVICE",
    /** The mix is associated with a {@link Group|`Group`}. */
    GROUP  = "GROUP",
    /** The mix is in the center of the system. */
    CENTER = "CENTER",
}

/**
 * A {@link MixPositionInfo|`MixPositionInfo`} describing a mix calculated in the center of the system, in the phase when
 * the data coming from the center of the system is elaborated towards the actuators.
 */
export interface MixPositionInfoCenter {
    /** The phase the mix is in. */
    phase: MixPhase.CENTER,
    /** The target of the mix. */
    target: MixTarget.CENTER,
    /** The name of the mix, to uniquely identify it within the system. */
    mixName: string,
    /** The display name of the mix, to display in the UI. */
    mixDisplayName: string
}

/**
 * A {@link MixPositionInfo|`MixPositionInfo`} describing a mix linked to a {@link Sensor|`Sensor`}.
 *
 * @see {@link Sensor#mix|`Sensor.mix`}.
 */
export interface MixPositionInfoSensorsDevice {
    /** The phase the mix is in. */
    phase: MixPhase.SENSORS,
    /** The target of the mix. */
    target: MixTarget.DEVICE,
    /** The unique name identifying the sensor. */
    sensorName: string,
    /** The display name of the sensor, to display in the UI. */
    sensorDisplayName: string
}

/**
 * A {@link MixPositionInfo|`MixPositionInfo`} describing a mix linked to a {@link Group|`Group`}, in the phase when
 * the data coming from the sensors is elaborated towards the center of the system.
 *
 * @see {@link Group#sensorMix|`Group.sensorMix`}.
 */
export interface MixPositionInfoSensorsGroup {
    /** The phase the mix is in. */
    phase: MixPhase.SENSORS,
    /** The target of the mix. */
    target: MixTarget.GROUP,
    /** The unique name identifying the group. */
    groupName: string,
    /** The display name of the group, to display in the UI. */
    groupDisplayName: string
}

/**
 * A {@link MixPositionInfo|`MixPositionInfo`} describing a mix linked to an {@link Actuator|`Actuator`}.
 *
 * @see {@link Actuator#mix|`Actuator.mix`}.
 */
export interface MixPositionInfoActuatorsDevice {
    /** The phase the mix is in. */
    phase: MixPhase.ACTUATORS,
    /** The target of the mix. */
    target: MixTarget.DEVICE,
    /** The unique name identifying the actuator. */
    actuatorName: string
    /** The display name of the actuator, to display in the UI. */
    actuatorDisplayName: string
}

/**
 * A {@link MixPositionInfo|`MixPositionInfo`} describing a mix linked to a {@link Group|`Group`}, in the phase when
 * the data coming from the center of the system is elaborated towards the actuators.
 *
 * @see {@link Group#actuatorMix|`Group.actuatorMix`}.
 */
export interface MixPositionInfoActuatorsGroup {
    /** The phase the mix is in. */
    phase: MixPhase.ACTUATORS,
    /** The target of the mix. */
    target: MixTarget.GROUP,
    /** The unique name identifying the group. */
    groupName: string,
    /** The display name of the group, to display in the UI. */
    groupDisplayName: string
}

/**
 * A {@link MixPositionInfo|`MixPositionInfo`} describing a mix in the {@link MixPhase.SENSORS|`SENSORS`} phase.
 */
export type MixPositionInfoSensors = MixPositionInfoSensorsDevice | MixPositionInfoSensorsGroup;

/**
 * A {@link MixPositionInfo|`MixPositionInfo`} describing a mix in the {@link MixPhase.ACTUATORS|`ACTUATORS`} phase.
 */
export type MixPositionInfoActuators = MixPositionInfoActuatorsDevice | MixPositionInfoActuatorsGroup;

/**
 * This type identifies any mix in the system by describing its position in terms of the phase of the calculation of the system the mix is
 * assigned to, and information about the target of the mix.
 */
export type MixPositionInfo = MixPositionInfoSensors | MixPositionInfoCenter | MixPositionInfoActuators;

/**
 * Creates a {@link MixPositionInfo|`MixPositionInfo`} given a map of key and values. This can be used for example to construct the position
 * object from query parameters.
 *
 * @param {Record<string, string>} values - The values mapping to the properties of the various forms of {@link MixPositionInfo|`MixPositionInfo`}. Refer to the specific
 *                                          definition of {@link MixPositionInfo|`MixPositionInfo`} to see the properties.
 * @returns {MixPositionInfo | null} - The reconstructed {@link MixPositionInfo|`MixPositionInfo`} if the values form a valid reference, `null` otherwise.
 */
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

/**
 * Constructs a new {@link MixPositionInfo|`MixPositionInfo`} instance from a given JSON representation.
 *
 * @param {MixPositionInfoJSON} mixPositionInfoJSON - The JSON representation of the mix position information.
 * @returns {MixPositionInfo} The mix position information object constructed from the provided JSON.
 */
export function mixInfoFromJSON(mixPositionInfoJSON: MixPositionInfoJSON): MixPositionInfo | null {
    const values: Record<string, string> = {
        phase:  mixPositionInfoJSON.phase,
        target: mixPositionInfoJSON.target
    };
    if (mixPositionInfoJSON.actuatorName != null) {
        values["actuatorName"] = mixPositionInfoJSON.actuatorName;
    }
    if (mixPositionInfoJSON.actuatorDisplayName != null) {
        values["actuatorDisplayName"] = mixPositionInfoJSON.actuatorDisplayName;
    }
    if (mixPositionInfoJSON.groupName != null) {
        values["groupName"] = mixPositionInfoJSON.groupName;
    }
    if (mixPositionInfoJSON.groupDisplayName != null) {
        values["groupDisplayName"] = mixPositionInfoJSON.groupDisplayName;
    }
    if (mixPositionInfoJSON.sensorName != null) {
        values["sensorName"] = mixPositionInfoJSON.sensorName;
    }
    if (mixPositionInfoJSON.sensorDisplayName != null) {
        values["sensorDisplayName"] = mixPositionInfoJSON.sensorDisplayName;
    }
    if (mixPositionInfoJSON.mixName != null) {
        values["mixName"] = mixPositionInfoJSON.mixName;
    }
    if (mixPositionInfoJSON.mixDisplayName != null) {
        values["mixDisplayName"] = mixPositionInfoJSON.mixDisplayName;
    }
    return createMixInfo(values);
}

/**
 * The serialization of the class {@link MixPositionInfo|`MixPositionInfo`}.
 */
export class MixPositionInfoJSON {
    
    /** Serialization of the property {@link MixPositionInfo|`MixPositionInfo.phase`}. */
    @IsEnum(MixPhase)
    public phase: MixPhase;
    
    /** Serialization of the property {@link MixPositionInfo|`MixPositionInfo.target`}. */
    @IsEnum(MixTarget)
    public target: MixTarget;
    
    /** Serialization of the property {@link MixPositionInfoActuatorsDevice#actuatorName|`actuatorName`}. */
    @IsOptional()
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public actuatorName?: string;
    
    /** Serialization of the property {@link MixPositionInfoActuatorsDevice#actuatorDisplayName|`actuatorDisplayName`}. */
    @IsOptional()
    @IsNotEmpty()
    public actuatorDisplayName?: string;
    
    /** Serialization of the property {@link MixPositionInfoActuatorsGroup#groupName|`groupName`}. */
    @IsOptional()
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public groupName?: string;
    
    /** Serialization of the property {@link MixPositionInfoActuatorsGroup#groupDisplayName|`groupDisplayName`}. */
    @IsOptional()
    @IsNotEmpty()
    public groupDisplayName?: string;
    
    /** Serialization of the property {@link MixPositionInfoSensorsDevice#sensorName|`sensorName`}. */
    @IsOptional()
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public sensorName?: string;
    
    /** Serialization of the property {@link MixPositionInfoSensorsDevice#sensorDisplayName|`sensorDisplayName`}. */
    @IsOptional()
    @IsNotEmpty()
    public sensorDisplayName?: string;
    
    /** Serialization of the property {@link MixPositionInfoCenter#mixName|`mixName`}. */
    @IsOptional()
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public mixName?: string;
    
    /** Serialization of the property {@link MixPositionInfoCenter#mixDisplayName|`mixDisplayName`}. */
    @IsOptional()
    @IsNotEmpty()
    public mixDisplayName?: string;
    
    /**
     * Creates an instance of the class.
     *
     * @param {MixPhase} phase - Value for {@link MixPositionInfoJSON#phase|`phase`}.
     * @param {MixTarget} target - Value for {@link MixPositionInfoJSON#target|`target`}.
     */
    constructor(phase: MixPhase, target: MixTarget) {
        this.phase  = phase;
        this.target = target;
    }
    
    /**
     * Converts a mix position information instance into its JSON representation.
     *
     * @param {MixPositionInfo} mixInfo - The mix position information to convert.
     * @returns {MixPositionInfoJSON} The JSON representation of the input.
     */
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

/**
 * Support class that defines the body of a `PUT` request creating or updating a mix.
 */
export class PutMixBodyJSON {
    
    /** The position indicating what the mix is associated with. */
    @ValidateNested()
    @Type(() => MixPositionInfoJSON)
    public position: MixPositionInfoJSON;
    
    /** The data of the mix. */
    @ValidateNested()
    @Type(() => MixJSON)
    public mix: MixJSON;
    
    /**
     * Constructs an instance of the class.
     *
     * @param {MixPositionInfoJSON} position - Value for {@link PutMixBodyJSON#position|`position`}.
     * @param {MixJSON} mix      - Value for {@link PutMixBodyJSON#mix|`mix`}.
     */
    constructor(position: MixPositionInfoJSON, mix: MixJSON) {
        this.position = position;
        this.mix      = mix;
    }
    
}

/**
 * All the possible error types that can occurring while executing `PUT` request creating or updating a mix.
 */
export enum PutMixShowableError {
    IMPORTS_UNAVAILABLE   = "IMPORTS_UNAVAILABLE",
    INPUTS_WITHOUT_IMPORT = "INPUTS_WITHOUT_IMPORT",
    CYCLE                 = "CYCLE",
    WRONG_CONNECTIONS     = "WRONG_CONNECTIONS",
    OUTPUTS_IN_USE        = "OUTPUTS_IN_USE"
}

/**
 * An object containing information about an error occurred while executing a `PUT` request creating or updating a mix.
 */
export type PutMixShowableErrorObject = {
    /** Whether the error can be displayed to the user. */
    showable:  true,
    /** The type of error that occurred. */
    errorType: PutMixShowableError.INPUTS_WITHOUT_IMPORT,
    /**
     * The inputs that are missing a corresponding input in the mix.
     *
     * @see {@link Mix#imports|`Mix.imports`}.
     */
    orphanInputs: Datum[],
    /** The message explaining the error. */
    message: string
} | {
    /** Whether the error can be displayed to the user. */
    showable:  true,
    /** The type of error that occurred. */
    errorType: PutMixShowableError.IMPORTS_UNAVAILABLE,
    /** The imports that are used in the mix but are not available to this mix. */
    unavailableImports: ExportedDatum[],
    /** The message explaining the error. */
    message:  string
} | {
    /** Whether the error can be displayed to the user. */
    showable:         true,
    /** The type of error that occurred. */
    errorType:        PutMixShowableError.OUTPUTS_IN_USE,
    /** The outputs that the new mix is not exposing anymore, but that were exposed in the past and can't be removed because they are used by some other mix. */
    dependingOutputs: string[],
    /** The message explaining the error. */
    message:          string
} | {
    /** Whether the error can be displayed to the user. */
    showable:  true,
    /** The type of error that occurred. */
    errorType: PutMixShowableError.CYCLE,
    /** The message explaining the error. */
    message:   string
} | {
    /** Whether the error can be displayed to the user. */
    showable:  true,
    /** The type of error that occurred. */
    errorType: PutMixShowableError.WRONG_CONNECTIONS,
    /** The connections that are configured improperly. */
    wrongConnections: Connection[],
    /** The message explaining the error. */
    message:   string
} | {
    /** Whether the error can be displayed to the user. */
    showable?: false
}
