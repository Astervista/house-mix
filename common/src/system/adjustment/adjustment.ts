/* *****************************************************************************************
 
 Documentation in this file is hacky in some points.
 
 For some reason TypeDoc has a hard time resolving @link references when they reference a
 type alias (generic type, the <D> and similar in classes, however you want to call them)
 and class members using such type aliases. For example, in this file, Adjustment#data is
 defined as public data: D; and @link tags to Adjustment#data don't work anymore. To work
 around it those links (like the links to dataToJSON and other members) are replaced with
 "hard" links (<a href="./system_adjustment_adjustment.Adjustment.html#data">`data`</a>).
 
 There is no other currently viable solution until this TypeDoc bug is solved.
 
 ***************************************************************************************** */
/**
 * This module contains {@link Adjustment|`Adjustment`} and the related classes, to define adjustments
 * on the behavior of the system in some conditions.
 *
 * @module
 */
import {Allow, IsEnum, IsNotEmpty, IsNumber, Matches, Min, ValidateIf} from "rest-decorators";
import {UNIQUE_NAME_PATTERN} from "../../utils/constants";

// noinspection ES6UnusedImports
import {Actuator} from "../../devices/actuator/actuator";

/**
 * The type of {@link Adjustment|`Adjustment`}, defining its purpose.
 */
export enum AdjustmentType {
    /** This is an adjustment correcting the behavior of the system when turning a lamp off with transition. */
    ANIMATION_OFF  = "ANIMATION_OFF",
    /** This is an adjustment correcting the behavior of the system when turning a lamp on with transition. */
    ANIMATION_ON   = "ANIMATION_ON",
    /** This is an adjustment transforming an object sent to an {@link Actuator|`Actuator`} as a command object with multiple properties into multiple commands. */
    SPLIT_COMMANDS = "SPLIT_COMMANDS"
}

/**
 * An {@link Adjustment|`Adjustment`} is a tweak on how the system normally behaves, applied to a specific target or to the whole system.
 *
 * The most exemplary use case is to change the way the system communicates or elaborates commands regarding a device through mqtt, tweaking the
 * data sent or received on the network.
 *
 * @template D - The custom data type the adjustment requires for customization.
 * @template J - The serialized (JSON) class type for `D`.
 */
export abstract class Adjustment<D, J> {
    
    /** The type of adjustment, defining its purpose. */
    public readonly type: AdjustmentType;
    
    /**
     * The adjustment's unique positive integer id. This id identifies the adjustment in the system.
     * It can be the string `"NEW"` to mark the fact that the mix has yet to be assigned
     * an id by the backend.
     */
    public id: number | "NEW" = "NEW";
    
    /** Custom data used by the adjustment to customize its functionality. */
    public data: D;
    
    /**
     * Creates an instance of the class. To be used by the concrete subclasses of this class to create instances, never by itself.
     *
     * @param {number | "NEW"} id - The adjustment's unique positive integer id. This id identifies the adjustment in the system.
     * @param {AdjustmentType} type - The type of adjustment, defining its purpose.
     * @param {D} data - Custom data used by the adjustment to customize its functionality.
     * @protected
     */
    protected constructor(id: number | "NEW", type: AdjustmentType, data: D) {
        this.id   = id;
        this.type = type;
        this.data = data;
    }
    
    /**
     * Function deserializing the adjustment's <a href="./system_adjustment_adjustment.Adjustment.html#data">`data`</a> from type `J` to type `D`.
     *
     * @param {J} dataJSON - The serialized data.
     * @returns {D} The deserialized data.
     * @see <a href="./system_adjustment_adjustment.Adjustment.html#datatojson">`Adjustment.dataToJSON()`</a>.
     */
    public abstract dataFromJSON(dataJSON: J): D;
    
    /**
     * Function serializing the adjustment's <a href="./system_adjustment_adjustment.Adjustment.html#data">`data`</a> from type `D` to type `J`.
     *
     * @param {D} data - The deserialized data.
     * @returns {J} - The serialized data.
     * @see <a href="./system_adjustment_adjustment.Adjustment.html#datafromjson">`Adjustment.dataFromJSON()`</a>.
     */
    public abstract dataToJSON(data: D): J;
    
