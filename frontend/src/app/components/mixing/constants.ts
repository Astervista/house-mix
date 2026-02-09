import {DatumOrigin, DatumType, ExportedDatum} from '@common/mixing/mix/datum';
import {
    ElaborationNodeAddition,
    ElaborationNodeAllTypesTest,
    ElaborationNodeBinaryChoice,
    ElaborationNodeClamp,
    ElaborationNodeCode,
    ElaborationNodeCombineDateTime,
    ElaborationNodeDateFromValues,
    ElaborationNodeDateTimeFromValues,
    ElaborationNodeDateTimeValues,
    ElaborationNodeDateValues,
    ElaborationNodeDivision,
    ElaborationNodeEpoch,
    ElaborationNodeEqualityCheck,
    ElaborationNodeExtractHSL,
    ElaborationNodeExtractHSV,
    ElaborationNodeExtractRGB,
    ElaborationNodeExtractXY,
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
    ElaborationNodeMultiplication,
    ElaborationNodeNullGuard,
    ElaborationNodeRetrieveEvent,
    ElaborationNodeSaveEvent,
    ElaborationNodeSubtraction,
    ElaborationNodeSunEvents,
    ElaborationNodeTimeFromValues,
    ElaborationNodeTimeValues,
    TypedElaborationNodeImplementationConstructor,
    TypedNullMarkedElaborationNodeImplementationConstructor
} from '@common/mixing/mix/elaboration-node';
import {isDevMode} from '@angular/core';
import {SYSTEM_ORIGIN_DISPLAY} from '../system/constants';
import {SystemOrigin} from '@common/system/constants';
import {Point} from '@angular/cdk/drag-drop';

export const DATUM_TYPE_DISPLAY: Record<DatumType, string> = {
    [DatumType.BOOLEAN]:   'Boolean',
    [DatumType.NUMBER]:    'Number',
    [DatumType.STRING]:    'Text',
    [DatumType.COLOR]: 'Color',
    [DatumType.TIME]:      'Time',
    [DatumType.DATE]:      'Date',
    [DatumType.DATE_TIME]: 'Date and Time'
};

export function getColorVarNameForType(type: DatumType): string {
    return `var(--connector-type-${type.toLowerCase().replace('_', '-')}-color)`;
}

export type ElaborationNodeLibraryItem = {
    constructor: ElaborationNodeImplementationConstructor;
    description: string;
    code: ElaborationNodeCode;
    special: false;
} | {
    special: true,
    isTyped: true,
    nullMarked: false,
    constructor: TypedElaborationNodeImplementationConstructor;
    description: string;
    code: ElaborationNodeCode;
    datumType: DatumType
} | {
    special: true,
    isTyped: true,
    nullMarked: true,
    constructor: TypedNullMarkedElaborationNodeImplementationConstructor;
    description: string;
    code: ElaborationNodeCode;
    datumType: DatumType;
    nullableMark: boolean
};

export const ELABORATION_NODE_DISPLAY_NAME: Record<ElaborationNodeCode, string> = {
    TEST:                  'Test',
    ADDITION:              'Addition',
    SUBTRACTION:           'Subtraction',
    MULTIPLICATION:        'Multiplication',
    DIVISION:              'Division',
    MAX:                   'Maximum',
    MIN:                   'Minimum',
    CLAMP:                 'Clamp value',
    LERP:                  'Linear interpolation',
    NULL_GUARD:            'Null guard',
    EQUALITY_CHECK:        'Equality check',
    GREATER_THAN:          'Greater than',
    LESS_THAN:             'Less than',
    BINARY_CHOICE:         'Binary choice',
    EXTRACT_RGB:           'Extract RGB',
    EXTRACT_HSL:           'Extract_HSL',
    EXTRACT_HSV:           'Extract_HSV',
    EXTRACT_XY:            'Extract_XY',
    FROM_RGB:              'Color from RGB',
    FROM_HSL:              'Color from HSL',
    FROM_HSV:              'Color from HSV',
    FROM_XY:               'Color from XY',
    DATE_VALUES:           'Values from date',
    TIME_VALUES:           'Values from time',
    DATE_TIME_VALUES:      'Values from date time',
    DATE_FROM_VALUES:      'Date from values',
    TIME_FROM_VALUES:      'Time from values',
    DATE_TIME_FROM_VALUES: 'Date Time from values',
    COMBINE_DATE_TIME:     'Combine date and time',
    EPOCH:                 'Get epoch time',
    SUN_EVENTS:            'Sun event times',
    SAVE:                  'Store a value',
    RETRIEVE:              'Retrieve a value'
};

