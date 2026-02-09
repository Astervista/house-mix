import {Datum, DatumType, DatumTypeColor, DatumTypeColorBase} from "./datum";
import {IsEnum, IsInt, IsOptional, Min} from "rest-decorators";
import {Allow} from "../../decorators/decorators-mock";
import {Color, ColorSpace} from "../../utils/color-convert";
import {getTimes} from "suncalc";

/*
 * This file contains the class that describes a generic elaboration node used to manipulate data in a mix, together with a library of
 * all the possible instantiable nodes. The nodes are:
 *   Math
 *      - Addition: (number, number) => number
 *      - Subtraction: (number, number) => number
 *      - Multiplication: (number, number) => number
 *      - Division: (number, number) => number
 *      - Maximum: (number, number) => number
 *      - Minimum: (number, number) => number
 *      L Clamp: (number, number*, number*) => number
 *      L Lerp: (number, number, number) => number
 *   Control flow
 *      - Null guard: (T*, T) => T
 *      L Equality check (T*, T*) => boolean
 *      L Greater than (number, number, boolean) => boolean
 *      L Less than (number, number, boolean) => boolean
 *      L Binary choice (T*?, T*?, boolean) => T*
 *   Color
 *      L Extract RGB: Color => (number, number, number)
 *      L Extract HSL: Color => (number, number, number)
 *      L Extract HSV: Color => (number, number, number)
 *      L Extract XY: Color => (number, number, number)
 *      L From RGB: (number, number, number) => Color
 *      L From HSL: (number, number, number) => Color
 *      L From HSV: (number, number, number) => Color
 *      L From XY: (number, number) => Color
 *   Date and time
 *      L Date values: Date => (number, number, number, number)
 *      L Time values: Time => (number, number, number)
 *      L Date Time values: Date Time => (number, number, number, number, number, number, number)
 *      L Date from values: (number, number, number) => Date
 *      L Time from values: (number, number, number) => Time
 *      L Date Time from values: (number, number, number, number, number, number) => Date Time
 *      L Combine Date and Time: (Date, Time) => Date Time
 *      L Epoch: Date Time => number
 *      L Sun events: Date => (Time [...x14])
 *   Storage
 *      L Save: (T*?, string) => ()
 *      L Retrieve: (string, T*?) => T*?
 *   (test)
 *      - Test: (boolean, number, string, Color, Time, Date, Date Time, boolean?, number?, string?, Color?, Time?, Date?, Date Time?) => (boolean, number, string, Color, Time, Date, Date Time, boolean?, number?, string?, Color?, Time?, Date?, Date Time?)
 */

export enum ElaborationNodeCode {
    ADDITION              = "ADDITION",
    SUBTRACTION           = "SUBTRACTION",
    MULTIPLICATION        = "MULTIPLICATION",
    DIVISION              = "DIVISION",
    MAX                   = "MAX",
    MIN                   = "MIN",
    CLAMP                 = "CLAMP",
    LERP                  = "LERP",
    NULL_GUARD            = "NULL_GUARD",
    EQUALITY_CHECK        = "EQUALITY_CHECK",
    GREATER_THAN          = "GREATER_THAN",
    LESS_THAN             = "LESS_THAN",
    BINARY_CHOICE         = "BINARY_CHOICE",
    EXTRACT_RGB           = "EXTRACT_RGB",
    EXTRACT_HSL           = "EXTRACT_HSL",
    EXTRACT_HSV           = "EXTRACT_HSV",
    EXTRACT_XY            = "EXTRACT_XY",
    FROM_RGB              = "FROM_RGB",
    FROM_HSL              = "FROM_HSL",
    FROM_HSV              = "FROM_HSV",
    FROM_XY               = "FROM_XY",
    DATE_VALUES           = "DATE_VALUES",
    TIME_VALUES           = "TIME_VALUES",
    DATE_TIME_VALUES      = "DATE_TIME_VALUES",
    DATE_FROM_VALUES      = "DATE_FROM_VALUES",
    TIME_FROM_VALUES      = "TIME_FROM_VALUES",
    DATE_TIME_FROM_VALUES = "DATE_TIME_FROM_VALUES",
    COMBINE_DATE_TIME     = "COMBINE_DATE_TIME",
    EPOCH                 = "EPOCH",
    SUN_EVENTS            = "SUN_EVENTS",
    SAVE                  = "SAVE",
    RETRIEVE              = "RETRIEVE",
    TEST                  = "TEST"
}