    /**
     * Checks whether some variable of type `unknown` fits the structure of serialized data type `J`.
     *
     * @param {unknown} data - The data to be checked.
     * @returns {boolean} - Whether `data` is a valid instance of `J`.
     * @see <a href="./system_adjustment_adjustment.Adjustment.html#datafromjson">`Adjustment.dataFromJSON()`</a>.
     * @see <a href="./system_adjustment_adjustment.Adjustment.html#datatojson">`Adjustment.dataToJSON()`</a>.
     */
    public abstract isValidData(data: unknown): boolean;
    
    /**
     * Converts the adjustment instance into its JSON representation.
     *
     * @returns {AdjustmentJSON} The JSON representation of `this`.
     */
    public toJSON(): AdjustmentJSON<J> {
        return {
            id:   this.id,
            type: this.type,
            data: this.dataToJSON(this.data)
        };
    }
    
    /**
     * Constructs a new {@link Adjustment|`Adjustment`} instance from a given JSON representation.
     *
     * @param {AdjustmentJSON} adjustmentJSON - The JSON representation of the adjustment.
     * @returns {Adjustment} The adjustment object constructed from the provided JSON.
     * @see <a href="./system_adjustment_adjustment.Adjustment.html#datafromjson">`Adjustment.dataFromJSON()`</a>.
     * @see <a href="./system_adjustment_adjustment.Adjustment.html#datatojson">`Adjustment.dataToJSON()`</a>.
     */
    public static fromJSON(adjustmentJSON: AdjustmentJSON<unknown>): Adjustment<unknown, unknown> | null {
        switch (adjustmentJSON.type) {
            case AdjustmentType.ANIMATION_OFF: {
                const validatedJSON = AdjustmentAnimationOff.validateJSON(adjustmentJSON.data);
                if (validatedJSON) {
                    return new AdjustmentAnimationOff(adjustmentJSON.id, validatedJSON);
                } else {
                    return null;
                }
            }
            case AdjustmentType.ANIMATION_ON: {
                const validatedJSON = AdjustmentAnimationOn.validateJSON(adjustmentJSON.data);
                if (validatedJSON) {
                    return new AdjustmentAnimationOn(adjustmentJSON.id, validatedJSON);
                } else {
                    return null;
                }
            }
            case AdjustmentType.SPLIT_COMMANDS: {
                const validatedJSON = AdjustmentSplitCommands.validateJSON(adjustmentJSON.data);
                if (validatedJSON) {
                    return new AdjustmentSplitCommands(adjustmentJSON.id, validatedJSON);
                } else {
                    return null;
                }
            }
        }
    }
    
}

/**
 * This adjustment corrects the behavior of the system when turning a lamp off with a transition or animation, by splitting
 * a command to turn it off into two different equivalent commands that avoid an unwanted behavior of the lamp.
 *
 * Some lamps, when sending a command to turn off a lamp with a transition, like for example:
 * ```json
 * {
 *     "state": "OFF",
 *     "transition": 1000,
 *
 *     ..other properties..
 * }
 * ```
 * or
 * ```json
 * {
 *     "brightness": "0",
 *     "transition": 1000,
 *
 *     ..other properties..
 * }
 * ```
 * do not actually turn off and instead do a transition toward the minimum brightness level, not actually turning off;
 * they may also turn off immediately ignoring the `transition` property.
 *
 * This adjustment corrects this behavior by catching commands that would result in an off position and normalizing them by
 * sending two commands: the first command containing the exact command that was requested, patched to transition towards a
 * {@link AdjustmentAnimationOffData#minValidBrightness|minimum valid brightness} (the lowest that doesn't trigger the
 * unwanted behavior), and then sending an `"OFF"` command after the transition has ended.
 *
 * The first command in the examples above would be therefore changed to these, if this adjustment were to be applied:
 * - first, the command
 * ```json
 * {
 *     "brightness": 1,
 *     "transition": 1000,
 *
 *     ..other properties..
 * }
 * ```
 * would be sent immediately
 * - then, the command
 * ```json
 * {
 *     "state": "OFF",
 *     "transition": 0
 * }
 * ```
 * would be sent after 1 second (with some additional time to account for network latency).
 */
