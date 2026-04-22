/**
 * Defines the base classes and implementations for all logic nodes used in the mixing system.
 *
 * @module
 */
import {Datum, DatumType, DatumTypeColor, DatumTypeColorBase} from "./datum";
import {IsEnum, IsInt, IsOptional, Min} from "rest-decorators";
import {Allow} from "../../decorators/decorators-mock";
import {Color, ColorSpace} from "../../utils/color-convert";
import {getTimes} from "suncalc";
import {MixingStorage} from "./mix";
import {MAX_ALLOWED_TEMP, MIN_ALLOWED_TEMP} from "../../utils/constants";

/**
 * Enum representing all the possible types of {@link ElaborationNode|`ElaborationNode`}.
 */
export enum ElaborationNodeCode {
    /** The type for {@link ElaborationNodeAddition|`ElaborationNodeAddition`}. */
    ADDITION              = "ADDITION",
    /** The type for {@link ElaborationNodeSubtraction|`ElaborationNodeSubtraction`}. */
    SUBTRACTION           = "SUBTRACTION",
    /** The type for {@link ElaborationNodeMultiplication|`ElaborationNodeMultiplication`}. */
    MULTIPLICATION        = "MULTIPLICATION",
    /** The type for {@link ElaborationNodeDivision|`ElaborationNodeDivision`}. */
    DIVISION              = "DIVISION",
    /** The type for {@link ElaborationNodeModulo|`ElaborationNodeModulo`}. */
    MODULO                = "MODULO",
    /** The type for {@link ElaborationNodeMax|`ElaborationNodeMax`}. */
    MAX                   = "MAX",
    /** The type for {@link ElaborationNodeMin|`ElaborationNodeMin`}. */
    MIN                   = "MIN",
    /** The type for {@link ElaborationNodeGreaterThan|`ElaborationNodeGreaterThan`}. */
    CLAMP                 = "CLAMP",
    /** The type for {@link ElaborationNodeLessThan|`ElaborationNodeLessThan`}. */
    LERP                  = "LERP",
    /** The type for {@link ElaborationNodeCycle|`ElaborationNodeCycle`}. */
    AND                   = "AND",
    /** The type for {@link ElaborationNodeClamp|`ElaborationNodeClamp`}. */
    OR                    = "OR",
    /** The type for {@link ElaborationNodeLerp|`ElaborationNodeLerp`}. */
    XOR                   = "XOR",
    /** The type for {@link ElaborationNodeAnd|`ElaborationNodeAnd`}. */
    NOT                   = "NOT",
    /** The type for {@link ElaborationNodeOr|`ElaborationNodeOr`}. */
    BUFFER                = "BUFFER",
    /** The type for {@link ElaborationNodeXor|`ElaborationNodeXor`}. */
    NULL_GUARD            = "NULL_GUARD",
    /** The type for {@link ElaborationNodeNot|`ElaborationNodeNot`}. */
    EQUALITY_CHECK        = "EQUALITY_CHECK",
    /** The type for {@link ElaborationNodeBuffer|`ElaborationNodeBuffer`}. */
    GREATER_THAN          = "GREATER_THAN",
    /** The type for {@link ElaborationNodeNullGuard|`ElaborationNodeNullGuard`}. */
    LESS_THAN             = "LESS_THAN",
    /** The type for {@link ElaborationNodeEqualityCheck|`ElaborationNodeEqualityCheck`}. */
    CYCLE                 = "CYCLE",
    /** The type for {@link ElaborationNodeBinaryChoice|`ElaborationNodeBinaryChoice`}. */
    BINARY_CHOICE         = "BINARY_CHOICE",
    /** The type for {@link ElaborationNodeMultipleChoice|`ElaborationNodeMultipleChoice`}. */
    MULTIPLE_CHOICE       = "MULTIPLE_CHOICE",
    /** The type for {@link ElaborationNodeEncoder|`ElaborationNodeEncoder`}. */
    ENCODER               = "ENCODER",
    /** The type for {@link ElaborationNodeExtractRGB|`ElaborationNodeExtractRGB`}. */
    EXTRACT_RGB           = "EXTRACT_RGB",
    /** The type for {@link ElaborationNodeExtractHSL|`ElaborationNodeExtractHSL`}. */
    EXTRACT_HSL           = "EXTRACT_HSL",
    /** The type for {@link ElaborationNodeExtractHSV|`ElaborationNodeExtractHSV`}. */
    EXTRACT_HSV           = "EXTRACT_HSV",
    /** The type for {@link ElaborationNodeExtractXY|`ElaborationNodeExtractXY`}. */
    EXTRACT_XY            = "EXTRACT_XY",
    /** The type for {@link ElaborationNodeExtractColorTemp|`ElaborationNodeExtractColorTemp`}. */
    EXTRACT_COLOR_TEMP    = "EXTRACT_COLOR_TEMP",
    /** The type for {@link ElaborationNodeFromRGB|`ElaborationNodeFromRGB`}. */
    FROM_RGB              = "FROM_RGB",
    /** The type for {@link ElaborationNodeFromHSL|`ElaborationNodeFromHSL`}. */
    FROM_HSL              = "FROM_HSL",
    /** The type for {@link ElaborationNodeFromHSV|`ElaborationNodeFromHSV`}. */
    FROM_HSV              = "FROM_HSV",
    /** The type for {@link ElaborationNodeFromXY|`ElaborationNodeFromXY`}. */
    FROM_XY               = "FROM_XY",
    /** The type for {@link ElaborationNodeFromColorTemp|`ElaborationNodeFromColorTemp`}. */
    FROM_COLOR_TEMP       = "FROM_COLOR_TEMP",
    /** The type for {@link ElaborationNodeTimeout|`ElaborationNodeTimeout`}. */
    TIMEOUT               = "TIMEOUT",
    /** The type for {@link ElaborationNodeDateValues|`ElaborationNodeDateValues`}. */
    DATE_VALUES           = "DATE_VALUES",
    /** The type for {@link ElaborationNodeTimeValues|`ElaborationNodeTimeValues`}. */
    TIME_VALUES           = "TIME_VALUES",
    /** The type for {@link ElaborationNodeDateTimeValues|`ElaborationNodeDateTimeValues`}. */
    DATE_TIME_VALUES      = "DATE_TIME_VALUES",
    /** The type for {@link ElaborationNodeDateFromValues|`ElaborationNodeDateFromValues`}. */
    DATE_FROM_VALUES      = "DATE_FROM_VALUES",
    /** The type for {@link ElaborationNodeTimeFromValues|`ElaborationNodeTimeFromValues`}. */
    TIME_FROM_VALUES      = "TIME_FROM_VALUES",
    /** The type for {@link ElaborationNodeDateTimeFromValues|`ElaborationNodeDateTimeFromValues`}. */
    DATE_TIME_FROM_VALUES = "DATE_TIME_FROM_VALUES",
    /** The type for {@link ElaborationNodeDateCompare|`ElaborationNodeDateCompare`}. */
    DATE_COMPARE          = "DATE_COMPARE",
    /** The type for {@link ElaborationNodeTimeCompare|`ElaborationNodeTimeCompare`}. */
    TIME_COMPARE          = "TIME_COMPARE",
    /** The type for {@link ElaborationNodeDateTimeCompare|`ElaborationNodeDateTimeCompare`}. */
    DATE_TIME_COMPARE     = "DATE_TIME_COMPARE",
    /** The type for {@link ElaborationNodeCombineDateTime|`ElaborationNodeCombineDateTime`}. */
    COMBINE_DATE_TIME     = "COMBINE_DATE_TIME",
    /** The type for {@link ElaborationNodeEpoch|`ElaborationNodeEpoch`}. */
    EPOCH                 = "EPOCH",
    /** The type for {@link ElaborationNodeSunEvents|`ElaborationNodeSunEvents`}. */
    SUN_EVENTS            = "SUN_EVENTS",
    /** The type for {@link ElaborationNodeSave|`ElaborationNodeSave`}. */
    SAVE                  = "SAVE",
    /** The type for {@link ElaborationNodeRetrieve|`ElaborationNodeRetrieve`}. */
    RETRIEVE              = "RETRIEVE",
    /** The type for {@link ElaborationNodeAllTypesTest|`ElaborationNodeAllTypesTest`}. */
    TEST                  = "TEST"
}

/**
 * The type of error that can occur during the {@link ElaborationNode#calculate|calculation} of an {@link ElaborationNode|`ElaborationNode`}.
 */
export enum ElaborationNodeErrorType {
    /** The inputs provided to the calculation are missing some of the {@link ElaborationNode#inputs|inputs} defined by the node. */
    MISSING_INPUT     = "MISSING_INPUT",
    /** One input provided to the function for the calculation does not adhere to its definition in {@link ElaborationNode#inputs|`ElaborationNode.inputs`}.  */
    WRONG_INPUT_TYPE  = "WRONG_INPUT_TYPE",
    /**
     * The results yielded from the specific implementation of {@link ElaborationNode#calculate|`ElaborationNode.calculate`} are missing
     * one of the defined in {@link ElaborationNode#outputs|`ElaborationNode.outputs`}.
     */
    MISSING_OUTPUT    = "MISSING_OUTPUT",
    /**
     * The results yielded from the specific implementation of {@link ElaborationNode#calculate|`ElaborationNode.calculate`} contain an output
     * that does not adhere to its definition in {@link ElaborationNode#outputs|`ElaborationNode.outputs`}.
     */
    WRONG_OUTPUT_TYPE = "WRONG_OUTPUT_TYPE",
}

/**
 * An error that occurred during the {@link ElaborationNode#calculate|calculation} of an {@link ElaborationNode|`ElaborationNode`}.
 */
export class ElaborationNodeError extends Error {
    
    /**
     * Creates an instance of the class.
     *
     * @param {ElaborationNodeErrorType} type - The type of error.
     * @param {number} nodeId - The unique identifier of the node in which the error occurred.
     * @param {string} datumName - The  {@link ElaborationNode#inputs|input} or {@link ElaborationNode#outputs|output} that is involved with the error.
     */
    constructor(
        public readonly type: ElaborationNodeErrorType,
        public readonly nodeId: number,
        public readonly datumName: string) {
        super(`Error while elaborating node. Code: ${type} on node ${nodeId} input ${datumName}`);
    }
}


