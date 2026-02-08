import {DatumOrigin, DatumType, ExportedDatum} from '@common/mixing/mix/datum';
import {
    ElaborationNodeAddition,
    ElaborationNodeAllTypesTest,
    ElaborationNodeCode,
    ElaborationNodeDivision,
    ElaborationNodeImplementationConstructor,
    ElaborationNodeMax,
    ElaborationNodeMin,
    ElaborationNodeMultiplication,
    ElaborationNodeNullGuard,
    ElaborationNodeSubtraction
} from '@common/mixing/mix/elaboration-node';
import {isDevMode} from '@angular/core';
import {SYSTEM_ORIGIN_DISPLAY} from '../system/constants';
import {SystemOrigin} from '@common/system/constants';
import {Point} from '@angular/cdk/drag-drop';

export const DATUM_TYPE_DISPLAY: Record<DatumType, string> = {
    [DatumType.BOOLEAN]:   'Boolean',
    [DatumType.NUMBER]:    'Number',
    [DatumType.STRING]:    'Text',
    [DatumType.COLOR]:    'Color',
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
    constructor: typeof ElaborationNodeNullGuard;
    description: string;
    code: ElaborationNodeCode.NULL_GUARD;
    datumType: DatumType
};

export const ELABORATION_NODE_DISPLAY_NAME: Record<ElaborationNodeCode, string> = {
    TEST:           'Test',
    ADDITION:       'Addition',
    SUBTRACTION:    'Subtraction',
    MULTIPLICATION: 'Multiplication',
    DIVISION:       'Division',
    MAX:            'Maximum',
    MIN:            'Minimum',
    NULL_GUARD:     'Null guard'
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
            }
        ]
    },
    {
        sectionName: 'Control flow',
        nodes:       [
            {
                special:     true,
                constructor: ElaborationNodeNullGuard,
                description: 'Assures a nullable parameter is transformed into a non-null parameter, returning a non-null fallback value if null',
                code:        ElaborationNodeCode.NULL_GUARD,
                datumType:   DatumType.BOOLEAN
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
    UNDERPASS_BORDER_WIDTH: 7.5,
    COLOR_INPUT_SQUARE_SIZE: 15
};