export class AdjustmentAnimationOff extends Adjustment<AdjustmentAnimationOffData, AdjustmentAnimationOffData> {
    
    /**
     * Creates an instance of the class.
     *
     * @param {number | "NEW"} id - Value for {@link Adjustment#id|`id`}.
     * @param {AdjustmentAnimationOffData} data - The data to customize this adjustment, specifying the minimum brightness and the {@link Actuator|`Actuator`}
     *                                            to apply the adjustment to.
     */
    constructor(id: number | "NEW", data: AdjustmentAnimationOffData) {
        super(id, AdjustmentType.ANIMATION_OFF, data);
    }
    
    /**
     * Function deserializing the adjustment's {@link AdjustmentAnimationOff#data|`data`} from type
     * {@link AdjustmentAnimationOffData|`AdjustmentAnimationOffData`} to type {@link AdjustmentAnimationOffData|`AdjustmentAnimationOffData`}.
     * Since the base class is already serializable, the two classes are the same and hence this function is the identity function.
     *
     * @param {AdjustmentAnimationOffData} dataJSON - The serialized data.
     * @returns {AdjustmentAnimationOffData} The deserialized data.
     * @see <a href="./system_adjustment_adjustment.Adjustment.html#datatojson">`AdjustmentAnimationOff.dataToJSON()`</a>.
     */
    public dataFromJSON(dataJSON: AdjustmentAnimationOffData): AdjustmentAnimationOffData {
        return dataJSON;
    }
    
    /**
     * Function serializing the adjustment's {@link AdjustmentAnimationOff#data|`data`} from type
     * {@link AdjustmentAnimationOffData|`AdjustmentAnimationOffData`} to type {@link AdjustmentAnimationOffData|`AdjustmentAnimationOffData`}.
     * Since the base class is already serializable, the two classes are the same and hence this function is the identity function.
     *
     * @param {AdjustmentAnimationOffData} data - The deserialized data.
     * @returns {AdjustmentAnimationOffData} - The serialized data.
     * @see <a href="./system_adjustment_adjustment.Adjustment.html#datafromjson">`AdjustmentAnimationOff.dataFromJSON()`</a>.
     */
    public dataToJSON(data: AdjustmentAnimationOffData): AdjustmentAnimationOffData {
        return data;
    }
    
    /**
     * Checks whether some variable of type `unknown` fits the structure of serialized data type {@link AdjustmentAnimationOffData|`AdjustmentAnimationOffData`}.
     *
     * @param {unknown} data - The data to be checked.
     * @returns {boolean} - Whether `data` is a valid instance of `J`.
     * @see <a href="./system_adjustment_adjustment.Adjustment.html#datafromjson">`AdjustmentAnimationOff.dataFromJSON()`</a>.
     * @see <a href="./system_adjustment_adjustment.Adjustment.html#datatojson">`AdjustmentAnimationOff.dataToJSON()`</a>.
     */
    public override isValidData(data: unknown): boolean {
        return AdjustmentAnimationOff.validateJSON(data) != null;
    }
    
    /**
     * Checks whether some variable of type `unknown` fits the structure of serialized data type
     * {@link AdjustmentAnimationOffData|`AdjustmentAnimationOffData`} and returns it as an instance
     * of such class.
     *
     * @param {unknown} dataJSON - The value to check.
     * @returns {AdjustmentAnimationOffData | undefined} - An instance of {@link AdjustmentAnimationOffData|`AdjustmentAnimationOffData`} if the
     *                                                     value passes validation, `null` otherwise.
     */
    public static validateJSON(dataJSON: unknown): AdjustmentAnimationOffData | undefined {
        if (typeof dataJSON == "object"
            && dataJSON != null
            && "minValidBrightness" in dataJSON
            && "actuatorName" in dataJSON
        ) {
            if (typeof dataJSON.minValidBrightness != "number") {
                return undefined;
            }
            if (typeof dataJSON.actuatorName != "string" || dataJSON.actuatorName.length == 0 || !UNIQUE_NAME_PATTERN.test(dataJSON.actuatorName)) {
                return undefined;
            }
            return new AdjustmentAnimationOffData(
                dataJSON.minValidBrightness,
                dataJSON.actuatorName
            );
        } else {
            return undefined;
        }
    }
    
    
}