/**
 * This class describes a generic elaboration node used to manipulate data in a mix.
 *
 * This is an abstract class and should be extended to define node with actual functions.
 * When defining new nodes, define them in this module and register them in {@link ElaborationNode.getNewNode|`ElaborationNode.getNewNode`} and document them in this
 * documentation. The actual functionality should be implemented overriding the {@link ElaborationNode#calculate|`ElaborationNode.calculate`}.
 *
 * The known nodes are:
 *
 * # Math
 * - {@link ElaborationNodeAddition|Addition}: ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}) → {@link DatumType.NUMBER|`NUMBER`}
 * - {@link ElaborationNodeSubtraction|Subtraction}: ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}) → {@link DatumType.NUMBER|`NUMBER`}
 * - {@link ElaborationNodeMultiplication|Multiplication}: ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}) → {@link DatumType.NUMBER|`NUMBER`}
 * - {@link ElaborationNodeDivision|Division}: ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}) → {@link DatumType.NUMBER|`NUMBER`}
 * - {@link ElaborationNodeModulo|Modulo}: ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}) → {@link DatumType.NUMBER|`NUMBER`}
 * - {@link ElaborationNodeMax|Maximum}: ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}) → {@link DatumType.NUMBER|`NUMBER`}
 * - {@link ElaborationNodeMin|Minimum}: ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}) → {@link DatumType.NUMBER|`NUMBER`}
 * - {@link ElaborationNodeGreaterThan|Greater than} ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.BOOLEAN|`BOOLEAN`}) →
 * {@link DatumType.BOOLEAN|`BOOLEAN`}
 * - {@link ElaborationNodeLessThan|Less than} ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.BOOLEAN|`BOOLEAN`}) →
 * {@link DatumType.BOOLEAN|`BOOLEAN`}
 * - {@link ElaborationNodeCycle|Cycle}: ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.BOOLEAN|`BOOLEAN`}, {@link DatumType.BOOLEAN|`BOOLEAN`},
 * {@link DatumType.BOOLEAN|`BOOLEAN`}) → {@link DatumType.NUMBER|`NUMBER`}
 * - {@link ElaborationNodeClamp|Clamp}: ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}\*, {@link DatumType.NUMBER|`NUMBER`}\*) → {@link DatumType.NUMBER|`NUMBER`}
 * - {@link ElaborationNodeLerp|Lerp}: ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}) → {@link DatumType.NUMBER|`NUMBER`}
 *
 * # Boolean
 * - {@link ElaborationNodeAnd|And}: ({@link DatumType.BOOLEAN|`BOOLEAN`}?...) → {@link DatumType.BOOLEAN|`BOOLEAN`}
 * - {@link ElaborationNodeOr|Or}: ({@link DatumType.BOOLEAN|`BOOLEAN`}?...) → {@link DatumType.BOOLEAN|`BOOLEAN`}
 * - {@link ElaborationNodeXor|Exclusive or}: ({@link DatumType.BOOLEAN|`BOOLEAN`}?...) → {@link DatumType.BOOLEAN|`BOOLEAN`}
 * - {@link ElaborationNodeNot|Not}: ({@link DatumType.BOOLEAN|`BOOLEAN`}) → {@link DatumType.BOOLEAN|`BOOLEAN`}
 *
 * # Control flow
 * - {@link ElaborationNodeBuffer|Buffer}: (`T`\*?) → `T`\*?
 * - {@link ElaborationNodeNullGuard|Null guard}: (`T`\*, `T`) → `T`
 * - {@link ElaborationNodeEqualityCheck|Equality check} (`T`\*, `T`\*) → {@link DatumType.BOOLEAN|`BOOLEAN`}
 * - {@link ElaborationNodeBinaryChoice|Binary choice} (`T`\*?, `T`\*?, {@link DatumType.BOOLEAN|`BOOLEAN`}) → `T`\*
 * - {@link ElaborationNodeMultipleChoice|Multiple choice} (`T`\*?..., {@link DatumType.NUMBER|`NUMBER`}) → `T`\*?
 * - {@link ElaborationNodeEncoder|Encoder}: ({@link DatumType.BOOLEAN|`BOOLEAN`}, {@link DatumType.BOOLEAN|`BOOLEAN`}...) → ({@link DatumType.NUMBER|`NUMBER`},
 * {@link DatumType.BOOLEAN|`BOOLEAN`})
 *
 * # Color
 * - {@link ElaborationNodeExtractRGB|Extract RGB}: {@link DatumType.COLOR|`COLOR`} → ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`},
 * {@link DatumType.NUMBER|`NUMBER`})
 * - {@link ElaborationNodeExtractHSL|Extract HSL}: {@link DatumType.COLOR|`COLOR`} → ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`},
 * {@link  DatumType.NUMBER|`NUMBER`})
 * - {@link ElaborationNodeExtractHSV|Extract HSV}: {@link DatumType.COLOR|`COLOR`} → ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`},
 * {@link  DatumType.NUMBER|`NUMBER`})
 * - {@link ElaborationNodeExtractXY|Extract XY}: {@link DatumType.COLOR|`COLOR`} → ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`})
 * - {@link ElaborationNodeExtractColorTemp|Extract Color Temperature}: {@link DatumType.COLOR_TEMP|`COLOR_TEMP`} → {@link DatumType.NUMBER|`NUMBER`}
 * - {@link ElaborationNodeFromRGB|From RGB}: ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}) → {@link DatumType.COLOR|`COLOR`}
 * - {@link ElaborationNodeFromHSL|From HSL}: ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}) → {@link DatumType.COLOR|`COLOR`}
 * - {@link ElaborationNodeFromHSV|From HSV}: ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}) → {@link DatumType.COLOR|`COLOR`}
 * - {@link ElaborationNodeFromXY|From XY}: ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}) → {@link DatumType.COLOR|`COLOR`}
 * - {@link ElaborationNodeFromColorTemp|From Color Temperature}: {@link DatumType.NUMBER|`NUMBER`} → {@link DatumType.COLOR_TEMP|`COLOR_TEMP`}
 *
 * # Date and time
 * - {@link ElaborationNodeTimeout|Timeout}: {@link DatumType.NUMBER|`NUMBER`} → {@link DatumType.BOOLEAN|`BOOLEAN`}
 * - {@link ElaborationNodeDateValues|Date values}: {@link DatumType.DATE|`DATE`} → ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`},
 * {@link DatumType.NUMBER|`NUMBER`})
 * - {@link ElaborationNodeTimeValues|Time values}: {@link DatumType.TIME|`TIME`} → ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`})
 * - {@link ElaborationNodeDateTimeValues|Date Time values}: {@link DatumType.DATE_TIME|`DATE_TIME`} → ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`},
 * {@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`})
 * - {@link ElaborationNodeDateFromValues|Date from values}: ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}) →
 * {@link DatumType.DATE|`DATE`}
 * - {@link ElaborationNodeTimeFromValues|Time from values}: ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}) →
 * {@link DatumType.TIME|`TIME`}
 * - {@link ElaborationNodeDateTimeFromValues|Date Time from values}: ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`},
 * {@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.NUMBER|`NUMBER`}) → {@link DatumType.DATE_TIME|`DATE_TIME`}
 * - {@link ElaborationNodeDateCompare|Date compare}: ({@link DatumType.DATE|`DATE`}, {@link DatumType.DATE|`DATE`}) → ({@link DatumType.BOOLEAN|`BOOLEAN`},
 * {@link DatumType.BOOLEAN|`BOOLEAN`}, {@link DatumType.BOOLEAN|`BOOLEAN`})
 * - {@link ElaborationNodeTimeCompare|Time compare}: ({@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.TIME|`TIME`}) → ({@link DatumType.BOOLEAN|`BOOLEAN`},
 * {@link DatumType.BOOLEAN|`BOOLEAN`}, {@link DatumType.BOOLEAN|`BOOLEAN`})
 * - {@link ElaborationNodeDateTimeCompare|Date time compare}: ({@link DatumType.DATE_TIME|`DATE_TIME`}, {@link DatumType.DATE_TIME|`DATE_TIME`}) → ({@link DatumType.BOOLEAN|`BOOLEAN`},
 * {@link DatumType.BOOLEAN|`BOOLEAN`}, {@link DatumType.BOOLEAN|`BOOLEAN`})
 * - {@link ElaborationNodeCombineDateTime|Combine Date Time}: ({@link DatumType.DATE|`DATE`}, {@link DatumType.TIME|`TIME`}) → {@link DatumType.DATE_TIME|`DATE_TIME`}
 * - {@link ElaborationNodeEpoch|Epoch}: {@link DatumType.DATE_TIME|`DATE_TIME`} → {@link DatumType.NUMBER|`NUMBER`}
 * - {@link ElaborationNodeSunEvents|Sun events}: {@link DatumType.DATE|`DATE`} → ({@link DatumType.TIME|`TIME`} [...x14])
 *
 * # Storage
 * - {@link ElaborationNodeSave|Save}: (`T`\*?, {@link DatumType.STRING|`STRING`}) → ()
 * - {@link ElaborationNodeRetrieve|Retrieve}: ({@link DatumType.STRING|`STRING`}, `T`\*?) → `T`\*?
 *
 * # (test)
 * - {@link ElaborationNodeAllTypesTest|Test}: ({@link DatumType.BOOLEAN|`BOOLEAN`}, {@link DatumType.NUMBER|`NUMBER`}, {@link DatumType.STRING|`STRING`}, {@link DatumType.COLOR|`COLOR`},
 * {@link DatumType.COLOR_TEMP|`COLOR_TEMP`}, {@link DatumType.TIME|`TIME`},
 * {@link DatumType.DATE|`DATE`}, {@link DatumType.DATE_TIME|`DATE_TIME`}, {@link DatumType.BOOLEAN|`BOOLEAN`}?, {@link DatumType.NUMBER|`NUMBER`}?, {@link DatumType.STRING|`STRING`}?,
 * {@link DatumType.COLOR|`COLOR`}?, {@link DatumType.COLOR_TEMP|`COLOR_TEMP`}?,
 * {@link DatumType.TIME|`TIME`}?, {@link DatumType.DATE|`DATE`}?, {@link DatumType.DATE_TIME|`DATE_TIME`}?) → ({@link DatumType.BOOLEAN|`BOOLEAN`}, {@link DatumType.NUMBER|`NUMBER`},
 * {@link DatumType.STRING|`STRING`},
 * {@link DatumType.COLOR|`COLOR`} {@link DatumType.COLOR_TEMP|`COLOR_TEMP`}, {@link DatumType.TIME|`TIME`}, {@link DatumType.DATE|`DATE`}, {@link DatumType.DATE_TIME|`DATE_TIME`},
 * {@link DatumType.BOOLEAN|`BOOLEAN`}?, {@link DatumType.NUMBER|`NUMBER`}?,
 * {@link DatumType.STRING|`STRING`}?, {@link DatumType.COLOR|`COLOR`}?, {@link DatumType.COLOR_TEMP|`COLOR_TEMP`}?, {@link DatumType.TIME|`TIME`}?, {@link DatumType.DATE|`DATE`}?,
 * {@link DatumType.DATE_TIME|`DATE_TIME`}?)
 *
 * ## Legend
 * - <b>\*</b>: the input is nullable
 * - **?**: the user can choose the nullable state of the input
 * - **`T`**: the user can choose the type of the input
 * - **...**: the inputs can be in any multiplicity, chosen by the user.
 */
export abstract class ElaborationNode {
    
    /**
     * The inputs for the elaboration node. These are all the values that the node is provided
     * with, whose values come from the outputs of other nodes or the inputs into mixes, or constants.
     */
    public abstract readonly inputs: readonly Datum[];
    /**
     * The outputs for the elaboration node. These are the results that the node provides
     * to other downstream nodes to be used as inputs, or as outputs to mixes.
     */
    public abstract readonly outputs: readonly Datum[];
    
    /**
     * Construct an instance of the class. This is protected so that only non-abstract inheritors
     * of the class can instantiate it and this class cannot be instantiated by itself. If an abstract
     * class is to be implemented inheriting this class, the constructor should be kept protected.
     *
     * <u>Do not use this constructor to create instances.</u> Create a non-abstract inheritor.
     *
     * @param {number} id - The unique integer id to identify the node in a mix.
     *                      It's also used to uniquely identify outputs and inputs in connections
     *                      between nodes.
     * @param {ElaborationNodeCode} code - The code describing the actual type of node. This should be set in the
     *                                     constructor of every non-abstract inheritor of this class, so that
     *                                     the user of the actual classes cannot change it.
     * @protected
     */
    protected constructor(public readonly id: number, public readonly code: ElaborationNodeCode) {
    
    }
    
    /**
     * Processes the provided input values and computes the results based on the specific logic of the node.
     *
     * This method ensures all required inputs are provided and correctly typed, and that all expected outputs are valid and present.
     *
     * @param {Map<string, unknown>} inputValues - A map of input names to their corresponding values that must contain a value
     *                                             for each of the inputs defined in {@link ElaborationNode#inputs|`inputs`}.
     *
     * @throws {ElaborationNodeError} {@link ElaborationNodeError|`ElaborationNodeError`} is thrown when:
     * - A required input is missing from the `inputValues` map ({@link ElaborationNodeErrorType.MISSING_INPUT|`MISSING_INPUT`} error type).
     * - A provided input value does not meet type or validation requirements ({@link ElaborationNodeErrorType.WRONG_INPUT_TYPE|`WRONG_INPUT_TYPE`} error type)
     * - (error in the implementation of the elaboration node class) A required output is missing after computation ({@link ElaborationNodeErrorType.MISSING_OUTPUT|`MISSING_OUTPUT`} error
     *     type)
     * - (error in the implementation of the elaboration node class) A computed output value does not meet type or validation requirements
     *     ({@link ElaborationNodeErrorType.WRONG_OUTPUT_TYPE|`WRONG_OUTPUT_TYPE`} error type).
     *
     * @returns {Map<string, unknown>} A map of output names to their respective computed values.
     *                                If returned, all computed outputs will be validated and adhere to those defined in {@link ElaborationNode#outputs|`outputs`}.
     */
    public elaborate(inputValues: Map<string, unknown>): Map<string, unknown> {
        for (const input of this.inputs) {
            if (!inputValues.has(input.name)) {
                throw {type: ElaborationNodeErrorType.MISSING_INPUT, nodeId: this.id, datumName: input.name} as ElaborationNodeError;
            }
            const inputValue = inputValues.get(input.name);
            if (!input.checkValue(inputValue)) {
                throw {type: ElaborationNodeErrorType.WRONG_INPUT_TYPE, nodeId: this.id, datumName: input.name} as ElaborationNodeError;
            }
        }
        const results = this.calculate(inputValues);
        for (const output of this.outputs) {
            if (!results.has(output.name)) {
                throw {type: ElaborationNodeErrorType.MISSING_OUTPUT, nodeId: this.id, datumName: output.name} as ElaborationNodeError;
            }
            const outputValue = results.get(output.name);
            if (!output.checkValue(outputValue)) {
                throw {type: ElaborationNodeErrorType.WRONG_OUTPUT_TYPE, nodeId: this.id, datumName: output.name} as ElaborationNodeError;
            }
        }
        return results;
    }
    
    /**
     * This function calculates the actual outputs given the inputs. Must be implemented by
     * any implementation of a node to calculate the actual function of the node.
     *
     * @param {Map<string, unknown>} inputValues - The map of all possible inputs by name. When this function is called, it's
     *                                             guaranteed that the needed inputs defined in {@link ElaborationNode#inputs|`inputs`} are present.
     * @returns {Map<string, unknown>} The map of all outputs by name, according to the ones defined in {@link ElaborationNode#outputs|`outputs`}.
     * @protected
     */
    protected abstract calculate(inputValues: Map<string, unknown>): Map<string, unknown>;
    
    /**
     * Converts the elaboration node instance into its JSON representation.
     *
     * @returns {ElaborationNodeJSON} The JSON representation of `this`.
     */
    public toJSON(): ElaborationNodeJSON {
        return {
            id:      this.id,
            code:    this.code,
            options: null
        };
    }
    
    /**
     * Constructs a new {@link ElaborationNode|`ElaborationNode`} instance from a given JSON representation.
     *
     * @param {ElaborationNodeJSON} elaborationNodeJSON - The JSON representation of the elaboration node.
     * @returns {ElaborationNode} The elaboration node object constructed from the provided JSON.
     */
    public static fromJSON(elaborationNodeJSON: ElaborationNodeJSON): ElaborationNode {
        return this.getNewNode(elaborationNodeJSON.id, elaborationNodeJSON.code, elaborationNodeJSON.options);
    }
    