export enum ElaborationNodeErrorType {
    MISSING_INPUT     = "MISSING_INPUT",
    WRONG_INPUT_TYPE  = "WRONG_INPUT_TYPE",
    MISSING_OUTPUT    = "MISSING_OUTPUT",
    WRONG_OUTPUT_TYPE = "WRONG_OUTPUT_TYPE",
}

export class ElaborationNodeError extends Error {
    constructor(
        public readonly type: ElaborationNodeErrorType,
        public readonly nodeId: number,
        public readonly datumName: string) {
        super(`Error while elaborating node. Code: ${type} on node ${nodeId} input ${datumName}`);
    }
}


export abstract class ElaborationNode {
    
    public abstract readonly inputs: readonly Datum[];
    public abstract readonly outputs: readonly Datum[];
    
    protected constructor(public readonly id: number, public readonly code: ElaborationNodeCode) {
    
    }
    
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
    
    protected abstract calculate(inputValues: Map<string, unknown>): Map<string, unknown>;
    
    public toJSON(): ElaborationNodeJSON {
        return {
            id:      this.id,
            code:    this.code,
            options: null
        };
    }
    
    public static fromJSON(elaborationNodeJSON: ElaborationNodeJSON): ElaborationNode {
        return this.getNewNode(elaborationNodeJSON.id, elaborationNodeJSON.code, elaborationNodeJSON.options);
    }
    
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
            case ElaborationNodeCode.MAX:
                return new ElaborationNodeMax(id);
            case ElaborationNodeCode.MIN:
                return new ElaborationNodeMin(id);
            case ElaborationNodeCode.CLAMP:
                return new ElaborationNodeClamp(id);
            case ElaborationNodeCode.LERP:
                return new ElaborationNodeLerp(id);
            case ElaborationNodeCode.NULL_GUARD:
                return new ElaborationNodeNullGuard(id, options as TypedElaborationNodeOptions);
            case ElaborationNodeCode.EQUALITY_CHECK:
                return new ElaborationNodeEqualityCheck(id, options as TypedNullMarkedElaborationNodeOptions);
            case ElaborationNodeCode.GREATER_THAN:
                return new ElaborationNodeGreaterThan(id);
            case ElaborationNodeCode.LESS_THAN:
                return new ElaborationNodeLessThan(id);
            case ElaborationNodeCode.BINARY_CHOICE:
                return new ElaborationNodeBinaryChoice(id, options as TypedNullMarkedElaborationNodeOptions);
            case ElaborationNodeCode.EXTRACT_RGB:
                return new ElaborationNodeExtractRGB(id);
            case ElaborationNodeCode.EXTRACT_HSL:
                return new ElaborationNodeExtractHSL(id);
            case ElaborationNodeCode.EXTRACT_HSV:
                return new ElaborationNodeExtractHSV(id);
            case ElaborationNodeCode.EXTRACT_XY:
                return new ElaborationNodeExtractXY(id);
            case ElaborationNodeCode.FROM_RGB:
                return new ElaborationNodeFromRGB(id);
            case ElaborationNodeCode.FROM_HSL:
                return new ElaborationNodeFromHSL(id);
            case ElaborationNodeCode.FROM_HSV:
                return new ElaborationNodeFromHSV(id);
            case ElaborationNodeCode.FROM_XY:
                return new ElaborationNodeFromXY(id);
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
            case ElaborationNodeCode.COMBINE_DATE_TIME:
                return new ElaborationNodeCombineDateTime(id);
            case ElaborationNodeCode.EPOCH:
                return new ElaborationNodeEpoch(id);
            case ElaborationNodeCode.SUN_EVENTS:
                return new ElaborationNodeSunEvents(id);
            case ElaborationNodeCode.SAVE:
                return new ElaborationNodeSaveEvent(id, options as TypedNullMarkedElaborationNodeOptions);
            case ElaborationNodeCode.RETRIEVE:
                return new ElaborationNodeRetrieveEvent(id, options as TypedNullMarkedElaborationNodeOptions);
            case ElaborationNodeCode.TEST:
                return new ElaborationNodeAllTypesTest(id);
        }
    }
    
}