/**
 * Class containing the customization for {@link AdjustmentAnimationOff|`AdjustmentAnimationOff`}.
 */
export class AdjustmentAnimationOffData {
    
    /**
     * The minimum brightness that the light supports without triggering the unwanted behavior.
     *
     * @see {@link AdjustmentAnimationOff|`AdjustmentAnimationOff`} for more information on the unwanted behavior.
     */
    @IsNumber()
    @Min(0)
    public minValidBrightness: number;
    
    /**
     * The {@link Actuator#name|name} uniquely identifying the {@link Actuator|`Actuator`} the adjustment is applied to.
     */
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public actuatorName: string;
    
    /**
     * Create an instance of the class.
     *
     * @param {number} minValidBrightness - Value for {@link AdjustmentAnimationOffData#minValidBrightness|`minValidBrightness`}.
     * @param {string} actuatorName - Value for {@link AdjustmentAnimationOffData#actuatorName|`actuatorName`}.
     */
    constructor(minValidBrightness: number, actuatorName: string) {
        this.minValidBrightness = minValidBrightness;
        this.actuatorName       = actuatorName;
    }
    
}

/**
 * This adjustment corrects the behavior of the system when turning a lamp on with a transition or animation, by splitting
 * a command to turn it on into two different equivalent commands that avoid an unwanted behavior of the lamp.
 *
 * Some lamps, when sending a command that would turn on a lamp in the `'OFF'` state with a transition, like for example:
 * ```json
 * {
 *     "state": "ON",
 *     "transition": 1000,
 *
 *     ..other properties..
 * }
 * ```
 * or
 * ```json
 * {
 *     "brightness": "255",
 *     "transition": 1000,
 *
 *     ..other properties..
 * }
 * ```
 * turn on the light immediately ignoring the `transition` property.
 *
 * This adjustment corrects this behavior by catching commands that would turn on the light from the `'OFF'` state normalizing them by
 * sending two commands: as first command, a command to turn on the light immediately to a
 * {@link AdjustmentAnimationOffData#minValidBrightness|minimum valid brightness} (the lowest that isn't still off),
 * and then sending the exact command that was requested, that will transition as expected from that minimum brightness
 *
 * The first command in the examples above would be therefore changed to these, if this adjustment were to be applied:
 * - first, the command
 * ```json
 * {
 *     "state": "ON",
 *     "transition": 0
 *     "brightness": 1,
 * }
 * ```
 * would be sent immediately
 * - then, the command
 * ```json
 * {
 *     "state": "ON",
 *     "brightness": 255,
 *     "transition": 1000,
 *
 *     ..other properties..
 * }
 * ```
 * would be sent immediately after (waiting only some small amount of time to account for network latency).
 */
export class AdjustmentAnimationOn extends Adjustment<AdjustmentAnimationOnData, AdjustmentAnimationOnData> {
    
    /**
     * Creates an instance of the class.
     *
     * @param {number | "NEW"} id - Value for {@link Adjustment#id|`id`}.
     * @param {AdjustmentAnimationOnData} data - The data to customize this adjustment, specifying the minimum brightness and the {@link Actuator|`Actuator`}
     *                                            to apply the adjustment to.
     */
    constructor(id: number | "NEW", data: AdjustmentAnimationOnData) {
        super(id, AdjustmentType.ANIMATION_ON, data);
    }
    