    /**
     * Creates the correct instance of a node using the correct implementation of {@link ElaborationNode|`ElaborationNode`}, given the implementation's code.
     *
     * @param {number} id - The id to be given to the new elaboration node.
     * @param {ElaborationNodeCode} code - The code to identify the correct implementation to instantiate.
     * @param {unknown} options - The potential options to be passed to the implementation's constructor, for nodes that require further customization.
     * @returns {ElaborationNode} The new node instance.
     */
    public static getNewNode(id: number, code: ElaborationNodeCode, options: unknown): ElaborationNode {
        switch (code) {
            case ElaborationNodeCode.ADDITION:
                return new ElaborationNodeAddition(id);
            case ElaborationNodeCode.SUBTRACTION:
                return new ElaborationNodeSubtraction(id);
            case ElaborationNodeCode.MULTIPLICATION:
                return new ElaborationNodeMultiplication(id);
            case ElaborationNodeCode.DIVISION:
                return new ElaborationNodeDivision(id);
            case ElaborationNodeCode.MODULO:
                return new ElaborationNodeModulo(id);
            case ElaborationNodeCode.MAX:
                return new ElaborationNodeMax(id);
            case ElaborationNodeCode.MIN:
                return new ElaborationNodeMin(id);
            case ElaborationNodeCode.CLAMP:
                return new ElaborationNodeClamp(id);
            case ElaborationNodeCode.LERP:
                return new ElaborationNodeLerp(id);
            case ElaborationNodeCode.AND:
                return new ElaborationNodeAnd(id, options as ArbitraryInputsElaborationNodeOptions);
            case ElaborationNodeCode.OR:
                return new ElaborationNodeOr(id, options as ArbitraryInputsElaborationNodeOptions);
            case ElaborationNodeCode.XOR:
                return new ElaborationNodeXor(id, options as ArbitraryInputsElaborationNodeOptions);
            case ElaborationNodeCode.NOT:
                return new ElaborationNodeNot(id);
            case ElaborationNodeCode.BUFFER:
                return new ElaborationNodeBuffer(id, options as TypedNullMarkedElaborationNodeOptions);
            case ElaborationNodeCode.NULL_GUARD:
                return new ElaborationNodeNullGuard(id, options as TypedElaborationNodeOptions);
            case ElaborationNodeCode.EQUALITY_CHECK:
                return new ElaborationNodeEqualityCheck(id, options as TypedElaborationNodeOptions);
            case ElaborationNodeCode.GREATER_THAN:
                return new ElaborationNodeGreaterThan(id);
            case ElaborationNodeCode.LESS_THAN:
                return new ElaborationNodeLessThan(id);
            case ElaborationNodeCode.CYCLE:
                return new ElaborationNodeCycle(id);
            case ElaborationNodeCode.BINARY_CHOICE:
                return new ElaborationNodeBinaryChoice(id, options as TypedNullMarkedElaborationNodeOptions);
            case ElaborationNodeCode.MULTIPLE_CHOICE:
                return new ElaborationNodeMultipleChoice(id, options as ArbitraryInputsElaborationNodeOptions);
            case ElaborationNodeCode.ENCODER:
                return new ElaborationNodeEncoder(id, options as ArbitraryInputsElaborationNodeOptions);
            case ElaborationNodeCode.EXTRACT_RGB:
                return new ElaborationNodeExtractRGB(id);
            case ElaborationNodeCode.EXTRACT_HSL:
                return new ElaborationNodeExtractHSL(id);
            case ElaborationNodeCode.EXTRACT_HSV:
                return new ElaborationNodeExtractHSV(id);
            case ElaborationNodeCode.EXTRACT_XY:
                return new ElaborationNodeExtractXY(id);
            case ElaborationNodeCode.EXTRACT_COLOR_TEMP:
                return new ElaborationNodeExtractColorTemp(id);
            case ElaborationNodeCode.FROM_RGB:
                return new ElaborationNodeFromRGB(id);
            case ElaborationNodeCode.FROM_HSL:
                return new ElaborationNodeFromHSL(id);
            case ElaborationNodeCode.FROM_HSV:
                return new ElaborationNodeFromHSV(id);
            case ElaborationNodeCode.FROM_XY:
                return new ElaborationNodeFromXY(id);
            case ElaborationNodeCode.FROM_COLOR_TEMP:
                return new ElaborationNodeFromColorTemp(id);
            case ElaborationNodeCode.TIMEOUT:
                return new ElaborationNodeTimeout(id, options as ElaborationNodeTimeoutOptions);
            case ElaborationNodeCode.DATE_VALUES:
                return new ElaborationNodeDateValues(id);
            case ElaborationNodeCode.TIME_VALUES:
                return new ElaborationNodeTimeValues(id);
            case ElaborationNodeCode.DATE_TIME_VALUES:
                return new ElaborationNodeDateTimeValues(id);
            case ElaborationNodeCode.DATE_FROM_VALUES:
                return new ElaborationNodeDateFromValues(id);
            case ElaborationNodeCode.TIME_FROM_VALUES:
                return new ElaborationNodeTimeFromValues(id);
            case ElaborationNodeCode.DATE_TIME_FROM_VALUES:
                return new ElaborationNodeDateTimeFromValues(id);
            case ElaborationNodeCode.DATE_COMPARE:
                return new ElaborationNodeDateCompare(id);
            case ElaborationNodeCode.TIME_COMPARE:
                return new ElaborationNodeTimeCompare(id);
            case ElaborationNodeCode.DATE_TIME_COMPARE:
                return new ElaborationNodeDateTimeCompare(id);
            case ElaborationNodeCode.COMBINE_DATE_TIME:
                return new ElaborationNodeCombineDateTime(id);
            case ElaborationNodeCode.EPOCH:
                return new ElaborationNodeEpoch(id);
            case ElaborationNodeCode.SUN_EVENTS:
                return new ElaborationNodeSunEvents(id);
            case ElaborationNodeCode.SAVE:
                return new ElaborationNodeSave(id, options as TypedNullMarkedElaborationNodeOptions);
            case ElaborationNodeCode.RETRIEVE:
                return new ElaborationNodeRetrieve(id, options as TypedNullMarkedElaborationNodeOptions);
            case ElaborationNodeCode.TEST:
                return new ElaborationNodeAllTypesTest(id);
        }
    }
    
}

/** The constructor type for a generic {@link ElaborationNode|`ElaborationNode`} implementation. */
export type ElaborationNodeImplementationConstructor = new (id: number) => ElaborationNode;

/** The constructor type for the {@link ElaborationNodeTimeout|`ElaborationNodeTimeout`} node, with options to configure the timeout. */
export type ElaborationNodeTimeoutImplementationConstructor = new (id: number, options: ElaborationNodeTimeoutOptions) => ElaborationNode;

/** The constructor type for a {@link TypedElaborationNode|`TypedElaborationNode`} implementation, with options to configure the type. */
export type TypedElaborationNodeImplementationConstructor = new (id: number, options: TypedElaborationNodeOptions) => ElaborationNode;

/** The constructor type for a {@link TypedNullMarkedElaborationNode|`TypedNullMarkedElaborationNode`} implementation, with options to configure the type and nullability. */
export type TypedNullMarkedElaborationNodeImplementationConstructor = new (id: number, options: TypedNullMarkedElaborationNodeOptions) => ElaborationNode;

/** The constructor type for a {@link ArbitraryInputsElaborationNode|`ArbitraryInputsElaborationNode`} implementation, with options to configure the type, nullability and number of inputs. */
export type ArbitraryInputsElaborationNodeImplementationConstructor = new (id: number, options: ArbitraryInputsElaborationNodeOptions) => ElaborationNode;


/**
 * The serialization of the class {@link ElaborationNode|`ElaborationNode`}.
 */
export class ElaborationNodeJSON {
    
    
    /**
     * Serialization of the property {@link ElaborationNode#id|`id`}.
     */
    @IsInt()
    @Min(0)
    public id: number;
    
    /**
     * Serialization of the property {@link ElaborationNode#code|`code`}.
     */
    @IsEnum(ElaborationNodeCode)
    public code: ElaborationNodeCode;
    
    /**
     * Serialization of the options used by some implementations of {@link ElaborationNode|`ElaborationNode`}.
     */
    @IsOptional()
    @Allow()
    public options?: unknown = null;
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id  - Value for {@link ElaborationNode#id|`id`}.
     * @param {ElaborationNodeCode} code  - Value for {@link ElaborationNode#code|`code`}.
     */
    constructor(id: number, code: ElaborationNodeCode) {
        this.id   = id;
        this.code = code;
    }
    
}

/**
 * This abstract class helps define an implementation of {@link ElaborationNode|`ElaborationNode`} that calculates binary mathematical
 * operation. This class defines the inputs as two non-nullable {@link DatumType.NUMBER|`NUMBER`} inputs called `"First number"` and
 * `"Second number"`, and one non-nullable {@link DatumType.NUMBER|`NUMBER`} output, which name is passed to the constructor by the
 * implementing class.
 */
export abstract class ElaborationNodeMathOperation extends ElaborationNode {
    
    /** The name of the first input number. */
    protected static readonly FIRST_NUMBER_INPUT: string  = "First number";
    /** The name of the second input number. */
    protected static readonly SECOND_NUMBER_INPUT: string = "Second number";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[] = [
        new Datum(ElaborationNodeMathOperation.FIRST_NUMBER_INPUT, DatumType.NUMBER, false),
        new Datum(ElaborationNodeMathOperation.SECOND_NUMBER_INPUT, DatumType.NUMBER, false)
    ];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id  - Value for {@link ElaborationNode#id|`id`}.
     * @param {ElaborationNodeCode} code - Value for {@link ElaborationNode#code|`code`}.
     * @param {string} operationName - The name to be given to the output of the node.
     * @protected
     */
    protected constructor(id: number, code: ElaborationNodeCode, public operationName: string) {
        super(id, code);
        this.outputs = [
            new Datum(this.operationName, DatumType.NUMBER, false)
        ];
    }
    
}

/**
 * Options specific to {@link TypedElaborationNode|`TypedElaborationNode`} needed for the creation of its instances.
 */
export interface TypedElaborationNodeOptions {
    /**
     * The type to be assigned to the node, defining the variable type of inputs/outputs.
     */
    dataType: DatumType;
}

/**
 * Options specific to {@link TypedNullMarkedElaborationNode|`TypedNullMarkedElaborationNode`} needed for the creation of its instances.
 */
export interface TypedNullMarkedElaborationNodeOptions {
    /**
     * The type to be assigned to the node, defining the variable type of inputs/outputs.
     */
    dataType: DatumType;
    /**
     * The nullability to be assigned to the node, defining the variable nullability of inputs/outputs.
     */
    nullable: boolean;
}

/**
 * This abstract class defines a type of {@link ElaborationNode|`ElaborationNode`} for which some inputs or outputs
 * don't have a predetermined {@link DatumType|`DatumType`}, but it's defined by the user at node creation, and
 * saved in the {@link TypedElaborationNode#options|`options`} property.
 *
 * This class should be the parent class of any {@link ElaborationNode|`ElaborationNode`} implementation that
 * has inputs/outputs of only one variable type.
 */
export abstract class TypedElaborationNode extends ElaborationNode {
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id  - Value for {@link ElaborationNode#id|`id`}.
     * @param {ElaborationNodeCode} code  - Value for {@link ElaborationNode#code|`code`}.
     * @param {TypedElaborationNodeOptions} options - The options containing the chosen type for the variable type inputs and outputs.
     * @protected
     */
    protected constructor(id: number, code: ElaborationNodeCode, public options: TypedElaborationNodeOptions) {
        super(id, code);
    }
    
    /** @inheritDoc */
    public override toJSON(): ElaborationNodeJSON {
        const result   = super.toJSON();
        result.options = this.options;
        return result;
    }
    
}

/**
 * This abstract class defines a type of {@link ElaborationNode|`ElaborationNode`} for which some inputs or outputs
 * don't have a predetermined {@link DatumType|`DatumType`} and nullability, but they are defined by the user at node
 * creation, and saved in the {@link TypedNullMarkedElaborationNode#options|`options`} property.
 *
 * This class should be the parent class of any {@link ElaborationNode|`ElaborationNode`} implementation that
 * has inputs/outputs of only one variable type and nullability condition.
 */
export abstract class TypedNullMarkedElaborationNode extends ElaborationNode {
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id  - Value for {@link ElaborationNode#id|`id`}.
     * @param {ElaborationNodeCode} code  - Value for {@link ElaborationNode#code|`code`}.
     * @param {TypedNullMarkedElaborationNodeOptions} options - The options containing the chosen type and nullability condition for the variable type inputs and outputs.
     * @protected
     */
    protected constructor(id: number, code: ElaborationNodeCode, public options: TypedNullMarkedElaborationNodeOptions) {
        super(id, code);
    }
    
    /** @inheritDoc */
    public override toJSON(): ElaborationNodeJSON {
        const result   = super.toJSON();
        result.options = this.options;
        return result;
    }
    
}

/**
 * Options specific to {@link ArbitraryInputsElaborationNode|`ArbitraryInputsElaborationNode`} needed for the creation of its instances.
 */
export interface ArbitraryInputsElaborationNodeOptions {
    /**
     * The type to be assigned to the node, defining the type of the inputs of arbitrary multiplicity.
     */
    dataType: DatumType;
    
    /**
     * The nullability to be assigned to the node, defining the nullability of the inputs of arbitrary multiplicity.
     */
    nullable: boolean;
    
    /**
     * The multiplicity of the special input of arbitrary multiplicity.
     */
    inputNumber: number;
}

/**
 * This abstract class helps defining a type of {@link ElaborationNode|`ElaborationNode`} for which
 * there is one set of inputs that can be of arbitrary multiplicity, chosen by the user.
 *
 * This class should be the parent class of any {@link ElaborationNode|`ElaborationNode`} implementation that
 * exposes one series of inputs that can be of a number chosen by the use. The inheriting class can still define other inputs,
 * they will appear before the special arbitrary ones.
 */
export abstract class ArbitraryInputsElaborationNode extends TypedNullMarkedElaborationNode {
    
    /**
     * @inheritDoc
     */
    public readonly inputs: Datum[] = [];
    
    /**
     * The options containing the multiplicity, chosen type and nullability condition for the arbitrary multiplicity inputs.
     */
    public override options: ArbitraryInputsElaborationNodeOptions;
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id  - Value for {@link ElaborationNode#id|`id`}.
     * @param {ElaborationNodeCode} code  - Value for {@link ElaborationNode#code|`code`}.
     * @param {ArbitraryInputsElaborationNodeOptions} options - The options containing the multiplicity, chosen type and nullability condition for the arbitrary multiplicity inputs.
     * @protected
     */
    protected constructor(id: number, code: ElaborationNodeCode, options: ArbitraryInputsElaborationNodeOptions) {
        super(id, code, options);
        options.inputNumber = Math.max(1, options.inputNumber);
        for (let i = 0; i < options.inputNumber; i++) {
            this.inputs.push(new Datum(ArbitraryInputsElaborationNode.getInputName(i), options.dataType, options.nullable));
        }
        this.options = options;
    }
    
    /**
     * Adds the next input to the arbitrary input set, assigning the correct name given the number of inputs already present.
     *
     * This method already changes the {@link ArbitraryInputsElaborationNode#options|`options} according to the new state.
     */
    public addInput(): void {
        const input = new Datum(ArbitraryInputsElaborationNode.getInputName(this.options.inputNumber), this.options.dataType, this.options.nullable);
        this.inputs.push(input);
        this.options.inputNumber++;
    }
    
    /**
     * Removes the last input from the arbitrary input set.
     *
     * This method already changes the {@link ArbitraryInputsElaborationNode#options|`options} according to the new state.
     */
    public removeLastInput(): void {
        this.inputs.pop();
        this.options.inputNumber--;
    }
    
    /**
     * Returns the name of one of the arbitrary inputs, given its index.
     *
     * @param {number} index - The index (0-based) of the input.
     * @returns {string} The name of the input (1-based).
     */
    public static getInputName(index: number): string {
        return `Input ${index + 1}`;
    }
    
    /** @inheritDoc */
    public override toJSON(): ElaborationNodeJSON {
        const result   = super.toJSON();
        result.options = this.options;
        return result;
    }
    
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a test node. The test node has one of every
 * input type/nullability possible combinations as input or output, and buffers every input to the corresponding output.
 * This node should never be used in production.
 */
export class ElaborationNodeAllTypesTest extends ElaborationNode {
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[]  = [
        new Datum("Boolean", DatumType.BOOLEAN, false),
        new Datum("Number", DatumType.NUMBER, false),
        new Datum("String", DatumType.STRING, false),
        new Datum("Color", DatumType.COLOR, false),
        new Datum("Color Temp", DatumType.COLOR_TEMP, false),
        new Datum("Time", DatumType.TIME, false),
        new Datum("Date", DatumType.DATE, false),
        new Datum("Date Time", DatumType.DATE_TIME, false),
        new Datum("Boolean?", DatumType.BOOLEAN, true),
        new Datum("Number?", DatumType.NUMBER, true),
        new Datum("String?", DatumType.STRING, true),
        new Datum("Color?", DatumType.COLOR, true),
        new Datum("Colo Tempr?", DatumType.COLOR_TEMP, true),
        new Datum("Time?", DatumType.TIME, true),
        new Datum("Date?", DatumType.DATE, true),
        new Datum("Date Time?", DatumType.DATE_TIME, true)
    ];
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[] = [
        new Datum("Boolean", DatumType.BOOLEAN, false),
        new Datum("Number", DatumType.NUMBER, false),
        new Datum("String", DatumType.STRING, false),
        new Datum("Color", DatumType.COLOR, false),
        new Datum("Color Temp", DatumType.COLOR_TEMP, false),
        new Datum("Time", DatumType.TIME, false),
        new Datum("Date", DatumType.DATE, false),
        new Datum("Date Time", DatumType.DATE_TIME, false),
        new Datum("Boolean?", DatumType.BOOLEAN, true),
        new Datum("Number?", DatumType.NUMBER, true),
        new Datum("String?", DatumType.STRING, true),
        new Datum("Color?", DatumType.COLOR, true),
        new Datum("Colo Tempr?", DatumType.COLOR_TEMP, true),
        new Datum("Time?", DatumType.TIME, true),
        new Datum("Date?", DatumType.DATE, true),
        new Datum("Date Time?", DatumType.DATE_TIME, true)
    ];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id  - Value for {@link ElaborationNode#id|`id`}.
     * @protected
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.TEST);
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        return new Map(inputValues);
    }
    
}

/** Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that adds two numbers. */
export class ElaborationNodeAddition extends ElaborationNodeMathOperation {
    
    /**
     * The name for the output name, the sum of the inputs.
     *
     * @private
     */
    private static readonly OUTPUT_NAME = "Sum";
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id  - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.ADDITION, ElaborationNodeAddition.OUTPUT_NAME);
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const firstNumber  = inputValues.get(ElaborationNodeAddition.FIRST_NUMBER_INPUT) as number;
        const secondNumber = inputValues.get(ElaborationNodeAddition.SECOND_NUMBER_INPUT) as number;
        const result       = firstNumber + secondNumber;
        return new Map([[ElaborationNodeAddition.OUTPUT_NAME, result]]);
    }
    
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that subtracts one number from another.
 * The output is not commutative, the result is `First number` - `Second number`.
 */
export class ElaborationNodeSubtraction extends ElaborationNodeMathOperation {
    
    /**
     * The name for the output name, the difference of the inputs.
     *
     * @private
     */
    private static readonly OUTPUT_NAME = "Difference";
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id  - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.SUBTRACTION, ElaborationNodeSubtraction.OUTPUT_NAME);
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const firstNumber  = inputValues.get(ElaborationNodeSubtraction.FIRST_NUMBER_INPUT) as number;
        const secondNumber = inputValues.get(ElaborationNodeSubtraction.SECOND_NUMBER_INPUT) as number;
        const result       = firstNumber - secondNumber;
        return new Map([[ElaborationNodeSubtraction.OUTPUT_NAME, result]]);
    }
    
}

/** Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that multiplies two numbers. */
export class ElaborationNodeMultiplication extends ElaborationNodeMathOperation {
    
    /**
     * The name for the output name, the product of the inputs.
     *
     * @private
     */
    private static readonly OUTPUT_NAME = "Product";
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.MULTIPLICATION, ElaborationNodeMultiplication.OUTPUT_NAME);
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const firstNumber  = inputValues.get(ElaborationNodeMultiplication.FIRST_NUMBER_INPUT) as number;
        const secondNumber = inputValues.get(ElaborationNodeMultiplication.SECOND_NUMBER_INPUT) as number;
        const result       = firstNumber * secondNumber;
        return new Map([[ElaborationNodeMultiplication.OUTPUT_NAME, result]]);
    }
    
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that divides one number by another
 * The output is not commutative, the result is `First number` ÷ `Second number`.
 */
export class ElaborationNodeDivision extends ElaborationNodeMathOperation {
    
    /**
     * The name for the output name, the quotient of the inputs.
     *
     * @private
     */
    private static readonly OUTPUT_NAME = "Quotient";
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id  - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.DIVISION, ElaborationNodeDivision.OUTPUT_NAME);
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const firstNumber  = inputValues.get(ElaborationNodeDivision.FIRST_NUMBER_INPUT) as number;
        const secondNumber = inputValues.get(ElaborationNodeDivision.SECOND_NUMBER_INPUT) as number;
        const result       = firstNumber / secondNumber;
        return new Map([[ElaborationNodeDivision.OUTPUT_NAME, result]]);
    }
    
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that returns the "Value" (mod "Modulo").
 * Note that this follows the mathematical definition of modulo, not the computer science definition (modulo of negative numbers is positive).
 */
export class ElaborationNodeModulo extends ElaborationNodeMathOperation {
    
    /**
     * The name for the output name, the first input modulo the sencond input.
     *
     * @private
     */
    private static readonly OUTPUT_NAME = "Modulo";
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id  - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.MODULO, ElaborationNodeModulo.OUTPUT_NAME);
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const firstNumber  = inputValues.get(ElaborationNodeModulo.FIRST_NUMBER_INPUT) as number;
        const secondNumber = inputValues.get(ElaborationNodeModulo.SECOND_NUMBER_INPUT) as number;
        const result       = (firstNumber % secondNumber + secondNumber) % secondNumber;
        return new Map([[ElaborationNodeModulo.OUTPUT_NAME, result]]);
    }
    
}

/** Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that returns the maximum between two numbers. */
export class ElaborationNodeMax extends ElaborationNodeMathOperation {
    
    /**
     * The name for the output name, the greater of the two inputs.
     *
     * @private
     */
    private static readonly OUTPUT_NAME = "Max";
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.MAX, ElaborationNodeMax.OUTPUT_NAME);
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const firstNumber  = inputValues.get(ElaborationNodeMax.FIRST_NUMBER_INPUT) as number;
        const secondNumber = inputValues.get(ElaborationNodeMax.SECOND_NUMBER_INPUT) as number;
        const result = Math.max(firstNumber, secondNumber);
        return new Map([[ElaborationNodeMax.OUTPUT_NAME, result]]);
    }
    
}

/** Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that returns the minimum between two numbers. */
export class ElaborationNodeMin extends ElaborationNodeMathOperation {
    