export type ElaborationNodeImplementationConstructor = new (id: number) => ElaborationNode;
export type TypedElaborationNodeImplementationConstructor = new (id: number, options: TypedElaborationNodeOptions) => ElaborationNode;
export type TypedNullMarkedElaborationNodeImplementationConstructor = new (id: number, options: TypedNullMarkedElaborationNodeOptions) => ElaborationNode;

export class ElaborationNodeJSON {
    
    @IsInt()
    @Min(0)
    public id: number;
    
    @IsEnum(ElaborationNodeCode)
    public code: ElaborationNodeCode;
    
    @IsOptional()
    @Allow()
    public options?: unknown = null;
    
    constructor(id: number, code: ElaborationNodeCode) {
        this.id   = id;
        this.code = code;
    }
    
}

export class ElaborationNodeAllTypesTest extends ElaborationNode {
    
    public readonly inputs: readonly Datum[]  = [
        new Datum("Boolean", DatumType.BOOLEAN, false),
        new Datum("Number", DatumType.NUMBER, false),
        new Datum("String", DatumType.STRING, false),
        new Datum("Color", DatumType.COLOR, false),
        new Datum("Time", DatumType.TIME, false),
        new Datum("Date", DatumType.DATE, false),
        new Datum("Date Time", DatumType.DATE_TIME, false),
        new Datum("Boolean?", DatumType.BOOLEAN, true),
        new Datum("Number?", DatumType.NUMBER, true),
        new Datum("String?", DatumType.STRING, true),
        new Datum("Color?", DatumType.COLOR, true),
        new Datum("Time?", DatumType.TIME, true),
        new Datum("Date?", DatumType.DATE, true),
        new Datum("Date Time?", DatumType.DATE_TIME, true)
    ];
    public readonly outputs: readonly Datum[] = [
        new Datum("Boolean", DatumType.BOOLEAN, false),
        new Datum("Number", DatumType.NUMBER, false),
        new Datum("String", DatumType.STRING, false),
        new Datum("Color", DatumType.COLOR, false),
        new Datum("Time", DatumType.TIME, false),
        new Datum("Date", DatumType.DATE, false),
        new Datum("Date Time", DatumType.DATE_TIME, false),
        new Datum("Boolean?", DatumType.BOOLEAN, true),
        new Datum("Number?", DatumType.NUMBER, true),
        new Datum("String?", DatumType.STRING, true),
        new Datum("Color?", DatumType.COLOR, true),
        new Datum("Time?", DatumType.TIME, true),
        new Datum("Date?", DatumType.DATE, true),
        new Datum("Date Time?", DatumType.DATE_TIME, true)
    ];
    
    constructor(id: number) {
        super(id, ElaborationNodeCode.TEST);
    }
    
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        return new Map(inputValues);
    }
    
}

export abstract class ElaborationNodeMathOperation extends ElaborationNode {
    
    protected static readonly FIRST_NUMBER_INPUT: string  = "First number";
    protected static readonly SECOND_NUMBER_INPUT: string = "Second number";
    
    public readonly inputs: readonly Datum[] = [
        new Datum(ElaborationNodeMathOperation.FIRST_NUMBER_INPUT, DatumType.NUMBER, false),
        new Datum(ElaborationNodeMathOperation.SECOND_NUMBER_INPUT, DatumType.NUMBER, false)
    ];
    
    public readonly outputs: readonly Datum[];
    
    protected constructor(id: number, code: ElaborationNodeCode, public operationName: string) {
        super(id, code);
        this.outputs = [
            new Datum(this.operationName, DatumType.NUMBER, false)
        ];
    }
    
}

export class ElaborationNodeAddition extends ElaborationNodeMathOperation {
    
    private static readonly OUTPUT_NAME = "Sum";
    
