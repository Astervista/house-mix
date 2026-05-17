/**
 * This module contains useful constants about {@link Mix|`Mix`es}.
 *
 * @module
 */
import {DatumOrigin, DatumType, ExportedDatum} from '@common/mixing/mix/datum';
import {
    ArbitraryInputsElaborationNodeImplementationConstructor,
    ElaborationNodeAddition,
    ElaborationNodeAllTypesTest,
    ElaborationNodeAnd,
    ElaborationNodeBinaryChoice,
    ElaborationNodeBuffer,
    ElaborationNodeClamp,
    ElaborationNodeCode,
    ElaborationNodeCombineDateTime,
    ElaborationNodeCycle,
    ElaborationNodeDateCompare,
    ElaborationNodeDateFromValues,
    ElaborationNodeDateTimeCompare,
    ElaborationNodeDateTimeFromValues,
    ElaborationNodeDateTimeValues,
    ElaborationNodeDateValues,
    ElaborationNodeDivision,
    ElaborationNodeEncoder,
    ElaborationNodeEpoch,
    ElaborationNodeEqualityCheck,
    ElaborationNodeExtractColorTemp,
    ElaborationNodeExtractHSL,
    ElaborationNodeExtractHSV,
    ElaborationNodeExtractRGB,
    ElaborationNodeExtractXY,
    ElaborationNodeFromColorTemp,
    ElaborationNodeFromHSL,
    ElaborationNodeFromHSV,
    ElaborationNodeFromRGB,
    ElaborationNodeFromXY,
    ElaborationNodeGreaterThan,
    ElaborationNodeImplementationConstructor,
    ElaborationNodeLerp,
    ElaborationNodeLessThan,
    ElaborationNodeMax,
    ElaborationNodeMin,
    ElaborationNodeModulo,
    ElaborationNodeMultipleChoice,
    ElaborationNodeMultiplication,
    ElaborationNodeNot,
    ElaborationNodeNullGuard,
    ElaborationNodeOr,
    ElaborationNodeRetrieve,
    ElaborationNodeSave,
    ElaborationNodeSubtraction,
    ElaborationNodeSunEvents,
    ElaborationNodeTimeCompare,
    ElaborationNodeTimeFromValues,
    ElaborationNodeTimeout,
    ElaborationNodeTimeoutImplementationConstructor,
    ElaborationNodeTimeValues,
    ElaborationNodeXor,
    TypedElaborationNodeImplementationConstructor,
    TypedNullMarkedElaborationNodeImplementationConstructor
} from '@common/mixing/mix/elaboration-node';
import {isDevMode} from '@angular/core';
import {SYSTEM_ORIGIN_DISPLAY} from '../system/constants';
import {SystemOrigin} from '@common/system/constants';
import {Point} from '@angular/cdk/drag-drop';

// noinspection ES6UnusedImports
import type {Mix} from '@common/mixing/mix/mix';
// noinspection ES6UnusedImports
import type {MixComponent} from './mix/mix.component';
// noinspection ES6UnusedImports
import type {Datum} from '@common/mixing/mix/datum';
// noinspection ES6UnusedImports
import type {ArbitraryInputsElaborationNode, ElaborationNode, TypedElaborationNode, TypedNullMarkedElaborationNode} from '@common/mixing/mix/elaboration-node';

/**
 * The displayable string version of each {@link DatumType|`DatumType`}.
 */
export
/**
 * The displayable string version of each {@link DatumType|`DatumType`}.
 */
const DATUM_TYPE_DISPLAY: Record<DatumType, string> = {
    [DatumType.BOOLEAN]:    'Boolean',
    [DatumType.NUMBER]:     'Number',
    [DatumType.STRING]:     'Text',
    [DatumType.COLOR]:      'Color',
    [DatumType.COLOR_TEMP]: 'Color temperature',
    [DatumType.TIME]:       'Time',
    [DatumType.DATE]:       'Date',
    [DatumType.DATE_TIME]:  'Date and Time'
};

/**
 * Get the CSS variable containing the color specific to a connector of a {@link Datum|`Datum`}
 * of {@link Datum#type|`type`} {@link DatumType|`DatumType`}.
 *
 * @param {DatumType} type - The {@link DatumType|`DatumType`}.
 * @returns {string} The name of the CSS variable.
 */