    /**
     * The name for the output name, the smallest of the two inputs.
     *
     * @private
     */
    private static readonly OUTPUT_NAME = "Min";
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id  - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.MIN, ElaborationNodeMin.OUTPUT_NAME);
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const firstNumber  = inputValues.get(ElaborationNodeMin.FIRST_NUMBER_INPUT) as number;
        const secondNumber = inputValues.get(ElaborationNodeMin.SECOND_NUMBER_INPUT) as number;
        const result = Math.min(firstNumber, secondNumber);
        return new Map([[ElaborationNodeMin.OUTPUT_NAME, result]]);
    }
    
}


/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that restricts
 * a number between two bounds. If a value is null, that side is not checked.
 */
export class ElaborationNodeClamp extends ElaborationNode {
    
    /** The name of the input containing the value to be clamped. */
    private static readonly VALUE     = "Value";
    /** The name of the input containing the lower bound or null if no lower bound. */
    private static readonly MIN_INPUT = "Lower bound";
    /** The name of the input containing the upper bound or null if no upper bound. */
    private static readonly MAX_INPUT = "Upper bound";
    
    /** The name of the output containing the clamped value. */
    private static readonly OUTPUT = "Clamped value";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.CLAMP);
        this.inputs  = [
            new Datum(ElaborationNodeClamp.VALUE, DatumType.NUMBER, false),
            new Datum(ElaborationNodeClamp.MIN_INPUT, DatumType.NUMBER, true),
            new Datum(ElaborationNodeClamp.MAX_INPUT, DatumType.NUMBER, true)
        ];
        this.outputs = [
            new Datum(ElaborationNodeClamp.OUTPUT, DatumType.NUMBER, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        let value      = inputValues.get(ElaborationNodeClamp.VALUE) as number;
        const minValue = inputValues.get(ElaborationNodeClamp.MIN_INPUT) as (number | null);
        const maxValue = inputValues.get(ElaborationNodeClamp.MAX_INPUT) as (number | null);
        if (minValue == null || maxValue == null || minValue <= maxValue) {
            if (minValue != null && minValue > value) {
                value = minValue;
            }
            if (maxValue != null && maxValue < value) {
                value = maxValue;
            }
        }
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeClamp.OUTPUT, value
                ]
            ]);
    }
    
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that interpolates a value between two bounds.
 * If the parameter is 0, the result is the start, if the value is 1 the result is the end, all the others values are proportionally
 * distributed. This does not restrict the result, use a clamping node to restrict.
 */
export class ElaborationNodeLerp extends ElaborationNode {
    
    /** The name of the input containing the parameter, which indicates which portion of the range the output is on. */
    private static readonly PARAM = "Parameter";
    /** The name of the input containing the start of the range. */
    private static readonly START = "Range start";
    /** The name off the input containing the end of the range. */
    private static readonly END   = "Range end";
    
    /** The name of the output containing the interpolated value. */
    private static readonly OUTPUT = "Interpolation";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.LERP);
        this.inputs  = [
            new Datum(ElaborationNodeLerp.PARAM, DatumType.NUMBER, false),
            new Datum(ElaborationNodeLerp.START, DatumType.NUMBER, false),
            new Datum(ElaborationNodeLerp.END, DatumType.NUMBER, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeLerp.OUTPUT, DatumType.NUMBER, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const parameter = inputValues.get(ElaborationNodeLerp.PARAM) as number;
        const minValue  = inputValues.get(ElaborationNodeLerp.START) as number;
        const maxValue  = inputValues.get(ElaborationNodeLerp.END) as number;
        const result    = parameter * (maxValue - minValue) + minValue;
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeLerp.OUTPUT, result
                ]
            ]);
    }
    
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that returns the logical
 *  and of all the inputs. The output is true if all the inputs are true, otherwise it's false. This
 *  node allows for an arbitrary number of inputs.
 */
export class ElaborationNodeAnd extends ArbitraryInputsElaborationNode {
    
    /** Name of the output, containing the logical and of all the inputs. */
    private static readonly OUTPUT: string = "And";
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id  - Value for {@link ElaborationNode#id|`id`}.
     * @param {ArbitraryInputsElaborationNodeOptions} options - Value for {@link ArbitraryInputsElaborationNode#options|`options`}.
     *                The type and the nullability set in this parameter are overwritten with the values
     *                {@link DatumType.BOOLEAN|`BOOLEAN`} and `false`.
     */
    constructor(id: number, options: ArbitraryInputsElaborationNodeOptions) {
        options.dataType = DatumType.BOOLEAN;
        options.nullable = false;
        super(id, ElaborationNodeCode.AND, options);
        this.outputs = [
            new Datum(ElaborationNodeAnd.OUTPUT, options.dataType, options.nullable)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const values: boolean[] = [];
        for (const input of this.inputs) {
            values.push(inputValues.get(input.name) as boolean);
        }
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeAnd.OUTPUT, values.every(value => value)
                ]
            ]);
    }
}


/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that returns the logical or of all
 * the inputs. The output is true if at least one of the inputs is true, otherwise it's false  This
 * node allows for an arbitrary number of inputs.
 */
export class ElaborationNodeOr extends ArbitraryInputsElaborationNode {
    
    /** Name of the output, containing the logical or of all the inputs. */
    private static readonly OUTPUT: string = "Or";
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     * @param {ArbitraryInputsElaborationNodeOptions} options - Value for {@link ArbitraryInputsElaborationNode#options|`options`}.
     *                The type and the nullability set in this parameter are overwritten with the values
     *                {@link DatumType.BOOLEAN|`BOOLEAN`} and `false`.
     */
    constructor(id: number, options: ArbitraryInputsElaborationNodeOptions) {
        options.dataType = DatumType.BOOLEAN;
        options.nullable = false;
        super(id, ElaborationNodeCode.OR, options);
        this.outputs = [
            new Datum(ElaborationNodeOr.OUTPUT, options.dataType, options.nullable)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const values: boolean[] = [];
        for (const input of this.inputs) {
            values.push(inputValues.get(input.name) as boolean);
        }
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeOr.OUTPUT, values.some(value => value)
                ]
            ]);
    }
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that returns the exclusive or
 * of all the inputs. The output is true if only one of the inputs is true, otherwise it's false This
 * node allows for an arbitrary number of inputs.
 */
export class ElaborationNodeXor extends ArbitraryInputsElaborationNode {
    
    
    /** Name of the output, containing the exclusive or of all the inputs. */
    private static readonly OUTPUT: string = "Xor";
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     * @param {ArbitraryInputsElaborationNodeOptions} options - Value for {@link ArbitraryInputsElaborationNode#options|`options`}.
     *                The type and the nullability set in this parameter are overwritten with the values
     *                {@link DatumType.BOOLEAN|`BOOLEAN`} and `false`.
     */
    constructor(id: number, options: ArbitraryInputsElaborationNodeOptions) {
        options.dataType = DatumType.BOOLEAN;
        options.nullable = false;
        super(id, ElaborationNodeCode.XOR, options);
        this.outputs = [
            new Datum(ElaborationNodeXor.OUTPUT, options.dataType, options.nullable)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const values: boolean[] = [];
        for (const input of this.inputs) {
            values.push(inputValues.get(input.name) as boolean);
        }
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeXor.OUTPUT, values.filter(value => value).length == 0
                ]
            ]);
    }
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that
 * return the negated value of the input.
 */
export class ElaborationNodeNot extends ElaborationNode {
    
    /** The name of the input. */
    private static readonly INPUT: string = "Value";
    
    /** The name of the output. */
    private static readonly OUTPUT: string = "Not";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.NOT);
        this.inputs  = [
            new Datum(ElaborationNodeNot.INPUT, DatumType.BOOLEAN, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeNot.OUTPUT, DatumType.BOOLEAN, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        let value = inputValues.get(ElaborationNodeNot.INPUT) as boolean;
        value     = !value;
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeNot.OUTPUT, value
                ]
            ]);
    }
    
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that this node simply
 *  repeats any value it gets presented with. It may be useful in groups to fuse multiple of the same
 *  input into one.
 */
export class ElaborationNodeBuffer extends TypedNullMarkedElaborationNode {
    
    /** The name of the input. */
    private static readonly VALUE: string = "Value";
    
    /** The name of the output. */
    private static readonly OUTPUT: string = "Buffered";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     * @param {TypedNullMarkedElaborationNodeOptions} options - Value for {@link TypedNullMarkedElaborationNode#options|`options`}.
     */
    constructor(id: number, options: TypedNullMarkedElaborationNodeOptions) {
        super(id, ElaborationNodeCode.BUFFER, options);
        this.inputs  = [
            new Datum(ElaborationNodeBuffer.VALUE, options.dataType, options.nullable)
        ];
        this.outputs = [
            new Datum(ElaborationNodeBuffer.OUTPUT, options.dataType, options.nullable)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const value = inputValues.get(ElaborationNodeBuffer.VALUE);
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeBuffer.OUTPUT, value
                ]
            ]);
    }
    
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that assures a
 * nullable parameter is transformed into a non-null parameter, returning a non-null fallback value if null.
 */