    constructor(id: number) {
        super(id, ElaborationNodeCode.ADDITION, ElaborationNodeAddition.OUTPUT_NAME);
    }
    
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const firstNumber  = inputValues.get(ElaborationNodeAddition.FIRST_NUMBER_INPUT) as number;
        const secondNumber = inputValues.get(ElaborationNodeAddition.SECOND_NUMBER_INPUT) as number;
        const result       = firstNumber + secondNumber;
        return new Map([[ElaborationNodeAddition.OUTPUT_NAME, result]]);
    }
    
}

export class ElaborationNodeSubtraction extends ElaborationNodeMathOperation {
    
    private static readonly OUTPUT_NAME = "Difference";
    
    constructor(id: number) {
        super(id, ElaborationNodeCode.SUBTRACTION, ElaborationNodeSubtraction.OUTPUT_NAME);
    }
    
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const firstNumber  = inputValues.get(ElaborationNodeSubtraction.FIRST_NUMBER_INPUT) as number;
        const secondNumber = inputValues.get(ElaborationNodeSubtraction.SECOND_NUMBER_INPUT) as number;
        const result       = firstNumber - secondNumber;
        return new Map([[ElaborationNodeSubtraction.OUTPUT_NAME, result]]);
    }
    
}

export class ElaborationNodeMultiplication extends ElaborationNodeMathOperation {
    
    private static readonly OUTPUT_NAME = "Product";
    
    constructor(id: number) {
        super(id, ElaborationNodeCode.MULTIPLICATION, ElaborationNodeMultiplication.OUTPUT_NAME);
    }
    
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const firstNumber  = inputValues.get(ElaborationNodeMultiplication.FIRST_NUMBER_INPUT) as number;
        const secondNumber = inputValues.get(ElaborationNodeMultiplication.SECOND_NUMBER_INPUT) as number;
        const result       = firstNumber * secondNumber;
        return new Map([[ElaborationNodeMultiplication.OUTPUT_NAME, result]]);
    }
    
}

export class ElaborationNodeDivision extends ElaborationNodeMathOperation {
    
    private static readonly OUTPUT_NAME = "Quotient";
    
    constructor(id: number) {
        super(id, ElaborationNodeCode.DIVISION, ElaborationNodeDivision.OUTPUT_NAME);
    }
    
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const firstNumber  = inputValues.get(ElaborationNodeDivision.FIRST_NUMBER_INPUT) as number;
        const secondNumber = inputValues.get(ElaborationNodeDivision.SECOND_NUMBER_INPUT) as number;
        const result       = firstNumber / secondNumber;
        return new Map([[ElaborationNodeDivision.OUTPUT_NAME, result]]);
    }
    
}

export class ElaborationNodeMax extends ElaborationNodeMathOperation {
    
    private static readonly OUTPUT_NAME = "Max";
    
    constructor(id: number) {
        super(id, ElaborationNodeCode.MAX, ElaborationNodeMax.OUTPUT_NAME);
    }
    
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const firstNumber  = inputValues.get(ElaborationNodeMax.FIRST_NUMBER_INPUT) as number;
        const secondNumber = inputValues.get(ElaborationNodeMax.SECOND_NUMBER_INPUT) as number;
        const result       = Math.max(firstNumber + secondNumber);
        return new Map([[ElaborationNodeMax.OUTPUT_NAME, result]]);
    }
    
}

export class ElaborationNodeMin extends ElaborationNodeMathOperation {
    
    private static readonly OUTPUT_NAME = "Min";
    
    constructor(id: number) {
        super(id, ElaborationNodeCode.MIN, ElaborationNodeMin.OUTPUT_NAME);
    }
    
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const firstNumber  = inputValues.get(ElaborationNodeMin.FIRST_NUMBER_INPUT) as number;
        const secondNumber = inputValues.get(ElaborationNodeMin.SECOND_NUMBER_INPUT) as number;
        const result       = Math.min(firstNumber + secondNumber);
        return new Map([[ElaborationNodeMin.OUTPUT_NAME, result]]);
    }
    
}


/**
 * Represents a clamping node in an elaboration system, used to constrain a value
 * within a defined range. The node accepts a numeric input along with optional
 * minimum and maximum bounds, and produces a clamped output value. If a bound
 * is not specified, that bound will not be clamped.
 *
 */