export function getColorVarNameForType(type: DatumType): string {
    return `var(--connector-type-${type.toLowerCase().replace('_', '-')}-color)`;
}

/**
 * Information about an {@link ElaborationNode|`ElaborationNode`} implementation.
 */
export type ElaborationNodeLibraryItem = {
    /** The constructor of this implementation of {@link ElaborationNode|`ElaborationNode`}. */
    constructor: ElaborationNodeImplementationConstructor;
    /** A description for this implementation of {@link ElaborationNode|`ElaborationNode`}, to be shown in the UI. */
    description: string;
    /** The {@link ElaborationNodeCode|`ElaborationNodeCode`} of this implementation of {@link ElaborationNode|`ElaborationNode`}. */
    code: ElaborationNodeCode;
    /** This is a simple {@link ElaborationNode|`ElaborationNode`}. */
    special: false;
} | {
    /** The constructor of this implementation of {@link ElaborationNode|`ElaborationNode`}. */
    constructor: ElaborationNodeTimeoutImplementationConstructor;
    /** A description for this implementation of {@link ElaborationNode|`ElaborationNode`}, to be shown in the UI. */
    description: string;
    /** The {@link ElaborationNodeCode|`ElaborationNodeCode`} of this implementation of {@link ElaborationNode|`ElaborationNode`}. */
    code: ElaborationNodeCode;
    /** This implementation extends a generic subclass of {@link ElaborationNode|`ElaborationNode`}. */
    special: true;
    /** This is a {@link ElaborationNodeTimeout|`ElaborationNodeTimeout`}. */
    isTimeout: true;
    /** This is not a {@link TypedElaborationNode|`TypedElaborationNode`}. */
    isTyped: false,
    /** This is not a {@link TypedNullMarkedElaborationNode|`TypedNullMarkedElaborationNode}. */
    nullMarked: false,
} | {
    /** The constructor of this implementation of {@link ElaborationNode|`ElaborationNode`}. */
    constructor: TypedElaborationNodeImplementationConstructor;
    /** A description for this implementation of {@link ElaborationNode|`ElaborationNode`}, to be shown in the UI. */
    description: string;
    /** The {@link ElaborationNodeCode|`ElaborationNodeCode`} of this implementation of {@link ElaborationNode|`ElaborationNode`}. */
    code: ElaborationNodeCode;
    /** This implementation extends a generic subclass of {@link ElaborationNode|`ElaborationNode`}. */
    special: true,
    /** This is a {@link TypedElaborationNode|`TypedElaborationNode`}. */
    isTyped: true,
    /** This is not a {@link TypedNullMarkedElaborationNode|`TypedNullMarkedElaborationNode}. */
    nullMarked: false,
    /** If `true`, `dataType` cannot be chosen by the user, but it's fixed to the default. */
    forceDatumType?: boolean,
    /** The default value for `dataType`. */
    datumType: DatumType;
    /** This is a {@link ElaborationNodeTimeout|`ElaborationNodeTimeout`}. */
    isTimeout: false;
} | {
    /** The constructor of this implementation of {@link ElaborationNode|`ElaborationNode`}. */
    constructor: TypedNullMarkedElaborationNodeImplementationConstructor;
    /** A description for this implementation of {@link ElaborationNode|`ElaborationNode`}, to be shown in the UI. */
    description: string;
    /** The {@link ElaborationNodeCode|`ElaborationNodeCode`} of this implementation of {@link ElaborationNode|`ElaborationNode`}. */
    code: ElaborationNodeCode;
    /** This implementation extends a generic subclass of {@link ElaborationNode|`ElaborationNode`}. */
    special: true,
    /** This is a {@link TypedElaborationNode|`TypedElaborationNode`}. */
    isTyped: true,
    /** This is a {@link TypedNullMarkedElaborationNode|`TypedNullMarkedElaborationNode}. */
    nullMarked: true,
    /** This is not a {@link ArbitraryInputsElaborationNode|`ArbitraryInputsElaborationNode}. */
    arbitraryNumber: false,
    /** If `true`, `dataType` cannot be chosen by the user, but it's fixed to the default. */
    forceDatumType?: boolean,
    /** If `true`, `nullable` cannot be chosen by the user, but it's fixed to the default. */
    forceNullable?: boolean,
    /** The default value for `dataType`. */
    datumType: DatumType;
    /** The default value for `nullable`. */
    nullableMark: boolean
    /** This is a {@link ElaborationNodeTimeout|`ElaborationNodeTimeout`}. */
    isTimeout: false;
} | {
    /** The constructor of this implementation of {@link ElaborationNode|`ElaborationNode`}. */
    constructor: ArbitraryInputsElaborationNodeImplementationConstructor;
    /** A description for this implementation of {@link ElaborationNode|`ElaborationNode`}, to be shown in the UI. */
    description: string;
    /** The {@link ElaborationNodeCode|`ElaborationNodeCode`} of this implementation of {@link ElaborationNode|`ElaborationNode`}. */
    code: ElaborationNodeCode;
    /** This implementation extends a generic subclass of {@link ElaborationNode|`ElaborationNode`}. */
    special: true,
    /** This is a {@link TypedElaborationNode|`TypedElaborationNode`}. */
    isTyped: true,
    /** This is a {@link TypedNullMarkedElaborationNode|`TypedNullMarkedElaborationNode}. */
    nullMarked: true,
    /** This is a {@link ArbitraryInputsElaborationNode|`ArbitraryInputsElaborationNode}. */
    arbitraryNumber: true,
    /** If `true`, `dataType` cannot be chosen by the user, but it's fixed to the default. */
    forceDatumType?: boolean,
    /** If `true`, `nullable` cannot be chosen by the user, but it's fixed to the default. */
    forceNullable?: boolean,
    /** The default value for `dataType`. */
    datumType: DatumType;
    /** The default value for `nullable`. */
    nullableMark: boolean
    /** This is a {@link ElaborationNodeTimeout|`ElaborationNodeTimeout`}. */
    isTimeout: false;
};