export class ElaborationNodeNullGuard extends TypedElaborationNode {
    
    
    /** The name of the input, to be assured null. */
    private static readonly NULLABLE_INPUT: string = "Nullable";
    /** The name of the default input to swap if the nullable input is null. */
    private static readonly DEFAULT_INPUT: string  = "Default";
    
    /** The name of the output. */
    private static readonly OUTPUT: string = "Non null value";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     * @param {TypedElaborationNodeOptions} options - Value for {@link TypedElaborationNode#options|`options`}.
     */
    constructor(id: number, options: TypedElaborationNodeOptions) {
        super(id, ElaborationNodeCode.NULL_GUARD, options);
        this.inputs  = [
            new Datum(ElaborationNodeNullGuard.NULLABLE_INPUT, options.dataType, true),
            new Datum(ElaborationNodeNullGuard.DEFAULT_INPUT, options.dataType, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeNullGuard.OUTPUT, options.dataType, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const checkValue   = inputValues.get(ElaborationNodeNullGuard.NULLABLE_INPUT);
        const defaultValue = inputValues.get(ElaborationNodeNullGuard.DEFAULT_INPUT);
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeNullGuard.OUTPUT, checkValue ?? defaultValue
                ]
            ]);
    }
    
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that checks whether two
 * values are equivalent, even if coming from two different elaborations.
 */
export class ElaborationNodeEqualityCheck extends TypedElaborationNode {
    
    /** The name of the first input to check for equality. */
    private static readonly FIRST_VALUE: string  = "First value";
    /** The name of the second input to check for equality. */
    private static readonly SECOND_VALUE: string = "Second value";
    
    /** The name of the output. */
    private static readonly OUTPUT: string = "Is equal";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     * @param {TypedElaborationNodeOptions} options - Value for {@link TypedElaborationNode#options|`options`}.
     */
    constructor(id: number, options: TypedElaborationNodeOptions) {
        super(id, ElaborationNodeCode.EQUALITY_CHECK, options);
        this.inputs  = [
            new Datum(ElaborationNodeEqualityCheck.FIRST_VALUE, options.dataType, true),
            new Datum(ElaborationNodeEqualityCheck.SECOND_VALUE, options.dataType, true)
        ];
        this.outputs = [
            new Datum(ElaborationNodeEqualityCheck.OUTPUT, DatumType.BOOLEAN, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const firstValue  = inputValues.get(ElaborationNodeEqualityCheck.FIRST_VALUE);
        const secondValue = inputValues.get(ElaborationNodeEqualityCheck.SECOND_VALUE);
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeEqualityCheck.OUTPUT, Datum.compareEquality(this.options.dataType, firstValue, secondValue)
                ]
            ]);
    }
    
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that checks if the first number is greater
 * than the second. When "Inclusive" input is true, equal values result in a true response, false otherwise.
 */
export class ElaborationNodeGreaterThan extends ElaborationNode {
    
    
    /** The name of the first input to check. */
    private static readonly FIRST_VALUE: string  = "First value";
    /** The name of the second input to check. */
    private static readonly SECOND_VALUE: string = "Second value";
    /** The name of the inclusive flag input. */
    private static readonly INCLUSIVE: string    = "Inclusive";
    
    /** The name of the output. */
    private static readonly OUTPUT: string = "First is greater";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.GREATER_THAN);
        this.inputs  = [
            new Datum(ElaborationNodeGreaterThan.FIRST_VALUE, DatumType.NUMBER, false),
            new Datum(ElaborationNodeGreaterThan.SECOND_VALUE, DatumType.NUMBER, false),
            new Datum(ElaborationNodeGreaterThan.INCLUSIVE, DatumType.BOOLEAN, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeGreaterThan.OUTPUT, DatumType.BOOLEAN, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const firstValue  = inputValues.get(ElaborationNodeGreaterThan.FIRST_VALUE) as number;
        const secondValue = inputValues.get(ElaborationNodeGreaterThan.SECOND_VALUE) as number;
        const inclusive   = inputValues.get(ElaborationNodeGreaterThan.INCLUSIVE) as boolean;
        if (inclusive) {
            return new Map<string, unknown>(
                [
                    [
                        ElaborationNodeGreaterThan.OUTPUT, firstValue >= secondValue
                    ]
                ]);
        } else {
            return new Map<string, unknown>(
                [
                    [
                        ElaborationNodeGreaterThan.OUTPUT,
                        firstValue > secondValue
                    ]
                ]);
        }
    }
    
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that checks if the first number is less
 * than the second. When "Inclusive" input is true, equal values result in a true response, false otherwise.
 */
export class ElaborationNodeLessThan extends ElaborationNode {
    
    /** The name of the first input to check. */
    private static readonly FIRST_VALUE: string  = "First value";
    /** The name of the second input to check. */
    private static readonly SECOND_VALUE: string = "Second value";
    /** The name of the inclusive flag input. */
    private static readonly INCLUSIVE: string    = "Inclusive";
    
    /** The name of the output. */
    private static readonly OUTPUT: string = "First is less";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.LESS_THAN);
        this.inputs  = [
            new Datum(ElaborationNodeLessThan.FIRST_VALUE, DatumType.NUMBER, false),
            new Datum(ElaborationNodeLessThan.SECOND_VALUE, DatumType.NUMBER, false),
            new Datum(ElaborationNodeLessThan.INCLUSIVE, DatumType.BOOLEAN, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeLessThan.OUTPUT, DatumType.BOOLEAN, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const firstValue  = inputValues.get(ElaborationNodeLessThan.FIRST_VALUE) as number;
        const secondValue = inputValues.get(ElaborationNodeLessThan.SECOND_VALUE) as number;
        const inclusive   = inputValues.get(ElaborationNodeLessThan.INCLUSIVE) as boolean;
        if (inclusive) {
            return new Map<string, unknown>(
                [
                    [
                        ElaborationNodeLessThan.OUTPUT, firstValue <= secondValue
                    ]
                ]);
        } else {
            return new Map<string, unknown>(
                [
                    [
                        ElaborationNodeLessThan.OUTPUT,
                        firstValue < secondValue
                    ]
                ]);
        }
    }
    
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that cycles a number
 *  between values in a closed loop, incrementing or decrementing the value by one depending on the "Forward"
 *  input. Upon reaching the "Cycle length" value, the value is reset to the start. "Start from 0" decides
 *  whether the values go from 0 to "Cycle length" - 1, or from 1 to "Cycle length". "Cycle length" values
 *  less than 1 are considered as 1, non-integer values are allowed and the fractional part is kept (so 4.5
 *  with a cycle of 5 gets reset to 0.5). Values out of range are reduced to the range via modulo "Cycle length".
 */
export class ElaborationNodeCycle extends ElaborationNode {
    
    /** The name of the input to be cycled. */
    private static readonly VALUE: string      = "Value";
    /** The name of the cycle length input. */
    private static readonly CYCLE: string      = "Cycle length";
    /** The name of the input flag that tells if the cycle starts from 0. */
    private static readonly START_ZERO: string = "Start from 0";
    /** The name of the input flag that tells if the cycle advances or decrements. */
    private static readonly FORWARD: string    = "Forward";
    /** The name of the input flag that tells if the cycle change is applied. */
    private static readonly ENABLED: string    = "Enabled";
    
    /** The name of the output. */
    private static readonly OUTPUT: string = "Next";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.CYCLE);
        this.inputs  = [
            new Datum(ElaborationNodeCycle.VALUE, DatumType.NUMBER, false),
            new Datum(ElaborationNodeCycle.CYCLE, DatumType.NUMBER, false),
            new Datum(ElaborationNodeCycle.START_ZERO, DatumType.BOOLEAN, false),
            new Datum(ElaborationNodeCycle.FORWARD, DatumType.BOOLEAN, false),
            new Datum(ElaborationNodeCycle.ENABLED, DatumType.BOOLEAN, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeCycle.OUTPUT, DatumType.NUMBER, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        let value = inputValues.get(ElaborationNodeCycle.VALUE) as number;
        let cycle = inputValues.get(ElaborationNodeCycle.CYCLE) as number;
        if (cycle <= 0) {
            cycle = 1;
        }
        const startZero = inputValues.get(ElaborationNodeCycle.START_ZERO) as boolean;
        const forward   = inputValues.get(ElaborationNodeCycle.FORWARD) as boolean;
        const enabled   = inputValues.get(ElaborationNodeCycle.ENABLED) as boolean;
        if (!startZero) {
            value--;
        }
        value = ((value % cycle) + cycle) % cycle;
        if (enabled) {
            if (forward) {
                value++;
            } else {
                value--;
            }
        }
        value = value % cycle;
        if (!startZero) {
            value++;
        }
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeCycle.OUTPUT, value
                ]
            ]);
    }
    
}


/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that selects one of two values,
 * depending on the value of "Choose first?". If it's true, the first is chosen, otherwise the second one is.
 */
export class ElaborationNodeBinaryChoice extends TypedNullMarkedElaborationNode {
    
    /** The name of the first input. */
    private static readonly FIRST: string   = "First choice";
    /** The name of the second input. */
    private static readonly SECOND: string  = "Second choice";
    /** The name of the input that selects which input is output. */
    private static readonly CHOOSER: string = "Choose first?";
    
    /** The name of the output. */
    private static readonly OUTPUT: string = "Choice";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     * @param {TypedNullMarkedElaborationNodeOptions} options - Value for {@link TypedNullMarkedElaborationNode#options|`options`}.
     */
    constructor(id: number, options: TypedNullMarkedElaborationNodeOptions) {
        super(id, ElaborationNodeCode.BINARY_CHOICE, options);
        this.inputs  = [
            new Datum(ElaborationNodeBinaryChoice.FIRST, options.dataType, options.nullable),
            new Datum(ElaborationNodeBinaryChoice.SECOND, options.dataType, options.nullable),
            new Datum(ElaborationNodeBinaryChoice.CHOOSER, DatumType.BOOLEAN, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeBinaryChoice.OUTPUT, options.dataType, options.nullable)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const firstValue   = inputValues.get(ElaborationNodeBinaryChoice.FIRST);
        const secondValue  = inputValues.get(ElaborationNodeBinaryChoice.SECOND);
        const chooserValue = inputValues.get(ElaborationNodeBinaryChoice.CHOOSER) as boolean;
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeBinaryChoice.OUTPUT, chooserValue ? firstValue : secondValue
                ]
            ]);
    }
    
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that selects a value among a
 *  series of options, by index. Indexes outside of range loop, non-integer indexes get rounded.
 */
export class ElaborationNodeMultipleChoice extends ArbitraryInputsElaborationNode {
    
    /** Name of the variable that selects which input is sent as output. */
    private static readonly INDEX: string = "Choose index?";
    
    /** Name of the output. */
    private static readonly OUTPUT: string = "Choice";
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     * @param {ArbitraryInputsElaborationNodeOptions} options - Value for {@link ArbitraryInputsElaborationNode#options|`options`}.
     */
    constructor(id: number, options: ArbitraryInputsElaborationNodeOptions) {
        super(id, ElaborationNodeCode.MULTIPLE_CHOICE, options);
        this.inputs.splice(0, 0, new Datum(ElaborationNodeMultipleChoice.INDEX, DatumType.NUMBER, false));
        this.outputs = [
            new Datum(ElaborationNodeMultipleChoice.OUTPUT, options.dataType, options.nullable)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        let chooserValue  = inputValues.get(ElaborationNodeMultipleChoice.INDEX) as number;
        chooserValue      = Math.round(chooserValue);
        chooserValue = (chooserValue % this.options.inputNumber + this.options.inputNumber) % this.options.inputNumber;
        const chosenValue = inputValues.get(ArbitraryInputsElaborationNode.getInputName(chooserValue));
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeMultipleChoice.OUTPUT, chosenValue
                ]
            ]);
    }
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that returns which one of the
 * inputs is true, returning its position (0-indexed). So if the first is true, the encoded value is 0, and so on.
 * In case of multiple true values, the highest-indexed or lowest-indexed one is the one chosen, depending on the
 * dominance flag, and the conflict flag results true. If none is selected, -1 is returned and the unset flag
 * results true.
 */
export class ElaborationNodeEncoder extends ArbitraryInputsElaborationNode {
    
    /** Name of the input flag indicating dominance. */
    private static readonly DOMINANCE: string = "Highest dominance";
    
    /** Name of the output containing the encoded index. */
    private static readonly ENCODED: string  = "Encoded";
    /** Name of the output flag set if the true inputs are more than one. */
    private static readonly CONFLICT: string = "Conflict";
    /** Name of the output flag set if there is no true input. */
    private static readonly UNSET: string    = "Unset";
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     * @param {ArbitraryInputsElaborationNodeOptions} options - Value for {@link ArbitraryInputsElaborationNode#options|`options`}.
     */
    constructor(id: number, options: ArbitraryInputsElaborationNodeOptions) {
        options.dataType = DatumType.BOOLEAN;
        options.nullable = false;
        super(id, ElaborationNodeCode.ENCODER, options);
        this.inputs.splice(0, 0, new Datum(ElaborationNodeEncoder.DOMINANCE, DatumType.BOOLEAN, false));
        this.outputs = [
            new Datum(ElaborationNodeEncoder.ENCODED, DatumType.NUMBER, false),
            new Datum(ElaborationNodeEncoder.CONFLICT, DatumType.BOOLEAN, false),
            new Datum(ElaborationNodeEncoder.UNSET, DatumType.BOOLEAN, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const dominance              = inputValues.get(ElaborationNodeEncoder.DOMINANCE) as number;
        let firstTrue: number | null = null;
        let lastTrue: number | null  = null;
        for (let i = 0; i < this.options.inputNumber; i++) {
            if (inputValues.get(ArbitraryInputsElaborationNode.getInputName(i)) as boolean) {
                firstTrue = firstTrue ?? i;
                lastTrue  = i;
            }
        }
        let conflict: boolean;
        let unset: boolean;
        let result: number;
        if (firstTrue == null) {
            unset    = true;
            conflict = false;
            result   = -1;
        } else if (firstTrue == lastTrue) {
            unset    = false;
            conflict = false;
            result   = firstTrue;
        } else {
            unset    = false;
            conflict = true;
            result   = (dominance ? lastTrue : firstTrue) ?? -1;
        }
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeEncoder.ENCODED, result
                ],
                [
                    ElaborationNodeEncoder.CONFLICT, conflict
                ],
                [
                    ElaborationNodeEncoder.UNSET, unset
                ]
            ]);
    }
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that extract the single red,
 *  green and blue components from a color. NOTE: If the color is in the XY space, it gets converted (lossily).
 */
export class ElaborationNodeExtractRGB extends ElaborationNode {
    