    /**
     * Function deserializing the adjustment's {@link AdjustmentAnimationOn#data|`data`} from type
     * {@link AdjustmentAnimationOnData|`AdjustmentAnimationOnData`} to type {@link AdjustmentAnimationOnData|`AdjustmentAnimationOnData`}.
     * Since the base class is already serializable, the two classes are the same and hence this function is the identity function.
     *
     * @param {AdjustmentAnimationOnData} dataJSON - The serialized data.
     * @returns {AdjustmentAnimationOnData} The deserialized data.
     * @see <a href="./system_adjustment_adjustment.Adjustment.html#datatojson">`AdjustmentAnimationOn.dataToJSON()`</a>.
     */
    public dataFromJSON(dataJSON: AdjustmentAnimationOnData): AdjustmentAnimationOnData {
        return dataJSON;
    }
    
    /**
     * Function serializing the adjustment's {@link AdjustmentAnimationOn#data|`data`} from type
     * {@link AdjustmentAnimationOnData|`AdjustmentAnimationOnData`} to type {@link AdjustmentAnimationOnData|`AdjustmentAnimationOnData`}.
     * Since the base class is already serializable, the two classes are the same and hence this function is the identity function.
     *
     * @param {AdjustmentAnimationOnData} data - The deserialized data.
     * @returns {AdjustmentAnimationOnData} - The serialized data.
     * @see <a href="./system_adjustment_adjustment.Adjustment.html#datafromjson">`AdjustmentAnimationOn.dataFromJSON()`</a>.
     */
    public dataToJSON(data: AdjustmentAnimationOnData): AdjustmentAnimationOnData {
        return data;
    }
    
    /**
     * Checks whether some variable of type `unknown` fits the structure of serialized data type {@link AdjustmentAnimationOnData|`AdjustmentAnimationOnData`}.
     *
     * @param {unknown} data - The data to be checked.
     * @returns {boolean} - Whether `data` is a valid instance of `J`.
     * @see <a href="./system_adjustment_adjustment.Adjustment.html#datafromjson">`AdjustmentAnimationOn.dataFromJSON()`</a>.
     * @see <a href="./system_adjustment_adjustment.Adjustment.html#datatojson">`AdjustmentAnimationOn.dataToJSON()`</a>.
     */
    public override isValidData(data: unknown): boolean {
        return AdjustmentAnimationOn.validateJSON(data) != null;
    }
    
    
    /**
     * Checks whether some variable of type `unknown` fits the structure of serialized data type
     * {@link AdjustmentAnimationOnData|`AdjustmentAnimationOnData`} and returns it as an instance
     * of such class.
     *
     * @param {unknown} dataJSON - The value to check.
     * @returns {AdjustmentAnimationOnData | undefined} - An instance of {@link AdjustmentAnimationOnData|`AdjustmentAnimationOnData`} if the
     *                                                     value passes validation, `null` otherwise.
     */
    public static validateJSON(dataJSON: unknown): AdjustmentAnimationOnData | undefined {
        if (typeof dataJSON == "object"
            && dataJSON != null
            && "minValidBrightness" in dataJSON
            && "actuatorName" in dataJSON
        ) {
            if (typeof dataJSON.minValidBrightness != "number") {
                return undefined;
            }
            if (typeof dataJSON.actuatorName != "string" || dataJSON.actuatorName.length == 0 || !UNIQUE_NAME_PATTERN.test(dataJSON.actuatorName)) {
                return undefined;
            }
            return new AdjustmentAnimationOnData(dataJSON.minValidBrightness, dataJSON.actuatorName);
        } else {
            return undefined;
        }
    }
    
}


/**
 * Class containing the customization for {@link AdjustmentAnimationOn|`AdjustmentAnimationOn`}.
 */
export class AdjustmentAnimationOnData {
    
    /**
     * The minimum brightness that the light supports without being completely off.
     *
     * @see {@link AdjustmentAnimationOn|`AdjustmentAnimationOn`} for more information on the unwanted behavior.
     */
    @IsNumber()
    @Min(0)
    public minValidBrightness: number;
    
    /**
     * The {@link Actuator#name|name} uniquely identifying the {@link Actuator|`Actuator`} the adjustment is applied to.
     */
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public actuatorName: string;
    