export const ELABORATION_NODE_LIBRARY: { sectionName: string, nodes: ElaborationNodeLibraryItem[] }[] = [
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
        sectionName: 'Control flow',
        nodes:       [
            {
                constructor: ElaborationNodeNullGuard,
                description: 'Assures a nullable parameter is transformed into a non-null parameter, returning a non-null fallback value if null',
                code:        ElaborationNodeCode.NULL_GUARD,
                datumType:  DatumType.NUMBER,
                special:    true,
                isTyped:    true,
                nullMarked: false
            },
            {
                constructor: ElaborationNodeEqualityCheck,
                description: 'Checks whether two values are equivalent, even if coming from two different elaborations.',
                code:        ElaborationNodeCode.EQUALITY_CHECK,
                datumType:   DatumType.NUMBER,
                special:     true,
                isTyped:     true,
                nullMarked:  false
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
                constructor:  ElaborationNodeBinaryChoice,
                description:  'Selects one of two values, depending on the value of "Choose first?". If it\'s true, the first is chosen, otherwise the second one is.',
                code:         ElaborationNodeCode.BINARY_CHOICE,
                datumType:    DatumType.NUMBER,
                nullableMark: false,
                special:      true,
                isTyped:      true,
                nullMarked:   true
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
            }
        ]
    },
    {
        sectionName: 'Date and time',
        nodes:       [
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
                constructor:  ElaborationNodeSaveEvent,
                description:  'Stores a value in permanent storage so it can be retrieved in a future elaboration of the mix through a "Retrieve a value" node.' +
                              ' Different values can be saved independently with a different name',
                code:         ElaborationNodeCode.SAVE,
                datumType:    DatumType.BOOLEAN,
                nullableMark: false,
                special:      true,
                isTyped:      true,
                nullMarked:   true
            },
            {
                constructor:  ElaborationNodeRetrieveEvent,
                description:  'Retrieves a value from permanent storage that was previously stored with a "Store a value" node' +
                              ' Different values can be saved independently with a different name',
                code:         ElaborationNodeCode.RETRIEVE,
                datumType:    DatumType.BOOLEAN,
                nullableMark: false,
                special:      true,
                isTyped:      true,
                nullMarked:   true
            }
        ]
    }
];

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

export const DATUM_ORIGIN_DISPLAY: Record<DatumOrigin, string> = {
    GROUP:       'Group mixes output',
    SENSOR_DATA: 'Raw data from sensors',
    SENSOR_UPDATE: 'Sensor update status',
    SENSOR:      'Sensor mixes outputs',
    SYSTEM:      'System',
    CENTER:      'Center mixes outputs'
};

export function getExternalDatumOriginNameDisplay(datum: ExportedDatum): string {
    if (datum.origin == DatumOrigin.SYSTEM) {
        return (SYSTEM_ORIGIN_DISPLAY[datum.originName as SystemOrigin] as string | null) ?? origin;
    } else {
        return datum.originDisplayName ?? datum.originName;
    }
}


export interface Line {
    from: Point;
    to: Point;
}

export function graphConnectionSmoothPath(from: Point, to: Point, horizontal: boolean = true): string {
    if (horizontal) {
        const width  = to.x - from.x;
        const height = Math.abs(to.y - from.y);
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
        const width  = Math.abs(to.x - from.x);
        const height = to.y - from.y;
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

export const MEASURES = {
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
    UNDERPASS_BORDER_WIDTH:  7.5,
    COLOR_INPUT_SQUARE_SIZE: 15
};