    /** Name of the input. */
    private static readonly COLOR = "Color";
    
    /** Name of the RED output. */
    private static readonly RED   = "Red";
    /** Name of the GREEN output. */
    private static readonly GREEN = "Green";
    /** Name of the BLUE output. */
    private static readonly BLUE  = "Blue";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.EXTRACT_RGB);
        this.inputs  = [
            new Datum(ElaborationNodeExtractRGB.COLOR, DatumType.COLOR, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeExtractRGB.RED, DatumType.NUMBER, false),
            new Datum(ElaborationNodeExtractRGB.GREEN, DatumType.NUMBER, false),
            new Datum(ElaborationNodeExtractRGB.BLUE, DatumType.NUMBER, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const color = inputValues.get(ElaborationNodeExtractRGB.COLOR) as DatumTypeColor;
        let r: number, g: number, b: number;
        if (color.base == DatumTypeColorBase.RGB) {
            r = color.r ?? 255;
            g = color.g ?? 255;
            b = color.b ?? 255;
        } else {
            const conversion = ColorSpace.sRGB.colorFromXY(color.x ?? 0.33, color.y ?? 0.33);
            r                = Math.round(conversion.r * 255);
            g                = Math.round(conversion.g * 255);
            b                = Math.round(conversion.b * 255);
        }
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeExtractRGB.RED, r
                ],
                [
                    ElaborationNodeExtractRGB.GREEN, g
                ],
                [
                    ElaborationNodeExtractRGB.BLUE, b
                ]
            ]);
    }
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that extract the single hue,
 * saturation and lightness components from a color. NOTE: If the color is in the XY space, it gets converted
 * (lossily).
 */
export class ElaborationNodeExtractHSL extends ElaborationNode {
    
    
    /** Name of the input. */
    private static readonly COLOR = "Color";
    
    /** Name of the HUE output. */
    private static readonly HUE        = "Hue";
    /** Name of the SATURATION output. */
    private static readonly SATURATION = "Saturation";
    /** Name of the LIGHTNESS output. */
    private static readonly LIGHTNESS  = "Lightness";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.EXTRACT_HSL);
        this.inputs  = [
            new Datum(ElaborationNodeExtractHSL.COLOR, DatumType.COLOR, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeExtractHSL.HUE, DatumType.NUMBER, false),
            new Datum(ElaborationNodeExtractHSL.SATURATION, DatumType.NUMBER, false),
            new Datum(ElaborationNodeExtractHSL.LIGHTNESS, DatumType.NUMBER, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const color = inputValues.get(ElaborationNodeExtractHSL.COLOR) as DatumTypeColor;
        let conversion: { h: number, s: number, l: number };
        if (color.base == DatumTypeColorBase.RGB) {
            conversion = Color.rgb(color.r ?? 255, color.g ?? 255, color.b ?? 255).toHSL();
        } else {
            conversion = ColorSpace.sRGB.colorFromXY(color.x ?? 0.33, color.y ?? 0.33).toHSL();
        }
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeExtractHSL.HUE, Math.round(conversion.h * 360)
                ],
                [
                    ElaborationNodeExtractHSL.SATURATION, Math.round(conversion.s * 100)
                ],
                [
                    ElaborationNodeExtractHSL.LIGHTNESS, Math.round(conversion.l * 100)
                ]
            ]);
    }
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that extract the single hue,
 *  saturation and value (i.e brightness) components from a color. NOTE: If the color is in the XY space,
 *  it gets converted (lossily).
 */
export class ElaborationNodeExtractHSV extends ElaborationNode {
    
    
    /** Name of the input. */
    private static readonly COLOR = "Color";
    
    /** Name of the HUE output. */
    private static readonly HUE        = "Hue";
    /** Name of the SATURATION output. */
    private static readonly SATURATION = "Saturation";
    /** Name of the VALUE output. */
    private static readonly VALUE      = "Value (Brightness)";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.EXTRACT_HSV);
        this.inputs  = [
            new Datum(ElaborationNodeExtractHSV.COLOR, DatumType.COLOR, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeExtractHSV.HUE, DatumType.NUMBER, false),
            new Datum(ElaborationNodeExtractHSV.SATURATION, DatumType.NUMBER, false),
            new Datum(ElaborationNodeExtractHSV.VALUE, DatumType.NUMBER, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const color = inputValues.get(ElaborationNodeExtractHSV.COLOR) as DatumTypeColor;
        let conversion: { h: number, s: number, v: number };
        if (color.base == DatumTypeColorBase.RGB) {
            conversion = Color.rgb(color.r ?? 255, color.g ?? 255, color.b ?? 255).toHSV();
        } else {
            conversion = ColorSpace.sRGB.colorFromXY(color.x ?? 0.33, color.y ?? 0.33).toHSV();
        }
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeExtractHSV.HUE, Math.round(conversion.h * 360)
                ],
                [
                    ElaborationNodeExtractHSV.SATURATION, Math.round(conversion.s * 100)
                ],
                [
                    ElaborationNodeExtractHSV.VALUE, Math.round(conversion.v * 100)
                ]
            ]);
    }
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that extract the single X/Y
 *  (CIE 1931 color space) components from a color. NOTE: If the color is in the RGB space, it gets converted
 *  (lossily).
 */
export class ElaborationNodeExtractXY extends ElaborationNode {
    
    /** Name of the input. */
    private static readonly COLOR = "Color";
    
    /** Name of the X output. */
    private static readonly X = "X";
    /** Name of the Y output. */
    private static readonly Y = "Y";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.EXTRACT_XY);
        this.inputs  = [
            new Datum(ElaborationNodeExtractXY.COLOR, DatumType.COLOR, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeExtractXY.X, DatumType.NUMBER, false),
            new Datum(ElaborationNodeExtractXY.Y, DatumType.NUMBER, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const color = inputValues.get(ElaborationNodeExtractXY.COLOR) as DatumTypeColor;
        let x: number, y: number;
        if (color.base == DatumTypeColorBase.XY) {
            x = color.x ?? 0.33;
            y = color.y ?? 0.33;
        } else {
            const conversion = ColorSpace.sRGB.xyYFromColor(Color.rgb(color.r ?? 255, color.g ?? 255, color.b ?? 255));
            x                = conversion.x;
            y                = conversion.y;
        }
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeExtractXY.X, x
                ],
                [
                    ElaborationNodeExtractXY.Y, y
                ]
            ]);
    }
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that transform extract
 * the temperature (in Kelvin) from a color temperature value.
 */
export class ElaborationNodeExtractColorTemp extends ElaborationNode {
    
    /** The name of the input. */
    private static readonly COLOR_TEMP = "Color";
    
    /** The name of the output. */
    private static readonly COLOR_TEMP_VALUE = "Temperature";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.EXTRACT_COLOR_TEMP);
        this.inputs  = [
            new Datum(ElaborationNodeExtractColorTemp.COLOR_TEMP, DatumType.COLOR_TEMP, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeExtractColorTemp.COLOR_TEMP_VALUE, DatumType.NUMBER, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const color = inputValues.get(ElaborationNodeExtractColorTemp.COLOR_TEMP) as number;
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeExtractColorTemp.COLOR_TEMP_VALUE, color
                ]
            ]);
    }
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that creates a color
 * from the single red, green and blue components.
 */
export class ElaborationNodeFromRGB extends ElaborationNode {
    
    /** Name of the RED input. */
    private static readonly RED   = "Red";
    /** Name of the GREEN input. */
    private static readonly GREEN = "Green";
    /** Name of the BLUE input. */
    private static readonly BLUE  = "Blue";
    