    /**
     * Create an instance of the class.
     *
     * @param {number} minValidBrightness - Value for {@link AdjustmentAnimationOnData#minValidBrightness|`minValidBrightness`}.
     * @param {string} actuatorName - Value for {@link AdjustmentAnimationOnData#actuatorName|`actuatorName`}.
     */
    constructor(minValidBrightness: number, actuatorName: string) {
        this.minValidBrightness = minValidBrightness;
        this.actuatorName       = actuatorName;
    }
    
}

/**
 * This adjustment corrects the behavior of the system when sending a command with transition, by splitting
 * the command into multiple equivalent commands equivalent to the original one.
 *
 * Some lights, when sent multiple light characteristics at the same time (such as `color` and `brightness`)
 * while also requesting a transition, cannot handle all these conditions and do not honor one of them (for
 * example, does not transition but change immediately, or skip one of the complex transitions).
 *
 * This adjustment transforms the command sent to zigbee into multiple commands with transition, each one
 * containing one single light characteristic, and sends one at a time, waiting for the previous command to finish.
 * This does not achieve the desired effect completely, since it's caused by a hardware limitation,
 * but the obtained behavior is more pleasant than a hard switch.
 *
 * As an example, if an actuator's mix results in this command:
 * ```json
 * {
 *     "brightness": 255,
 *     "color": {"x": 0.123, "y": 0.123},
 *     "transition": 5
 * }
 * ```
 * the actual messages sent through mqtt would be:
 * 1. This message is sent immediately:
 * ```json
 * {
 *     "brightness": 255,
 *     "transition": 5
 * }
 * ```
 * 2. This message is sent after 5 seconds (with some additional time to account for network latency):
 * ```json
 * {
 *     "color": {"x": 0.123, "y": 0.123},
 *     "transition": 5
 * }
 * ```
 * The order in which the properties are sent is given by the order they appear in {@link Object.keys| `Object.keys()`}.
 */
export class AdjustmentSplitCommands extends Adjustment<AdjustmentSplitCommandsData, AdjustmentSplitCommandsData> {
    
    /**
     * Creates an instance of the class.
     *
     * @param {number | "NEW"} id - Value for {@link Adjustment#id|`id`}.
     * @param {AdjustmentSplitCommandsData} data - The data to customize this adjustment, specifying  the {@link Actuator|`Actuator`}
     *                                            to apply the adjustment to.
     */
    constructor(id: number | "NEW", data: AdjustmentSplitCommandsData) {
        super(id, AdjustmentType.SPLIT_COMMANDS, data);
    }
    
    /**
     * Function deserializing the adjustment's {@link AdjustmentSplitCommands#data|`data`} from type
     * {@link AdjustmentSplitCommandsData|`AdjustmentSplitCommandsData`} to type {@link AdjustmentSplitCommandsData|`AdjustmentSplitCommandsData`}.
     * Since the base class is already serializable, the two classes are the same and hence this function is the identity function.
     *
     * @param {AdjustmentSplitCommandsData} dataJSON - The serialized data.
     * @returns {AdjustmentSplitCommandsData} The deserialized data.
     * @see <a href="./system_adjustment_adjustment.Adjustment.html#datatojson">`AdjustmentSplitCommands.dataToJSON()`</a>.
     */
    public dataFromJSON(dataJSON: AdjustmentSplitCommandsData): AdjustmentSplitCommandsData {
        return dataJSON;
    }
    
    /**
     * Function serializing the adjustment's {@link AdjustmentSplitCommands#data|`data`} from type
     * {@link AdjustmentSplitCommandsData|`AdjustmentSplitCommandsData`} to type {@link AdjustmentSplitCommandsData|`AdjustmentSplitCommandsData`}.
     * Since the base class is already serializable, the two classes are the same and hence this function is the identity function.
     *
     * @param {AdjustmentSplitCommandsData} data - The deserialized data.
     * @returns {AdjustmentSplitCommandsData} - The serialized data.
     * @see <a href="./system_adjustment_adjustment.Adjustment.html#datafromjson">`AdjustmentSplitCommands.dataFromJSON()`</a>.
     */
    public dataToJSON(data: AdjustmentSplitCommandsData): AdjustmentSplitCommandsData {
        return data;
    }
    