/**
 * The displayable string version of each {@link ElaborationNodeCode|`ElaborationNodeCode`}.
 */
export
/**
 * The displayable string version of each {@link ElaborationNodeCode|`ElaborationNodeCode`}.
 */
const ELABORATION_NODE_DISPLAY_NAME: Record<ElaborationNodeCode, string> = {
    TEST:                  'Test',
    ADDITION:              'Addition',
    SUBTRACTION:           'Subtraction',
    MULTIPLICATION:        'Multiplication',
    DIVISION:              'Division',
    MODULO:                'Modulo',
    MAX:                   'Maximum',
    MIN:                   'Minimum',
    NULL_GUARD:            'Null guard',
    EQUALITY_CHECK:        'Equality check',
    GREATER_THAN:          'Greater than',
    LESS_THAN:             'Less than',
    CYCLE:                 'Cycle',
    CLAMP:                 'Clamp value',
    LERP:                  'Linear interpolation',
    AND:                   'And',
    OR:                    'Or',
    XOR:                   'Exclusive or',
    NOT:                   'Not',
    BUFFER:                'Buffer',
    BINARY_CHOICE:         'Binary choice',
    MULTIPLE_CHOICE:       'Multiple choice',
    ENCODER:               'Encoder',
    EXTRACT_RGB:           'Extract RGB',
    EXTRACT_HSL:           'Extract_HSL',
    EXTRACT_HSV:           'Extract_HSV',
    EXTRACT_XY:            'Extract_XY',
    EXTRACT_COLOR_TEMP:    'Extract color temp',
    FROM_RGB:              'Color from RGB',
    FROM_HSL:              'Color from HSL',
    FROM_HSV:              'Color from HSV',
    FROM_XY:               'Color from XY',
    FROM_COLOR_TEMP:       'Color temp from K',
    TIMEOUT:               'Timeout',
    DATE_VALUES:           'Values from date',
    TIME_VALUES:           'Values from time',
    DATE_TIME_VALUES:      'Values from date time',
    DATE_FROM_VALUES:      'Date from values',
    TIME_FROM_VALUES:      'Time from values',
    DATE_COMPARE:          'Compare dates',
    TIME_COMPARE:          'Compare times',
    DATE_TIME_COMPARE:     'Compare date times',
    DATE_TIME_FROM_VALUES: 'Date Time from values',
    COMBINE_DATE_TIME:     'Combine date and time',
    EPOCH:                 'Get epoch time',
    SUN_EVENTS:            'Sun event times',
    SAVE:                  'Store a value',
    RETRIEVE:              'Retrieve a value'
};