    /** Name of the output. */
    private static readonly OUTPUT = "Color";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.FROM_RGB);
        this.inputs  = [
            new Datum(ElaborationNodeFromRGB.RED, DatumType.NUMBER, false),
            new Datum(ElaborationNodeFromRGB.GREEN, DatumType.NUMBER, false),
            new Datum(ElaborationNodeFromRGB.BLUE, DatumType.NUMBER, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeFromRGB.OUTPUT, DatumType.COLOR, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        let red   = inputValues.get(ElaborationNodeFromRGB.RED) as number;
        let green = inputValues.get(ElaborationNodeFromRGB.GREEN) as number;
        let blue  = inputValues.get(ElaborationNodeFromRGB.BLUE) as number;
        red       = Math.min(255, Math.max(0, Math.round(red)));
        green     = Math.min(255, Math.max(0, Math.round(green)));
        blue      = Math.min(255, Math.max(0, Math.round(blue)));
        
        const color = new DatumTypeColor(DatumTypeColorBase.RGB, red, green, blue);
        
        return new Map<string, unknown>([
                                            [
                                                ElaborationNodeFromRGB.OUTPUT, color
                                            ]
                                        ]);
    }
    
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that creates a color
 * from the single hue, saturation and lightness components.
 */
export class ElaborationNodeFromHSL extends ElaborationNode {
    
    /** Name of the HUE input. */
    private static readonly HUE        = "Hue";
    /** Name of the SATURATION input. */
    private static readonly SATURATION = "Saturation";
    /** Name of the LIGHTNESS input. */
    private static readonly LIGHTNESS  = "Lightness";
    
    /** Name of the output. */
    private static readonly OUTPUT = "Color";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.FROM_HSL);
        this.inputs  = [
            new Datum(ElaborationNodeFromHSL.HUE, DatumType.NUMBER, false),
            new Datum(ElaborationNodeFromHSL.SATURATION, DatumType.NUMBER, false),
            new Datum(ElaborationNodeFromHSL.LIGHTNESS, DatumType.NUMBER, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeFromHSL.OUTPUT, DatumType.COLOR, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        let hue        = inputValues.get(ElaborationNodeFromHSL.HUE) as number;
        let saturation = inputValues.get(ElaborationNodeFromHSL.SATURATION) as number;
        let lightness  = inputValues.get(ElaborationNodeFromHSL.LIGHTNESS) as number;
        hue            = Math.min(1, Math.max(0, hue / 360));
        saturation     = Math.min(1, Math.max(0, saturation / 100));
        lightness      = Math.min(1, Math.max(0, lightness / 100));
        
        const convertedColor = Color.hsv(hue, saturation, lightness);
        
        const color = new DatumTypeColor(
            DatumTypeColorBase.RGB,
            Math.round(convertedColor.r * 255),
            Math.round(convertedColor.g * 255),
            Math.round(convertedColor.b * 255)
        );
        
        return new Map<string, unknown>([
                                            [
                                                ElaborationNodeFromHSL.OUTPUT, color
                                            ]
                                        ]);
    }
    
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that creates a color
 * from the single hue, saturation and value (i.e brightness) components.
 */
export class ElaborationNodeFromHSV extends ElaborationNode {
    
    /** Name of the HUE input. */
    private static readonly HUE        = "Hue";
    /** Name of the SATURATION input. */
    private static readonly SATURATION = "Saturation";
    /** Name of the VALUE input. */
    private static readonly VALUE      = "Value (Brightness)";
    
    /** Name of the output. */
    private static readonly OUTPUT = "Color";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.FROM_HSV);
        this.inputs  = [
            new Datum(ElaborationNodeFromHSV.HUE, DatumType.NUMBER, false),
            new Datum(ElaborationNodeFromHSV.SATURATION, DatumType.NUMBER, false),
            new Datum(ElaborationNodeFromHSV.VALUE, DatumType.NUMBER, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeFromHSV.OUTPUT, DatumType.COLOR, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        let hue        = inputValues.get(ElaborationNodeFromHSV.HUE) as number;
        let saturation = inputValues.get(ElaborationNodeFromHSV.SATURATION) as number;
        let value      = inputValues.get(ElaborationNodeFromHSV.VALUE) as number;
        hue            = Math.min(1, Math.max(0, hue / 360));
        saturation     = Math.min(1, Math.max(0, saturation / 100));
        value          = Math.min(1, Math.max(0, value / 100));
        
        const convertedColor = Color.hsv(hue, saturation, value);
        
        const color = new DatumTypeColor(
            DatumTypeColorBase.RGB,
            Math.round(convertedColor.r * 255),
            Math.round(convertedColor.g * 255),
            Math.round(convertedColor.b * 255)
        );
        
        return new Map<string, unknown>([
                                            [
                                                ElaborationNodeFromHSV.OUTPUT, color
                                            ]
                                        ]);
    }
    
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that creates a color
 * from the single X/Y (CIE 1931 color space) components.
 */
export class ElaborationNodeFromXY extends ElaborationNode {
    
    /** Name of the X input. */
    private static readonly X = "X";
    /** Name of the Y input. */
    private static readonly Y = "Y";
    
    /** Name of the output. */
    private static readonly OUTPUT = "Color";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.FROM_XY);
        this.inputs  = [
            new Datum(ElaborationNodeFromXY.X, DatumType.NUMBER, false),
            new Datum(ElaborationNodeFromXY.Y, DatumType.NUMBER, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeFromXY.OUTPUT, DatumType.COLOR, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        let x = inputValues.get(ElaborationNodeFromXY.X) as number;
        let y = inputValues.get(ElaborationNodeFromXY.Y) as number;
        x     = Math.min(1, Math.max(0, x));
        y     = Math.min(1, Math.max(0, y));
        
        const color = new DatumTypeColor(DatumTypeColorBase.XY, x, y);
        
        return new Map<string, unknown>([
                                            [
                                                ElaborationNodeFromXY.OUTPUT, color
                                            ]
                                        ]);
    }
    
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that transform a number
 * (temperature in Kelvin) into a color temperature value.
 */
export class ElaborationNodeFromColorTemp extends ElaborationNode {
    
    /** The name of the input. */
    private static readonly COLOR_TEMP_VALUE = "Temperature";
    
    /** The name of the output . */
    private static readonly COLOR_TEMP = "Color";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.FROM_COLOR_TEMP);
        this.inputs  = [
            new Datum(ElaborationNodeFromColorTemp.COLOR_TEMP_VALUE, DatumType.NUMBER, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeFromColorTemp.COLOR_TEMP, DatumType.COLOR_TEMP, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        let value = inputValues.get(ElaborationNodeFromColorTemp.COLOR_TEMP_VALUE) as number;
        value     = Math.min(MAX_ALLOWED_TEMP, Math.max(MIN_ALLOWED_TEMP, value));
        
        return new Map<string, unknown>([
                                            [
                                                ElaborationNodeFromColorTemp.COLOR_TEMP, value
                                            ]
                                        ]);
    }
    
}

/** The options containing information for {@link ElaborationNodeTimeout|`ElaborationNodeTimeout`}. */
export interface ElaborationNodeTimeoutOptions {
    /** The value used to store the timestamp at which the node has been created. */
    creationTimestamp: number;
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that when "Reset" is true,
 *  a new calculation of the mix will be scheduled in "Timeout" seconds, after which the output "Triggered"
 *  will be true (only once). Setting "Reset" to true before the previous timeout has expired will cancel it,
 *  and the next triggering will be scheduled calculating the timeout from the most recent reset.
 */
export class ElaborationNodeTimeout extends ElaborationNode {
    
    /** The name of the input timeout length. */
    private static readonly TIMEOUT = "Timeout (s)";
    /** The name of the input resetting and starting the timeout. */
    private static readonly RESET   = "Reset";
    
    /** The name of the output flag that signals the timer being triggered. */
    private static readonly TRIGGERED = "Triggered";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * The calculated next timeout (how many milliseconds from the calculation of the node)
     * that the node will set if a new timeout is requested, so that the system can handle the timeout.
     *
     * @private
     */
    private _nextTrigger: number | null = null;
    
    /**
     * Returns the calculated next timeout (how many milliseconds from the calculation of the node)
     * that the node will set if a new timeout is requested, so that the system can handle the timeout.
     */
    public get nextTrigger(): number | null {
        return this._nextTrigger;
    }
    
    /**
     * Flag that should be set to true before calling {@link ElaborationNodeTimeout#calculate|`calculate`} or
     * {@link ElaborationNode#elaborate|`ElaborationNode.elaborate`} to notify the node that the timeout has
     * expired.
     */
    public hasTimedOut: boolean = false;
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     * @param {ElaborationNodeTimeoutOptions} options - Value containing the elaboration options, specifically the creation timestamp,
     *                                                  set at the insertion of the node in the mix. This is used to identify the timeout node
     *                                                  that has expired when expiration triggers a recalculation of the cycle.
     */
    constructor(id: number, public options: ElaborationNodeTimeoutOptions) {
        super(id, ElaborationNodeCode.TIMEOUT);
        this.inputs  = [
            new Datum(ElaborationNodeTimeout.TIMEOUT, DatumType.NUMBER, false),
            new Datum(ElaborationNodeTimeout.RESET, DatumType.BOOLEAN, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeTimeout.TRIGGERED, DatumType.BOOLEAN, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const reset = inputValues.get(ElaborationNodeTimeout.RESET) as boolean;
        if (reset) {
            let timeout       = inputValues.get(ElaborationNodeTimeout.TIMEOUT) as number;
            timeout           = Math.max(10, timeout);
            this._nextTrigger = timeout * 1000;
        } else {
            this._nextTrigger = null;
        }
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeTimeout.TRIGGERED, this.hasTimedOut
                ]
            ]);
    }
    
    /**
     * @inheritDoc
     */
    public override toJSON(): ElaborationNodeJSON {
        const result   = super.toJSON();
        result.options = this.options;
        return result;
    }
    
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that exposes the single components
 *  of a date. Day of the week is a number from 1 (Monday) to 7 (Sunday).
 */
export class ElaborationNodeDateValues extends ElaborationNode {
    
    /** The name of the input. */
    private static readonly DATE = "Date";
    
    /** The name of the output that will contain the year. */
    private static readonly YEAR     = "Year";
    /** The name of the output that will contain the month. */
    private static readonly MONTH    = "Month";
    /** The name of the output that will contain the date of the month. */
    private static readonly DAY_DATE = "Date in month";
    /** The name of the output that will contain the weekday. */
    private static readonly WEEKDAY  = "Weekday";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.DATE_VALUES);
        this.inputs  = [
            new Datum(ElaborationNodeDateValues.DATE, DatumType.DATE, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeDateValues.YEAR, DatumType.NUMBER, false),
            new Datum(ElaborationNodeDateValues.MONTH, DatumType.NUMBER, false),
            new Datum(ElaborationNodeDateValues.DAY_DATE, DatumType.NUMBER, false),
            new Datum(ElaborationNodeDateValues.WEEKDAY, DatumType.NUMBER, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const date = inputValues.get(ElaborationNodeDateValues.DATE) as Date;
        
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeDateValues.YEAR, date.getFullYear()
                ],
                [
                    ElaborationNodeDateValues.MONTH, date.getMonth() + 1
                ],
                [
                    ElaborationNodeDateValues.DAY_DATE, date.getDate()
                ],
                [
                    ElaborationNodeDateValues.WEEKDAY, (date.getDay() + 7 - 1) % 7 + 1
                ]
            ]);
    }
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that exposes the single
 *  components from a time of day value.
 */
export class ElaborationNodeTimeValues extends ElaborationNode {
    
    /** The name of the input. */
    private static readonly TIME = "Time";
    
    /** The name of the output that will contain the hour. */
    private static readonly HOUR   = "Hour";
    /** The name of the output that will contain the minute. */
    private static readonly MINUTE = "Minute";
    /** The name of the output that will contain the date of the second. */
    private static readonly SECOND = "Second";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.TIME_VALUES);
        this.inputs  = [
            new Datum(ElaborationNodeTimeValues.TIME, DatumType.TIME, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeTimeValues.HOUR, DatumType.NUMBER, false),
            new Datum(ElaborationNodeTimeValues.MINUTE, DatumType.NUMBER, false),
            new Datum(ElaborationNodeTimeValues.SECOND, DatumType.NUMBER, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const time = inputValues.get(ElaborationNodeTimeValues.TIME) as Date;
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeTimeValues.HOUR, time.getHours()
                ],
                [
                    ElaborationNodeTimeValues.MINUTE, time.getMinutes()
                ],
                [
                    ElaborationNodeTimeValues.SECOND, time.getSeconds()
                ]
            ]);
    }
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that exposes the
 * single components of a date + time of day value. Day of the week is a number from 1 (Monday) to 7 (Sunday).
 */
export class ElaborationNodeDateTimeValues extends ElaborationNode {
    
    /** The name of the input. */
    private static readonly DATE_TIME = "Date Time";
    
    /** The name of the output that will contain the hour. */
    private static readonly HOUR     = "Hour";
    /** The name of the output that will contain the minute. */
    private static readonly MINUTE   = "Minute";
    /** The name of the output that will contain the date of the second. */
    private static readonly SECOND   = "Second";
    /** The name of the output that will contain the year. */
    private static readonly YEAR     = "Year";
    /** The name of the output that will contain the month. */
    private static readonly MONTH    = "Month";
    /** The name of the output that will contain the date of the month. */
    private static readonly DAY_DATE = "Date in month";
    /** The name of the output that will contain the date of the weekday. */
    private static readonly WEEKDAY  = "Weekday";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.DATE_TIME_VALUES);
        this.inputs  = [
            new Datum(ElaborationNodeDateTimeValues.DATE_TIME, DatumType.TIME, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeDateTimeValues.HOUR, DatumType.NUMBER, false),
            new Datum(ElaborationNodeDateTimeValues.MINUTE, DatumType.NUMBER, false),
            new Datum(ElaborationNodeDateTimeValues.SECOND, DatumType.NUMBER, false),
            new Datum(ElaborationNodeDateTimeValues.YEAR, DatumType.NUMBER, false),
            new Datum(ElaborationNodeDateTimeValues.MONTH, DatumType.NUMBER, false),
            new Datum(ElaborationNodeDateTimeValues.DAY_DATE, DatumType.NUMBER, false),
            new Datum(ElaborationNodeDateTimeValues.WEEKDAY, DatumType.NUMBER, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const date = inputValues.get(ElaborationNodeDateTimeValues.DATE_TIME) as Date;
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeDateTimeValues.HOUR, date.getHours()
                ],
                [
                    ElaborationNodeDateTimeValues.MINUTE, date.getMinutes()
                ],
                [
                    ElaborationNodeDateTimeValues.SECOND, date.getSeconds()
                ],
                [
                    ElaborationNodeDateTimeValues.YEAR, date.getFullYear()
                ],
                [
                    ElaborationNodeDateTimeValues.MONTH, date.getMonth() + 1
                ],
                [
                    ElaborationNodeDateTimeValues.DAY_DATE, date.getDate()
                ],
                [
                    ElaborationNodeDateTimeValues.WEEKDAY, (date.getDay() + 7 - 1) % 7 + 1
                ]
            ]);
    }
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing
 * a node that creates a date from the single components.
 */
export class ElaborationNodeDateFromValues extends ElaborationNode {
    
    /** The name of the input that contains the year. */
    private static readonly YEAR     = "Year";
    /** The name of the input that contains the month. */
    private static readonly MONTH    = "Month";
    /** The name of the input that contains the date of the month. */
    private static readonly DAY_DATE = "Date in month";
    
    /** The name of the output. */
    private static readonly DATE = "Date";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.DATE_FROM_VALUES);
        this.inputs  = [
            new Datum(ElaborationNodeDateFromValues.YEAR, DatumType.NUMBER, false),
            new Datum(ElaborationNodeDateFromValues.MONTH, DatumType.NUMBER, false),
            new Datum(ElaborationNodeDateFromValues.DAY_DATE, DatumType.NUMBER, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeDateFromValues.DATE, DatumType.DATE, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const year    = inputValues.get(ElaborationNodeDateFromValues.YEAR) as number;
        const month   = inputValues.get(ElaborationNodeDateFromValues.MONTH) as number;
        const dayDate = inputValues.get(ElaborationNodeDateFromValues.DAY_DATE) as number;
        
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeDateFromValues.DATE, new Date(year, month - 1, dayDate)
                ]
            ]);
    }
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that
 * creates a time of day value from the single components.
 */
export class ElaborationNodeTimeFromValues extends ElaborationNode {
    
    /** The name of the input that contains the hour. */
    private static readonly HOUR   = "Hour";
    /** The name of the input that contains the minute. */
    private static readonly MINUTE = "Minute";
    /** The name of the input that contains the date of the second. */
    private static readonly SECOND = "Second";
    
    /** The name of the output. */
    private static readonly TIME = "Time";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.TIME_FROM_VALUES);
        this.inputs  = [
            new Datum(ElaborationNodeTimeFromValues.HOUR, DatumType.NUMBER, false),
            new Datum(ElaborationNodeTimeFromValues.MINUTE, DatumType.NUMBER, false),
            new Datum(ElaborationNodeTimeFromValues.SECOND, DatumType.NUMBER, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeTimeFromValues.TIME, DatumType.TIME, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const hour   = inputValues.get(ElaborationNodeTimeFromValues.HOUR) as number;
        const minute = inputValues.get(ElaborationNodeTimeFromValues.MINUTE) as number;
        const second = inputValues.get(ElaborationNodeTimeFromValues.SECOND) as number;
        
        const date = new Date(2000, 0, 1, hour, minute, second);
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeTimeFromValues.TIME, new Date(2000, 0, 1, date.getHours(), date.getMinutes(), date.getSeconds())
                ]
            ]);
    }
}

/** Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that creates a date + time of day value from the single components. */
export class ElaborationNodeDateTimeFromValues extends ElaborationNode {
    
    /** The name of the input that contains the hour. */
    private static readonly YEAR     = "Year";
    /** The name of the input that contains the minute. */
    private static readonly MONTH    = "Month";
    /** The name of the input that contains the date of the second. */
    private static readonly DAY_DATE = "Date in month";
    /** The name of the input that contains the year. */
    private static readonly HOUR     = "Hour";
    /** The name of the input that contains the month. */
    private static readonly MINUTE   = "Minute";
    /** The name of the input that contains the date of the month. */
    private static readonly SECOND   = "Second";
    
    /** The name of the output. */
    private static readonly DATE_TIME = "DateTime";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.DATE_TIME_FROM_VALUES);
        this.inputs  = [
            new Datum(ElaborationNodeDateTimeFromValues.YEAR, DatumType.NUMBER, false),
            new Datum(ElaborationNodeDateTimeFromValues.MONTH, DatumType.NUMBER, false),
            new Datum(ElaborationNodeDateTimeFromValues.DAY_DATE, DatumType.NUMBER, false),
            new Datum(ElaborationNodeDateTimeFromValues.HOUR, DatumType.NUMBER, false),
            new Datum(ElaborationNodeDateTimeFromValues.MINUTE, DatumType.NUMBER, false),
            new Datum(ElaborationNodeDateTimeFromValues.SECOND, DatumType.NUMBER, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeDateTimeFromValues.DATE_TIME, DatumType.DATE_TIME, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const year    = inputValues.get(ElaborationNodeDateTimeFromValues.YEAR) as number;
        const month   = inputValues.get(ElaborationNodeDateTimeFromValues.MONTH) as number;
        const dayDate = inputValues.get(ElaborationNodeDateTimeFromValues.DAY_DATE) as number;
        const hour    = inputValues.get(ElaborationNodeDateTimeFromValues.HOUR) as number;
        const minute  = inputValues.get(ElaborationNodeDateTimeFromValues.MINUTE) as number;
        const second  = inputValues.get(ElaborationNodeDateTimeFromValues.SECOND) as number;
        
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeDateTimeFromValues.DATE_TIME, new Date(year, month - 1, dayDate, hour, minute, second)
                ]
            ]);
    }
}


/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node
 *  that compares two dates, and results in whether the first comes first, is equal
 *  or comes after the second.
 */
export class ElaborationNodeDateCompare extends ElaborationNode {
    
    /** The input name for the first date. */
    private static readonly DATE_FIRST  = "First value";
    /** The input name for the second date. */
    private static readonly DATE_SECOND = "Second value";
    
    /** The output flag that tells if the first date comes before the second. */
    private static readonly FIRST_LESS    = "First is less";
    /** The output flag that tells if the first date is equal to the second. */
    private static readonly EQUAL         = "Equal";
    /** The output flag that tells if the first date comes after the second. */
    private static readonly FIRST_GREATER = "First is greater";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.DATE_COMPARE);
        this.inputs  = [
            new Datum(ElaborationNodeDateCompare.DATE_FIRST, DatumType.DATE, false),
            new Datum(ElaborationNodeDateCompare.DATE_SECOND, DatumType.DATE, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeDateCompare.FIRST_LESS, DatumType.BOOLEAN, false),
            new Datum(ElaborationNodeDateCompare.EQUAL, DatumType.BOOLEAN, false),
            new Datum(ElaborationNodeDateCompare.FIRST_GREATER, DatumType.BOOLEAN, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const dateFirst  = inputValues.get(ElaborationNodeDateCompare.DATE_FIRST) as Date;
        const dateSecond = inputValues.get(ElaborationNodeDateCompare.DATE_SECOND) as Date;
        
        const compareFirst  = new Date(dateFirst.getFullYear(), dateFirst.getMonth(), dateFirst.getDate()).getTime();
        const compareSecond = new Date(dateSecond.getFullYear(), dateSecond.getMonth(), dateSecond.getDate()).getTime();
        
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeDateCompare.FIRST_LESS, compareFirst < compareSecond
                ],
                [
                    ElaborationNodeDateCompare.EQUAL, compareFirst == compareSecond
                ],
                [
                    ElaborationNodeDateCompare.FIRST_GREATER, compareFirst > compareSecond
                ]
            ]);
    }
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that compares
 *  two times of day, and results in whether the first comes first, is equal or comes after the
 *  second.
 */