export class ElaborationNodeClamp extends ElaborationNode {
    
    private static readonly VALUE     = "Value";
    private static readonly MIN_INPUT = "Lower bound";
    private static readonly MAX_INPUT = "Upper bound";
    
    private static readonly OUTPUT = "Clamped value";
    
    public readonly inputs: readonly Datum[];
    public readonly outputs: readonly Datum[];
    
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

export class ElaborationNodeLerp extends ElaborationNode {
    
    private static readonly PARAM = "Parameter";
    private static readonly START = "Range start";
    private static readonly END   = "Range end";
    
    private static readonly OUTPUT = "Interpolation";
    
    public readonly inputs: readonly Datum[];
    public readonly outputs: readonly Datum[];
    
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


export interface TypedElaborationNodeOptions {
    dataType: DatumType;
}

export interface TypedNullMarkedElaborationNodeOptions {
    dataType: DatumType;
    nullable: boolean;
}

export abstract class TypedElaborationNode extends ElaborationNode {
    
    
    protected constructor(id: number, code: ElaborationNodeCode, public options: TypedElaborationNodeOptions) {
        super(id, code);
    }
    
    public override toJSON(): ElaborationNodeJSON {
        const result   = super.toJSON();
        result.options = this.options;
        return result;
    }
    
}

export abstract class TypedNullMarkedElaborationNode extends ElaborationNode {
    
    protected constructor(id: number, code: ElaborationNodeCode, public options: TypedNullMarkedElaborationNodeOptions) {
        super(id, code);
    }
    
    public override toJSON(): ElaborationNodeJSON {
        const result   = super.toJSON();
        result.options = this.options;
        return result;
    }
    
}

export class ElaborationNodeNullGuard extends TypedElaborationNode {
    
    private static readonly NULLABLE_INPUT: string = "Nullable";
    private static readonly DEFAULT_INPUT: string  = "Default";
    
    private static readonly OUTPUT: string = "Non null value";
    
    public readonly inputs: readonly Datum[];
    
    public readonly outputs: readonly Datum[];
    
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

export class ElaborationNodeEqualityCheck extends TypedElaborationNode {
    
    private static readonly FIRST_VALUE: string  = "First value";
    private static readonly SECOND_VALUE: string = "Second value";
    
    private static readonly OUTPUT: string = "Is equal";
    
    public readonly inputs: readonly Datum[];
    
    public readonly outputs: readonly Datum[];
    
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

export class ElaborationNodeGreaterThan extends ElaborationNode {
    
    
    private static readonly FIRST_VALUE: string  = "First value";
    private static readonly SECOND_VALUE: string = "Second value";
    private static readonly INCLUSIVE: string    = "Inclusive";
    
    private static readonly OUTPUT: string = "Is equal";
    
    public readonly inputs: readonly Datum[];
    
    public readonly outputs: readonly Datum[];
    
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
    
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const firstValue  = inputValues.get(ElaborationNodeGreaterThan.FIRST_VALUE) as number;
        const secondValue = inputValues.get(ElaborationNodeGreaterThan.SECOND_VALUE) as number;
        const inclusive   = inputValues.get(ElaborationNodeGreaterThan.INCLUSIVE) as boolean;
        if (inclusive) {
            return new Map<string, unknown>(
                [
                    [
                        ElaborationNodeGreaterThan.OUTPUT, firstValue > secondValue
                    ]
                ]);
        } else {
            return new Map<string, unknown>(
                [
                    [
                        ElaborationNodeGreaterThan.OUTPUT,
                        firstValue >= secondValue
                    ]
                ]);
        }
    }
    
}

export class ElaborationNodeLessThan extends ElaborationNode {
    
    private static readonly FIRST_VALUE: string  = "First value";
    private static readonly SECOND_VALUE: string = "Second value";
    private static readonly INCLUSIVE: string    = "Inclusive";
    
    private static readonly OUTPUT: string = "Is equal";
    
    public readonly inputs: readonly Datum[];
    