/**
 * A collection of {@link ElaborationNodeLibraryItem|`ElaborationNodeLibraryItems`} representing
 * {@link ElaborationNode|`ElaborationNode`s} with similar function.
 */
export interface ElaborationNodeLibrarySection {
    /** The name of the section, to be shown in the UI. */
    sectionName: string,
    /**
     * {@link ElaborationNodeLibraryItem|`ElaborationNodeLibraryItems`} representing
     * {@link ElaborationNode|`ElaborationNode`s} that belong to this section.
     */
    nodes: ElaborationNodeLibraryItem[]
}

/**
 * All the instantiable subclasses of {@link ElaborationNode|`ElaborationNode`}, organized in
 * {@link ElaborationNodeLibrarySection|`ElaborationNodeLibrarySection`s} of {@link ElaborationNodeLibraryItem|`ElaborationNodeLibraryItem`s}.
 */
export
/**
 * All the instantiable subclasses of {@link ElaborationNode|`ElaborationNode`}, organized in
 * {@link ElaborationNodeLibrarySection|`ElaborationNodeLibrarySection`s} of {@link ElaborationNodeLibraryItem|`ElaborationNodeLibraryItem`s}.
 */
const ELABORATION_NODE_LIBRARY: ElaborationNodeLibrarySection[] = [
    {
        sectionName: 'Math',
        nodes:       [
            {
                constructor: ElaborationNodeAddition,
                description: 'Adds two numbers',
                code:        ElaborationNodeCode.ADDITION,
                special:     false
            },
            {
                constructor: ElaborationNodeSubtraction,
                description: 'Subtracts one number from another',
                code:        ElaborationNodeCode.SUBTRACTION,
                special:     false
            },
            {
                constructor: ElaborationNodeMultiplication,
                description: 'Multiplies two numbers',
                code:        ElaborationNodeCode.MULTIPLICATION,
                special:     false
            },
            {
                constructor: ElaborationNodeDivision,
                description: 'Divides one number by another',
                code:        ElaborationNodeCode.DIVISION,
                special:     false
            },
            {
                constructor: ElaborationNodeModulo,
                description: 'Returns the "Value" (mod "Modulo"). Note that this follows the mathematical definition of modulo, not the computer science definition (modulo of negative ' +
                             'numbers is positive)',
                code:        ElaborationNodeCode.MODULO,
                special:     false
            },
            {
                constructor: ElaborationNodeMax,
                description: 'Returns the maximum between two numbers',
                code:        ElaborationNodeCode.MAX,
                special:     false
            },
            {
                constructor: ElaborationNodeMin,
                description: 'Returns the minimum between two numbers',
                code:        ElaborationNodeCode.MIN,
                special:     false
            },
            {
                constructor: ElaborationNodeGreaterThan,
                description: 'Checks if the first number is greater than the second. When "Inclusive" input is true, equal values result in a true response, false otherwise.',
                code:        ElaborationNodeCode.GREATER_THAN,
                special:     false
            },
            {
                constructor: ElaborationNodeLessThan,
                description: 'Checks if the first number is less than the second. When "Inclusive" input is true, equal values result in a true response, false otherwise.',
                code:        ElaborationNodeCode.LESS_THAN,
                special:     false
            },
            {
                constructor: ElaborationNodeCycle,
                description: 'Cycles a number between values in a closed loop, incrementing or decrementing the value by one depending on the "Forward" input. Upon reaching the ' +
                             '"Cycle length" value, the value is reset to the start. "Start from 0" decides whether the values go from 0 to "Cycle length" - 1, or from 1 ' +
                             'to "Cycle length". "Cycle length" values less than 1 are considered as 1, non-integer values are allowed and the fractional part is kept (so 4.5 ' +
                             'with a cycle of 5 gets reset to 0.5). Values out of range are reduced to the range via modulo "Cycle length".',
                code:        ElaborationNodeCode.CYCLE,
                special:     false
            },
            {
                constructor: ElaborationNodeClamp,
                description: 'Restricts a number between two bounds. If a value is null, that side is not checked',
                code:        ElaborationNodeCode.CLAMP,
                special:     false
            },
            {
                constructor: ElaborationNodeLerp,
                description: 'Interpolates a value between two bounds. If the value is 0, the result is the start, if the value is 1 the result is the end, ' +
                             'all the others values are proportionally distributed. This does not restrict the result, use a clamping node to restrict.',
                code:        ElaborationNodeCode.LERP,
                special:     false
            }
        ]
    },
    {
        sectionName: 'Boolean',
        nodes:       [
            {
                constructor:     ElaborationNodeAnd,
                description:     'Returns the logical and of all the inputs. The output is true if all the inputs are true, otherwise it\'s false',
                code:            ElaborationNodeCode.AND,
                forceDatumType:  true,
                forceNullable:   true,
                datumType:       DatumType.BOOLEAN,
                nullableMark:    false,
                special:         true,
                isTyped:         true,
                nullMarked:      true,
                arbitraryNumber: true,
                isTimeout:       false
            },
            {
                constructor:     ElaborationNodeOr,
                description:     'Returns the logical or of all the inputs. The output is true if at least one of the inputs is true, otherwise it\'s false',
                code:            ElaborationNodeCode.OR,
                forceDatumType:  true,
                forceNullable:   true,
                datumType:       DatumType.BOOLEAN,
                nullableMark:    false,
                special:         true,
                isTyped:         true,
                nullMarked:      true,
                arbitraryNumber: true,
                isTimeout:       false
            },
            {
                constructor:     ElaborationNodeXor,
                description:     'Returns the exclusive or of all the inputs. The output is true if only one of the inputs is true, otherwise it\'s false',
                code:            ElaborationNodeCode.XOR,
                forceDatumType:  true,
                forceNullable:   true,
                datumType:       DatumType.BOOLEAN,
                nullableMark:    false,
                special:         true,
                isTyped:         true,
                nullMarked:      true,
                arbitraryNumber: true,
                isTimeout:       false
            },
            {
                constructor: ElaborationNodeNot,
                description: 'Return the negated value of the input',
                code:        ElaborationNodeCode.NOT,
                special:     false
            }
        ]
    },
    {
        sectionName: 'Control flow',
        nodes:       [
            {
                constructor:     ElaborationNodeBuffer,
                description:     'This node simply repeats any value it gets presented with. It may be useful in groups to fuse multiple of the same input into one.',
                code:            ElaborationNodeCode.BUFFER,
                datumType:       DatumType.BOOLEAN,
                nullableMark:    false,
                special:         true,
                isTyped:         true,
                nullMarked:      true,
                arbitraryNumber: false,
                isTimeout:       false
            },
            {
                constructor: ElaborationNodeNullGuard,
                description: 'Assures a nullable parameter is transformed into a non-null parameter, returning a non-null fallback value if null',
                code:        ElaborationNodeCode.NULL_GUARD,
                datumType:   DatumType.NUMBER,
                special:     true,
                isTyped:     true,
                nullMarked:  false,
                isTimeout:   false
            },
            {
                constructor: ElaborationNodeEqualityCheck,
                description: 'Checks whether two values are equivalent, even if coming from two different elaborations.',
                code:        ElaborationNodeCode.EQUALITY_CHECK,
                datumType:   DatumType.NUMBER,
                special:     true,
                isTyped:     true,
                nullMarked:  false,
                isTimeout:   false
            },
            {
                constructor:     ElaborationNodeBinaryChoice,
                description:     'Selects one of two values, depending on the value of "Choose first?". If it\'s true, the first is chosen, otherwise the second one is.',
                code:            ElaborationNodeCode.BINARY_CHOICE,
                datumType:       DatumType.NUMBER,
                nullableMark:    false,
                special:         true,
                isTyped:         true,
                nullMarked:      true,
                arbitraryNumber: false,
                isTimeout:       false
            },
            {
                constructor:     ElaborationNodeMultipleChoice,
                description:     'Selects a value among a series of options, by index. Indexes outside of range loop, non-integer indexes get rounded.',
                code:            ElaborationNodeCode.MULTIPLE_CHOICE,
                datumType:       DatumType.STRING,
                nullableMark:    false,
                special:         true,
                isTyped:         true,
                nullMarked:      true,
                arbitraryNumber: true,
                isTimeout:       false
            },
            {
                constructor:     ElaborationNodeEncoder,
                description:     'Returns which one of the inputs is true, returning its position (0-indexed). So if the first is true, the encoded value is 0, and so on. ' +
                                 'In case of multiple true values, the highest-indexed or lowest-indexed one is the one chosen, depending on the dominance flag, and the conflict ' +
                                 'flag results true. If none is selected, -1 is returned and the unset flag results true.',
                code:            ElaborationNodeCode.ENCODER,
                forceDatumType:  true,
                forceNullable:   true,
                datumType:       DatumType.BOOLEAN,
                nullableMark:    false,
                special:         true,
                isTyped:         true,
                nullMarked:      true,
                arbitraryNumber: true,
                isTimeout:       false
            }
        ]
    },
    {
        sectionName: 'Color',
        nodes:       [
            {
                constructor: ElaborationNodeExtractRGB,
                description: 'Extract the single red, green and blue components from a color. NOTE: If the color is in the XY space, it gets converted (lossily).',
                code:        ElaborationNodeCode.EXTRACT_RGB,
                special:     false
            },
            {
                constructor: ElaborationNodeExtractHSL,
                description: 'Extract the single hue, saturation and lightness components from a color. NOTE: If the color is in the XY space, it gets converted (lossily).',
                code:        ElaborationNodeCode.EXTRACT_HSL,
                special:     false
            },
            {
                constructor: ElaborationNodeExtractHSV,
                description: 'Extract the single hue, saturation and value (i.e brightness) components from a color. NOTE: If the color is in the XY space, it gets converted (lossily).',
                code:        ElaborationNodeCode.EXTRACT_HSV,
                special:     false
            },
            {
                constructor: ElaborationNodeExtractXY,
                description: 'Extract the single X/Y (CIE 1931 color space) components from a color. NOTE: If the color is in the RGB space, it gets converted (lossily).',
                code:        ElaborationNodeCode.EXTRACT_XY,
                special:     false
            },
            {
                constructor: ElaborationNodeExtractColorTemp,
                description: 'Transform extract the temperature (in Kelvin) from a color temperature value',
                code:        ElaborationNodeCode.EXTRACT_COLOR_TEMP,
                special:     false
            },
            {
                constructor: ElaborationNodeFromRGB,
                description: 'Creates a color from the single red, green and blue components',
                code:        ElaborationNodeCode.FROM_RGB,
                special:     false
            },
            {
                constructor: ElaborationNodeFromHSL,
                description: 'Creates a color from the single hue, saturation and lightness components.',
                code:        ElaborationNodeCode.FROM_HSL,
                special:     false
            },
            {
                constructor: ElaborationNodeFromHSV,
                description: 'Creates a color from the single hue, saturation and value (i.e brightness) components.',
                code:        ElaborationNodeCode.FROM_HSV,
                special:     false
            },
            {
                constructor: ElaborationNodeFromXY,
                description: 'Creates a color from the single X/Y (CIE 1931 color space) components.',
                code:        ElaborationNodeCode.FROM_XY,
                special:     false
            },
            {
                constructor: ElaborationNodeFromColorTemp,
                description: 'Transform a number (temperature in Kelvin) into a color temperature value',
                code:        ElaborationNodeCode.FROM_COLOR_TEMP,
                special:     false
            }
        ]
    },
    {
        sectionName: 'Date and time',
        nodes:       [
            {
                constructor: ElaborationNodeTimeout,
                description: 'When "Reset" is true, a new calculation of the mix will be scheduled in "Timeout" seconds, after which the output "Triggered" will be true (only once). ' +
                             'Setting "Reset" to true before the previous timeout has expired will cancel it, and the next triggering will be scheduled calculating the timeout from' +
                             'the most recent reset.',
                code:        ElaborationNodeCode.TIMEOUT,
                special:     true,
                isTimeout:   true,
                isTyped:     false,
                nullMarked:  false
            },
            {
                constructor: ElaborationNodeDateValues,
                description: 'Exposes the single components of a date. Day of the week is a number from 1 (Monday) to 7 (Sunday)',
                code:        ElaborationNodeCode.DATE_VALUES,
                special:     false
            },
            {
                constructor: ElaborationNodeTimeValues,
                description: 'Exposes the single components from a time of day value',
                code:        ElaborationNodeCode.TIME_VALUES,
                special:     false
            },
            {
                constructor: ElaborationNodeDateTimeValues,
                description: 'Exposes the single components of a date + time of day value. Day of the week is a number from 1 (Monday) to 7 (Sunday)',
                code:        ElaborationNodeCode.DATE_TIME_VALUES,
                special:     false
            },
            {
                constructor: ElaborationNodeDateFromValues,
                description: 'Creates a date from the single components',
                code:        ElaborationNodeCode.DATE_FROM_VALUES,
                special:     false
            },
            {
                constructor: ElaborationNodeTimeFromValues,
                description: 'Creates a time of day value from the single components',
                code:        ElaborationNodeCode.TIME_FROM_VALUES,
                special:     false
            },
            {
                constructor: ElaborationNodeDateTimeFromValues,
                description: 'Creates a date + time of day value from the single components',
                code:        ElaborationNodeCode.DATE_TIME_FROM_VALUES,
                special:     false
            },
            {
                constructor: ElaborationNodeDateCompare,
                description: 'Compares two dates, and results in whether the first comes first, is equal or comes after the second',
                code:        ElaborationNodeCode.DATE_COMPARE,
                special:     false
            },
            {
                constructor: ElaborationNodeTimeCompare,
                description: 'Compares two times of day, and results in whether the first comes first, is equal or comes after the second',
                code:        ElaborationNodeCode.TIME_COMPARE,
                special:     false
            },
            {
                constructor: ElaborationNodeDateTimeCompare,
                description: 'Compares two dates + time, and results in whether the first comes first, is equal or comes after the second',
                code:        ElaborationNodeCode.DATE_TIME_COMPARE,
                special:     false
            },
            {
                constructor: ElaborationNodeCombineDateTime,
                description: 'Creates a date + time of day value from separate date and time of day values',
                code:        ElaborationNodeCode.COMBINE_DATE_TIME,
                special:     false
            },
            {
                constructor: ElaborationNodeEpoch,
                description: 'Returns the UNIX epoch timestamp (milliseconds from 1970-01-01) from a date + time of day value',
                code:        ElaborationNodeCode.EPOCH,
                special:     false
            },
            {
                constructor: ElaborationNodeSunEvents,
                description: 'Calculates all sun events\' times on a specific date',
                code:        ElaborationNodeCode.SUN_EVENTS,
                special:     false
            }
        ]
    },
    {
        sectionName: 'Storage',
        nodes:       [
            {
                constructor:     ElaborationNodeSave,
                description:     'Stores a value in permanent storage so it can be retrieved in a future elaboration of the mix through a "Retrieve a value" node.' +
                                 ' Different values can be saved independently with a different name',
                code:            ElaborationNodeCode.SAVE,
                datumType:       DatumType.BOOLEAN,
                nullableMark:    false,
                special:         true,
                isTyped:         true,
                nullMarked:      true,
                arbitraryNumber: false,
                isTimeout:       false
            },
            {
                constructor:     ElaborationNodeRetrieve,
                description:     'Retrieves a value from permanent storage that was previously stored with a "Store a value" node' +
                                 ' Different values can be saved independently with a different name',
                code:            ElaborationNodeCode.RETRIEVE,
                datumType:       DatumType.BOOLEAN,
                nullableMark:    false,
                special:         true,
                isTyped:         true,
                nullMarked:      true,
                arbitraryNumber: false,
                isTimeout:       false
            }
        ]
    }
];