    /**
     * Checks whether some variable of type `unknown` fits the structure of serialized data type {@link AdjustmentSplitCommandsData|`AdjustmentSplitCommandsData`}.
     *
     * @param {unknown} data - The data to be checked.
     * @returns {boolean} - Whether `data` is a valid instance of `J`.
     * @see <a href="./system_adjustment_adjustment.Adjustment.html#datafromjson">`AdjustmentSplitCommands.dataFromJSON()`</a>.
     * @see <a href="./system_adjustment_adjustment.Adjustment.html#datatojson">`AdjustmentSplitCommands.dataToJSON()`</a>.
     */
    public override isValidData(data: unknown): boolean {
        return AdjustmentSplitCommands.validateJSON(data) != null;
    }
    
    
    /**
     * Checks whether some variable of type `unknown` fits the structure of serialized data type
     * {@link AdjustmentSplitCommandsData|`AdjustmentSplitCommandsData`} and returns it as an instance
     * of such class.
     *
     * @param {unknown} dataJSON - The value to check.
     * @returns {AdjustmentSplitCommandsData | undefined} - An instance of {@link AdjustmentSplitCommandsData|`AdjustmentSplitCommandsData`} if the
     *                                                     value passes validation, `null` otherwise.
     */
    public static validateJSON(dataJSON: unknown): AdjustmentSplitCommandsData | undefined {
        if (typeof dataJSON == "object"
            && dataJSON != null
            && "actuatorName" in dataJSON
        ) {
            if (typeof dataJSON.actuatorName != "string" || dataJSON.actuatorName.length == 0 || !UNIQUE_NAME_PATTERN.test(dataJSON.actuatorName)) {
                return undefined;
            }
            return new AdjustmentSplitCommandsData(
                dataJSON.actuatorName
            );
        } else {
            return undefined;
        }
    }
    
}

/**
 * Class containing the customization for {@link AdjustmentSplitCommands|`AdjustmentSplitCommands`}.
 */
export class AdjustmentSplitCommandsData {
    
    /**
     * The {@link Actuator#name|name} uniquely identifying the {@link Actuator|`Actuator`} the adjustment is applied to.
     */
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public actuatorName: string;
    
    /**
     * Create an instance of the class.
     *
     * @param {string} actuatorName - Value for {@link AdjustmentSplitCommandsData#actuatorName|`actuatorName`}.
     */
    constructor(actuatorName: string) {
        this.actuatorName = actuatorName;
    }
    
}

/**
 * The serialization of the class {@link Adjustment|`Adjustment`}.
 *
 * @template J - The serialized (JSON) class type for the data type `D` used in the {@link Adjustment|`Adjustment<D, J>`}.
 */
export class AdjustmentJSON<J> {
    
    
    /**
     * Serialization of the property {@link Adjustment#type|`type`}.
     */
    @IsEnum(AdjustmentType)
    public type: AdjustmentType;
    
    /**
     * Serialization of the property {@link Adjustment#id|`id`}.
     */
    @ValidateIf((o: unknown) => typeof o == "object" && o != null && "id" in o && o.id != "NEW")
    @IsNumber()
    @Min(0)
    public id: number | "NEW" = "NEW";
    
    /**
     * Serialization of the property <a href="./system_adjustment_adjustment.Adjustment.html#data">`data`</a>.
     */
    @Allow()
    public data: J;
    
    /**
     * Creates an instance of the class.
     *
     * @param {number | "NEW"} id - Value for {@link Adjustment#id|`id`}.
     * @param {AdjustmentType} type - Value for {@link Adjustment#type|`type`}.
     * @param {J} data - Value for <a href="./system_adjustment_adjustment.Adjustment.html#data">`data`</a>.
     */
    constructor(id: number | "NEW", type: AdjustmentType, data: J) {
        this.id   = id;
        this.type = type;
        this.data = data;
    }
    
    
}
