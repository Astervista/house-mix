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

export const DATUM_TYPE_DISPLAY: Record<DatumType, string> = {
    [DatumType.BOOLEAN]:   'Boolean',
    [DatumType.NUMBER]:    'Number',
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
        nodes: [
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
            nodes: [testNode]
        });
}

export const DATUM_ORIGIN_DISPLAY: Record<DatumOrigin, string> = {
    GROUP:  'Group mixes output',
    SENSOR_DATA: 'Raw data from sensors',
    SENSOR: 'Sensor mixes outputs',
    SYSTEM: 'System'
};

export function getExternalDatumOriginNameDisplay(datum: ExportedDatum): string {
    if (datum.origin == DatumOrigin.SYSTEM) {
        return (SYSTEM_ORIGIN_DISPLAY[datum.originName as SystemOrigin] as string | null) ?? origin;
    } else {
        return datum.originDisplayName ?? datum.originName;
    }
}