/**
 * The {@link ElaborationNodeLibraryItem|`ElaborationNodeLibraryItem`} relative to {@link ElaborationNodeAllTypesTest|`ElaborationNodeAllTypesTest`}.
 */
const testNode: ElaborationNodeLibraryItem =
          {
              constructor: ElaborationNodeAllTypesTest,
              description: 'Test node',
              code:        ElaborationNodeCode.TEST,
              special:     false
          };

if (isDevMode()) {
    ELABORATION_NODE_LIBRARY.push(
        {
            sectionName: 'test',
            nodes:       [testNode]
        });
}

/** The displayable string version of each {@link DatumOrigin|`DatumOrigin`}. */
export
/** The displayable string version of each {@link DatumOrigin|`DatumOrigin`}. */
const DATUM_ORIGIN_DISPLAY: Record<DatumOrigin, string> = {
    GROUP:         'Group mixes output',
    SENSOR_DATA:   'Raw data from sensors',
    SENSOR_UPDATE: 'Sensor update status',
    SENSOR:        'Sensor mixes outputs',
    SYSTEM:        'System',
    CENTER:        'Center mixes outputs'
};

/**
 * Extract the correct display string for an {@link ExportedDatum|`ExportedDatum`}'s {@link ExportedDatum#origin|`origin`}.
 *
 * @param {ExportedDatum} datum - The {@link ExportedDatum|`ExportedDatum`} to extract the {@link ExportedDatum#origin|`origin`} from.
 * @returns {string} - The correct display string.
 */