    public readonly outputs: readonly Datum[];
    
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
    
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const firstValue  = inputValues.get(ElaborationNodeLessThan.FIRST_VALUE) as number;
        const secondValue = inputValues.get(ElaborationNodeLessThan.SECOND_VALUE) as number;
        const inclusive   = inputValues.get(ElaborationNodeLessThan.INCLUSIVE) as boolean;
        if (inclusive) {
            return new Map<string, unknown>(
                [
                    [
                        ElaborationNodeLessThan.OUTPUT, firstValue < secondValue
                    ]
                ]);
        } else {
            return new Map<string, unknown>(
                [
                    [
                        ElaborationNodeLessThan.OUTPUT,
                        firstValue <= secondValue
                    ]
                ]);
        }
    }
    
}

export class ElaborationNodeBinaryChoice extends TypedNullMarkedElaborationNode {
    
    private static readonly FIRST: string   = "First choice";
    private static readonly SECOND: string  = "Second choice";
    private static readonly CHOOSER: string = "Choose first?";
    
    private static readonly OUTPUT: string = "Choice";
    
    public readonly inputs: readonly Datum[];
    
    public readonly outputs: readonly Datum[];
    
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

export class ElaborationNodeExtractRGB extends ElaborationNode {
    
    
    private static readonly COLOR = "Color";
    
    private static readonly RED   = "Red";
    private static readonly GREEN = "Green";
    private static readonly BLUE  = "Blue";
    
    public readonly inputs: readonly Datum[];
    public readonly outputs: readonly Datum[];
    
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

export class ElaborationNodeExtractHSL extends ElaborationNode {
    
    
    private static readonly COLOR = "Color";
    
    private static readonly HUE        = "Hue";
    private static readonly SATURATION = "Saturation";
    private static readonly LIGHTNESS  = "Lightness";
    
    public readonly inputs: readonly Datum[];
    public readonly outputs: readonly Datum[];
    
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

export class ElaborationNodeExtractHSV extends ElaborationNode {
    
    
    private static readonly COLOR = "Color";
    
    private static readonly HUE        = "Hue";
    private static readonly SATURATION = "Saturation";
    private static readonly VALUE      = "Value (Brightness)";
    
    public readonly inputs: readonly Datum[];
    public readonly outputs: readonly Datum[];
    
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

export class ElaborationNodeExtractXY extends ElaborationNode {
    
    private static readonly COLOR = "Color";
    
    private static readonly X = "X";
    private static readonly Y = "Y";
    
    public readonly inputs: readonly Datum[];
    public readonly outputs: readonly Datum[];
    
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

export class ElaborationNodeFromRGB extends ElaborationNode {
    
    private static readonly RED   = "Red";
    private static readonly GREEN = "Green";
    private static readonly BLUE  = "Blue";
    
    private static readonly OUTPUT = "Color";
    
    public readonly inputs: readonly Datum[];
    public readonly outputs: readonly Datum[];
    
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

export class ElaborationNodeFromHSL extends ElaborationNode {
    
    private static readonly HUE        = "Hue";
    private static readonly SATURATION = "Saturation";
    private static readonly LIGHTNESS  = "Lightness";
    
    private static readonly OUTPUT = "Color";
    
    public readonly inputs: readonly Datum[];
    public readonly outputs: readonly Datum[];
    
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

export class ElaborationNodeFromHSV extends ElaborationNode {
    
    private static readonly HUE        = "Hue";
    private static readonly SATURATION = "Saturation";
    private static readonly VALUE      = "Value (Brightness)";
    
    private static readonly OUTPUT = "Color";
    
    public readonly inputs: readonly Datum[];
    public readonly outputs: readonly Datum[];
    
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

export class ElaborationNodeFromXY extends ElaborationNode {
    
    private static readonly X = "X";
    private static readonly Y = "Y";
    
    private static readonly OUTPUT = "Color";
    
    public readonly inputs: readonly Datum[];
    public readonly outputs: readonly Datum[];
    
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

export class ElaborationNodeDateValues extends ElaborationNode {
    
    private static readonly DATE = "Date";
    
    private static readonly YEAR     = "Year";
    private static readonly MONTH    = "Month";
    private static readonly DAY_DATE = "Date in month";
    private static readonly WEEKDAY  = "Weekday";
    