export class ElaborationNodeTimeCompare extends ElaborationNode {
    
    /** The input name for the first time. */
    private static readonly TIME_FIRST  = "First value";
    /** The input name for the second time. */
    private static readonly TIME_SECOND = "Second value";
    
    /** The output flag that tells if the first time comes before the second. */
    private static readonly FIRST_LESS    = "First is less";
    /** The output flag that tells if the first time is equal to the second. */
    private static readonly EQUAL         = "Equal";
    /** The output flag that tells if the first time comes after the second. */
    private static readonly FIRST_GREATER = "First is greater";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.TIME_COMPARE);
        this.inputs  = [
            new Datum(ElaborationNodeTimeCompare.TIME_FIRST, DatumType.TIME, false),
            new Datum(ElaborationNodeTimeCompare.TIME_SECOND, DatumType.TIME, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeTimeCompare.FIRST_LESS, DatumType.BOOLEAN, false),
            new Datum(ElaborationNodeTimeCompare.EQUAL, DatumType.BOOLEAN, false),
            new Datum(ElaborationNodeTimeCompare.FIRST_GREATER, DatumType.BOOLEAN, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const timeFirst  = inputValues.get(ElaborationNodeTimeCompare.TIME_FIRST) as Date;
        const timeSecond = inputValues.get(ElaborationNodeTimeCompare.TIME_SECOND) as Date;
        
        const compareFirst  = new Date(2000, 0, 1, timeFirst.getHours(), timeFirst.getMinutes(), timeFirst.getSeconds()).getTime();
        const compareSecond = new Date(2000, 0, 1, timeSecond.getHours(), timeSecond.getMinutes(), timeSecond.getSeconds()).getTime();
        
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeTimeCompare.FIRST_LESS, compareFirst < compareSecond
                ],
                [
                    ElaborationNodeTimeCompare.EQUAL, compareFirst == compareSecond
                ],
                [
                    ElaborationNodeTimeCompare.FIRST_GREATER, compareFirst > compareSecond
                ]
            ]);
    }
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that
 *  compares two dates + time, and results in whether the first comes first, is equal or
 *  comes after the second.
 */
export class ElaborationNodeDateTimeCompare extends ElaborationNode {
    
    /** The input name for the first date + time. */
    private static readonly DATE_TIME_FIRST  = "First value";
    /** The input name for the second date + time. */
    private static readonly DATE_TIME_SECOND = "Second value";
    
    /** The output flag that tells if the first date + time comes before the second. */
    private static readonly FIRST_LESS    = "First is less";
    /** The output flag that tells if the first date + time comes after the second. */
    private static readonly EQUAL         = "Equal";
    /** The output flag that tells if the first date + time is equal to the second. */
    private static readonly FIRST_GREATER = "First is greater";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.DATE_TIME_COMPARE);
        this.inputs  = [
            new Datum(ElaborationNodeDateTimeCompare.DATE_TIME_FIRST, DatumType.DATE_TIME, false),
            new Datum(ElaborationNodeDateTimeCompare.DATE_TIME_SECOND, DatumType.DATE_TIME, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeDateTimeCompare.FIRST_LESS, DatumType.BOOLEAN, false),
            new Datum(ElaborationNodeDateTimeCompare.EQUAL, DatumType.BOOLEAN, false),
            new Datum(ElaborationNodeDateTimeCompare.FIRST_GREATER, DatumType.BOOLEAN, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const dateTimeFirst  = inputValues.get(ElaborationNodeDateTimeCompare.DATE_TIME_FIRST) as Date;
        const dateTimeSecond = inputValues.get(ElaborationNodeDateTimeCompare.DATE_TIME_SECOND) as Date;
        
        const compareFirst  = new Date(
            dateTimeFirst.getFullYear(), dateTimeFirst.getMonth(), dateTimeFirst.getDate(),
            dateTimeFirst.getHours(), dateTimeFirst.getMinutes(), dateTimeFirst.getSeconds()
        ).getTime();
        const compareSecond = new Date(
            dateTimeSecond.getFullYear(), dateTimeSecond.getMonth(), dateTimeSecond.getDate(),
            dateTimeSecond.getHours(), dateTimeSecond.getMinutes(), dateTimeSecond.getSeconds()
        ).getTime();
        
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeDateTimeCompare.FIRST_LESS, compareFirst < compareSecond
                ],
                [
                    ElaborationNodeDateTimeCompare.EQUAL, compareFirst == compareSecond
                ],
                [
                    ElaborationNodeDateTimeCompare.FIRST_GREATER, compareFirst > compareSecond
                ]
            ]);
    }
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that creates
 *  a date + time of day value from separate date and time of day values.
 */
export class ElaborationNodeCombineDateTime extends ElaborationNode {
    
    /** The name of the input containing the date part. */
    private static readonly DATE = "Date";
    /** The name of the input containing the time part. */
    private static readonly TIME = "Time";
    
    /** The name of the output. */
    private static readonly OUTPUT = "Date Time";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.COMBINE_DATE_TIME);
        this.inputs  = [
            new Datum(ElaborationNodeCombineDateTime.DATE, DatumType.DATE, false),
            new Datum(ElaborationNodeCombineDateTime.TIME, DatumType.TIME, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeCombineDateTime.OUTPUT, DatumType.DATE_TIME, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const date = inputValues.get(ElaborationNodeCombineDateTime.DATE) as Date;
        const time = inputValues.get(ElaborationNodeCombineDateTime.TIME) as Date;
        
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeCombineDateTime.OUTPUT, new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate(),
                    time.getHours(),
                    time.getMinutes(),
                    time.getSeconds()
                )
                ]
            ]);
    }
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node
 *  that returns the UNIX epoch timestamp (milliseconds from 1970-01-01) from a
 *  date + time of day value.
 */
export class ElaborationNodeEpoch extends ElaborationNode {
    
    /** The name of the input. */
    private static readonly DATE = "Date Time";
    
    /** The name of the output. */
    private static readonly OUTPUT = "Epoch";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.EPOCH);
        this.inputs  = [
            new Datum(ElaborationNodeEpoch.DATE, DatumType.DATE_TIME, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeEpoch.OUTPUT, DatumType.NUMBER, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const date = inputValues.get(ElaborationNodeEpoch.DATE) as Date;
        
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeEpoch.OUTPUT,
                    date.getTime()
                ]
            ]);
    }
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that
 *  calculates all sun events' times on a specific date.
 */
export class ElaborationNodeSunEvents extends ElaborationNode {
    
    /** The name of the output. */
    private static readonly DATE = "Date";
    
    /** The name of the output that will contain the time of nautical dawn. */
    private static readonly NAUTICAL_DAWN   = "Nautical dawn";
    /** The name of the output that will contain the time of dawn. */
    private static readonly DAWN            = "Dawn";
    /** The name of the output that will contain the time of sunrise. */
    private static readonly SUNRISE         = "Sunrise";
    /** The name of the output that will contain the time of sunrise end. */
    private static readonly SUNRISE_END     = "Sunrise end";
    /** The name of the output that will contain the time of golden hour end. */
    private static readonly GOLDEN_HOUR_END = "Golden hour end";
    /** The name of the output that will contain the time of solar noon. */
    private static readonly SOLAR_NOON      = "Solar noon";
    /** The name of the output that will contain the time of golden hour. */
    private static readonly GOLDEN_HOUR = "Golden hour";
    /** The name of the output that will contain the time of sunset start. */
    private static readonly SUNSET_START    = "Sunset start";
    /** The name of the output that will contain the time of sunset. */
    private static readonly SUNSET          = "Sunset";
    /** The name of the output that will contain the time of dusk. */
    private static readonly DUSK            = "Dusk";
    /** The name of the output that will contain the time of nautical dusk. */
    private static readonly NAUTICAL_DUSK   = "Nautical dusk";
    /** The name of the output that will contain the time of night. */
    private static readonly NIGHT           = "Night";
    /** The name of the output that will contain the time of nadir. */
    private static readonly NADIR           = "Nadir";
    /** The name of the output that will contain the time of night end. */
    private static readonly NIGHT_END       = "Night end";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     */
    constructor(id: number) {
        super(id, ElaborationNodeCode.SUN_EVENTS);
        this.inputs  = [
            new Datum(ElaborationNodeSunEvents.DATE, DatumType.DATE, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeSunEvents.NAUTICAL_DAWN, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.DAWN, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.SUNRISE, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.SUNRISE_END, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.GOLDEN_HOUR_END, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.SOLAR_NOON, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.GOLDEN_HOUR, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.SUNSET_START, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.SUNSET, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.DUSK, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.NAUTICAL_DUSK, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.NIGHT, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.NADIR, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.NIGHT_END, DatumType.TIME, false)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const date = inputValues.get(ElaborationNodeSunEvents.DATE) as Date;
        
        const times = getTimes(
            date,
            ElaborationNodeSunEvents.coordinates.latitude,
            ElaborationNodeSunEvents.coordinates.longitude
        );
        
        return new Map<string, unknown>(
            [
                [ElaborationNodeSunEvents.DAWN, times.dawn],
                [ElaborationNodeSunEvents.DUSK, times.dusk],
                [ElaborationNodeSunEvents.GOLDEN_HOUR, times.goldenHour],
                [ElaborationNodeSunEvents.GOLDEN_HOUR_END, times.goldenHourEnd],
                [ElaborationNodeSunEvents.NADIR, times.nadir],
                [ElaborationNodeSunEvents.NAUTICAL_DAWN, times.nauticalDawn],
                [ElaborationNodeSunEvents.NAUTICAL_DUSK, times.nauticalDusk],
                [ElaborationNodeSunEvents.NIGHT, times.night],
                [ElaborationNodeSunEvents.NIGHT_END, times.nightEnd],
                [ElaborationNodeSunEvents.SOLAR_NOON, times.solarNoon],
                [ElaborationNodeSunEvents.SUNRISE, times.sunrise],
                [ElaborationNodeSunEvents.SUNRISE_END, times.sunriseEnd],
                [ElaborationNodeSunEvents.SUNSET, times.sunset],
                [ElaborationNodeSunEvents.SUNSET_START, times.sunsetStart]
            ]);
    }
    
    /**
     * The current locations's global coordinate.
     */
    public static coordinates: {
        latitude: number,
        longitude: number,
    } = {
        latitude:  0,
        longitude: 0
    };
    
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that stores a value
 *  in permanent storage so it can be retrieved in a future elaboration of the mix through a
 *  {@link ElaborationNodeRetrieve|`ElaborationNodeRetrieve`} node. Different values can be saved
 *  independently with a different name.
 */
export class ElaborationNodeSave extends TypedNullMarkedElaborationNode {
    
    /** The name of the input containing the value to be saved. */
    private static readonly VALUE: string = "Value";
    /** The name of the input containing the name of the value to be saved. */
    private static readonly NAME: string  = "Name";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Contains the value to be saved, calculated after the last time {@link ElaborationNodeSave#calculate|`calculate`}
     * was called.
     */
    private _lastElaborationSave?: { name: string, value: unknown };
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     * @param {TypedNullMarkedElaborationNodeOptions} options - Value for {@link TypedNullMarkedElaborationNode#options|`options`}.
     */
    constructor(id: number, options: TypedNullMarkedElaborationNodeOptions) {
        super(id, ElaborationNodeCode.SAVE, options);
        this.inputs  = [
            new Datum(ElaborationNodeSave.VALUE, options.dataType, options.nullable),
            new Datum(ElaborationNodeSave.NAME, DatumType.STRING, false)
        ];
        this.outputs = [];
    }
    
    /**
     * Contains the value to be saved, calculated after the last time the
     * node elaboration was calculated.
     */
    public get lastElaborationSave(): { name: string, value: unknown } | null {
        if (this._lastElaborationSave) {
            return {
                name:  this._lastElaborationSave.name,
                value: this._lastElaborationSave.value
            };
        } else {
            return null;
        }
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const value = inputValues.get(ElaborationNodeSave.VALUE);
        const name  = inputValues.get(ElaborationNodeSave.NAME) as string;
        this._lastElaborationSave = {
            name,
            value
        };
        return new Map<string, unknown>();
    }
    
}

/**
 * Implementation of {@link ElaborationNode|`ElaborationNode`} representing a node that
 * retrieves a value from permanent storage that was previously stored with a
 * {@link ElaborationNodeSave|`EvaluationNodeSave`} node.
 */
export class ElaborationNodeRetrieve extends TypedNullMarkedElaborationNode {
    
    /** The name of the input containing the value to be retrieved. */
    private static readonly NAME: string    = "Name";
    /** The name of the input containing the default value in case that value was never stored. */
    private static readonly DEFAULT: string = "Default";
    
    /** The name of the output. */
    private static readonly VALUE: string = "Value";
    
    /**
     * @inheritDoc
     */
    public readonly inputs: readonly Datum[];
    
    /**
     * @inheritDoc
     */
    public readonly outputs: readonly Datum[];
    
    /**
     * Contains all the values stored in the system, should be set with the saved values
     * before computing the node.
     */
    public allSaves?: MixingStorage;
    
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} id - Value for {@link ElaborationNode#id|`id`}.
     * @param {TypedNullMarkedElaborationNodeOptions} options - Value for {@link TypedNullMarkedElaborationNode#options|`options`}.
     */
    constructor(id: number, options: TypedNullMarkedElaborationNodeOptions) {
        super(id, ElaborationNodeCode.RETRIEVE, options);
        this.inputs  = [
            new Datum(ElaborationNodeRetrieve.NAME, DatumType.STRING, false),
            new Datum(ElaborationNodeRetrieve.DEFAULT, options.dataType, options.nullable)
        ];
        this.outputs = [
            new Datum(ElaborationNodeRetrieve.VALUE, options.dataType, options.nullable)
        ];
    }
    
    /**
     * @inheritDoc
     */
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const defaultValue = inputValues.get(ElaborationNodeRetrieve.DEFAULT);
        const name         = inputValues.get(ElaborationNodeRetrieve.NAME) as string;
        let value: unknown;
        if (this.allSaves?.[this.options.dataType].has(name) == true) {
            value = this.allSaves[this.options.dataType].get(name);
            if (!this.options.nullable && value == null) {
                value = defaultValue;
            }
        } else {
            value = defaultValue;
        }
        return new Map<string, unknown>([
                                            [ElaborationNodeRetrieve.VALUE, value]
                                        ]);
    }
    
}