export function getExternalDatumOriginNameDisplay(datum: ExportedDatum): string {
    if (datum.origin == DatumOrigin.SYSTEM) {
        return (SYSTEM_ORIGIN_DISPLAY[datum.originName as SystemOrigin] as string | null) ?? origin;
    } else {
        return datum.originDisplayName ?? datum.originName;
    }
}

/** A line between two points. */
export interface Line {
    /** The starting point. */
    from: Point;
    /** The ending point. */
    to: Point;
}

/**
 * Create a value for a {@link SVGPathElement|`SVGPathElement`}'s `d` attribute to assign to a smooth curve between two points.
 * The curve has the control points coming off the start and end point in the specified main direction.
 *
 * @param {Point} from - The start point of the curve.
 * @param {Point} to - The end point of the curve.
 * @param {boolean} horizontal - The main direction of the curve.
 * @returns {string} - The path `d` value.
 */
export function graphConnectionSmoothPath(from: Point, to: Point, horizontal: boolean = true): string {
    if (horizontal) {
        const width      = to.x - from.x;
        const height     = Math.abs(to.y - from.y);
        const multiplier = width > 0 ? 0.3 : -0.7;
        return `M${from.x},${from.y}` +
               (height > MEASURES.CONNECTION_WIDTH * 5
                   ?
               `C${from.x + width * multiplier},${from.y},` +
               `${to.x - width * multiplier},${to.y},`
                   :
                   `L`) +
               `${to.x},${to.y}`;
    } else {
        const width      = Math.abs(to.x - from.x);
        const height     = to.y - from.y;
        const multiplier = height > 0 ? 0.5 : -0.7;
        return `M${from.x},${from.y}` +
               (width > MEASURES.CONNECTION_WIDTH * 5
                   ?
               `C${from.x},${from.y + height * multiplier},` +
               `${to.x},${to.y - height * multiplier},`
                   :
                   `L`) +
               `${to.x},${to.y}`;
    }
}