    public readonly inputs: readonly Datum[];
    public readonly outputs: readonly Datum[];
    
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

export class ElaborationNodeTimeValues extends ElaborationNode {
    
    private static readonly TIME = "Time";
    
    private static readonly HOUR   = "Hour";
    private static readonly MINUTE = "Minute";
    private static readonly SECOND = "Second";
    
    public readonly inputs: readonly Datum[];
    public readonly outputs: readonly Datum[];
    
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

export class ElaborationNodeDateTimeValues extends ElaborationNode {
    
    private static readonly DATE_TIME = "Date Time";
    
    private static readonly HOUR     = "Hour";
    private static readonly MINUTE   = "Minute";
    private static readonly SECOND   = "Second";
    private static readonly YEAR     = "Year";
    private static readonly MONTH    = "Month";
    private static readonly DAY_DATE = "Date in month";
    private static readonly WEEKDAY  = "Weekday";
    
    public readonly inputs: readonly Datum[];
    public readonly outputs: readonly Datum[];
    
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

export class ElaborationNodeDateFromValues extends ElaborationNode {
    
    private static readonly DATE = "Date";
    
    private static readonly YEAR     = "Year";
    private static readonly MONTH    = "Month";
    private static readonly DAY_DATE = "Date in month";
    
    public readonly inputs: readonly Datum[];
    public readonly outputs: readonly Datum[];
    
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

export class ElaborationNodeTimeFromValues extends ElaborationNode {
    
    private static readonly TIME = "Time";
    
    private static readonly HOUR   = "Hour";
    private static readonly MINUTE = "Minute";
    private static readonly SECOND = "Second";
    
    public readonly inputs: readonly Datum[];
    public readonly outputs: readonly Datum[];
    
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
    
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const hour   = inputValues.get(ElaborationNodeTimeFromValues.HOUR) as number;
        const minute = inputValues.get(ElaborationNodeTimeFromValues.MINUTE) as number;
        const second = inputValues.get(ElaborationNodeTimeFromValues.SECOND) as number;
        
        return new Map<string, unknown>(
            [
                [
                    ElaborationNodeTimeFromValues.TIME, new Date(2000, 0, 1, hour, minute, second)
                ]
            ]);
    }
}

export class ElaborationNodeDateTimeFromValues extends ElaborationNode {
    
    private static readonly DATE_TIME = "DateTime";
    
    private static readonly YEAR     = "Year";
    private static readonly MONTH    = "Month";
    private static readonly DAY_DATE = "Date in month";
    private static readonly HOUR     = "Hour";
    private static readonly MINUTE   = "Minute";
    private static readonly SECOND   = "Second";
    
    public readonly inputs: readonly Datum[];
    public readonly outputs: readonly Datum[];
    
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

export class ElaborationNodeCombineDateTime extends ElaborationNode {
    
    private static readonly DATE = "Date";
    private static readonly TIME = "Time";
    
    private static readonly OUTPUT = "Date Time";
    
    public readonly inputs: readonly Datum[];
    public readonly outputs: readonly Datum[];
    
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

export class ElaborationNodeEpoch extends ElaborationNode {
    
    private static readonly DATE = "Date Time";
    
    private static readonly OUTPUT = "Epoch";
    
    public readonly inputs: readonly Datum[];
    public readonly outputs: readonly Datum[];
    
    constructor(id: number) {
        super(id, ElaborationNodeCode.EPOCH);
        this.inputs  = [
            new Datum(ElaborationNodeEpoch.DATE, DatumType.DATE_TIME, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeEpoch.OUTPUT, DatumType.NUMBER, false)
        ];
    }
    
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

export class ElaborationNodeSunEvents extends ElaborationNode {
    
    private static readonly DATE = "Date Time";
    
    private static readonly DAWN            = "Dawn";
    private static readonly DUSK            = "Dusk";
    private static readonly GOLDEN_HOUR     = "Golden  hour";
    private static readonly GOLDEN_HOUR_END = "Golden hour end";
    private static readonly NADIR           = "Nadir";
    private static readonly NAUTICAL_DAWN   = "Nautical dawn";
    private static readonly NAUTICAL_DUSK   = "Nautical dusk";
    private static readonly NIGHT           = "Night";
    private static readonly NIGHT_END       = "Night end";
    private static readonly SOLAR_NOON      = "Solar noon";
    private static readonly SUNRISE         = "Sunrise";
    private static readonly SUNRISE_END     = "Sunrise end";
    private static readonly SUNSET          = "Sunset";
    private static readonly SUNSET_START    = "Sunset start";
    
    public readonly inputs: readonly Datum[];
    public readonly outputs: readonly Datum[];
    
    constructor(id: number) {
        super(id, ElaborationNodeCode.SUN_EVENTS);
        this.inputs  = [
            new Datum(ElaborationNodeSunEvents.DATE, DatumType.DATE, false)
        ];
        this.outputs = [
            new Datum(ElaborationNodeSunEvents.DAWN, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.DUSK, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.GOLDEN_HOUR, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.GOLDEN_HOUR_END, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.NADIR, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.NAUTICAL_DAWN, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.NAUTICAL_DUSK, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.NIGHT, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.NIGHT_END, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.SOLAR_NOON, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.SUNRISE, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.SUNRISE_END, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.SUNSET, DatumType.TIME, false),
            new Datum(ElaborationNodeSunEvents.SUNSET_START, DatumType.TIME, false)
        ];
    }
    
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
    
    public static coordinates: {
        latitude: number,
        longitude: number,
    } = {
        latitude:  0,
        longitude: 0
    };
    
}

export class ElaborationNodeSaveEvent extends TypedNullMarkedElaborationNode {
    
    private static readonly VALUE: string = "Value";
    private static readonly NAME: string  = "Name";
    
    public readonly inputs: readonly Datum[];
    
    public readonly outputs: readonly Datum[];
    
    private _lastElaborationSave?: { name: string, value: unknown };
    
    constructor(id: number, options: TypedNullMarkedElaborationNodeOptions) {
        super(id, ElaborationNodeCode.SAVE, options);
        this.inputs  = [
            new Datum(ElaborationNodeSaveEvent.VALUE, options.dataType, options.nullable),
            new Datum(ElaborationNodeSaveEvent.NAME, DatumType.STRING, false)
        ];
        this.outputs = [];
    }
    
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
    
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const value               = inputValues.get(ElaborationNodeSaveEvent.VALUE);
        const name                = inputValues.get(ElaborationNodeSaveEvent.NAME) as string;
        this._lastElaborationSave = {
            name,
            value
        };
        return new Map<string, unknown>();
    }
    
}

export class ElaborationNodeRetrieveEvent extends TypedNullMarkedElaborationNode {
    
    private static readonly NAME: string    = "Name";
    private static readonly DEFAULT: string = "Default";
    
    private static readonly VALUE: string = "Value";
    
    public readonly inputs: readonly Datum[];
    
    public readonly outputs: readonly Datum[];
    
    public allSaves: Map<string, unknown> = new Map<string, unknown>();
    
    constructor(id: number, options: TypedNullMarkedElaborationNodeOptions) {
        super(id, ElaborationNodeCode.RETRIEVE, options);
        this.inputs  = [
            new Datum(ElaborationNodeRetrieveEvent.NAME, DatumType.STRING, false),
            new Datum(ElaborationNodeRetrieveEvent.DEFAULT, options.dataType, options.nullable)
        ];
        this.outputs = [
            new Datum(ElaborationNodeRetrieveEvent.VALUE, options.dataType, options.nullable)
        ];
    }
    
    protected calculate(inputValues: Map<string, unknown>): Map<string, unknown> {
        const defaultValue = inputValues.get(ElaborationNodeRetrieveEvent.DEFAULT);
        const name         = inputValues.get(ElaborationNodeRetrieveEvent.NAME) as string;
        let value: unknown;
        if (this.allSaves.has(name)) {
            value = this.allSaves.get(name);
            if (!this.options.nullable && value == null) {
                value = defaultValue;
            }
        } else {
            value = defaultValue;
        }
        return new Map<string, unknown>([
                                            [ElaborationNodeRetrieveEvent.VALUE, value]
                                        ]);
    }
    
}