/**
 * Common distances and sizes for the rendering of {@link MixComponent|`MixComponent`}.
 */
export
/**
 * Common distances and sizes for the rendering of {@link MixComponent|`MixComponent`}.
 */
const MEASURES = {
    INPUT_WIDTH:                      250,
    INPUT_HEIGHT:                     90,
    ADD_INPUT_HEIGHT:                 50,
    INPUT_SPACING:                    10,
    INPUT_ORIGIN_TOP:                 20,
    INPUT_ORIGIN_NAME_TOP:            39,
    INPUT_NAME_TOP:                   66,
    CONNECTOR_RADIUS:                 8,
    SECTIONS_SEPARATOR:               180,
    NODE_ADD_RADIUS:                  35,
    NODE_WIDTH:                       350,
    NODE_SPACING:                     160,
    NODE_HEADING_HEIGHT:              40,
    NODE_HEADING_WIDTH:               250,
    NODE_INTERNAL_SPACING:            15,
    NODE_CONNECTION_HEIGHT:           40,
    NODE_CONNECTION_CONSTANT_SHIFT:   12,
    NODE_CONNECTION_CONSTANT_SPACING: 25,
    CONNECTION_WIDTH:                 3,
    CONNECTOR_SNAP_RADIUS:            30,
    CONNECTOR_SNAP_RADIUS_SQUARED:    30 * 30,
    OUTPUT_WIDTH:                     250,
    OUTPUT_HEIGHT:                    70,
    ADD_OUTPUT_HEIGHT:                50,
    OUTPUT_SPACING:                   10,
    UNDERPASS_BORDER_WIDTH:           7.5,
    COLOR_INPUT_SQUARE_SIZE:          15,
    GROUP_PADDING:                    40
};
