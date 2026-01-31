import {Datum, DatumType} from "./datum";
import {IsEnum, IsInt, IsOptional, Min} from "rest-decorators";
import {Allow} from "../../decorators/decorators-mock";

export enum ElaborationNodeCode {
    ADDITION       = "ADDITION",
    SUBTRACTION    = "SUBTRACTION",
    MULTIPLICATION = "MULTIPLICATION",
    DIVISION       = "DIVISION",
    MAX            = "MAX",
    MIN            = "MIN",
    NULL_GUARD     = "NULL_GUARD",
    TEST           = "TEST"
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
            case ElaborationNodeCode.NULL_GUARD:
                return new ElaborationNodeNullGuard(id, options as ElaborationModeNullGuardOptions);
            case ElaborationNodeCode.TEST:
                return new ElaborationNodeAllTypesTest(id);
        }
    }
    
}

export type ElaborationNodeImplementationConstructor = new (id: number) => ElaborationNode;

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
        new Datum("Time", DatumType.TIME, false),
        new Datum("Date", DatumType.DATE, false),
        new Datum("Date Time", DatumType.DATE_TIME, false),
        new Datum("Boolean?", DatumType.BOOLEAN, true),
        new Datum("Number?", DatumType.NUMBER, true),
        new Datum("Time?", DatumType.TIME, true),
        new Datum("Date?", DatumType.DATE, true),
        new Datum("Date Time?", DatumType.DATE_TIME, true)
    ];
    public readonly outputs: readonly Datum[] = [
        new Datum("Boolean", DatumType.BOOLEAN, false),
        new Datum("Number", DatumType.NUMBER, false),
        new Datum("Time", DatumType.TIME, false),
        new Datum("Date", DatumType.DATE, false),
        new Datum("Date Time", DatumType.DATE_TIME, false),
        new Datum("Boolean?", DatumType.BOOLEAN, true),
        new Datum("Number?", DatumType.NUMBER, true),
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
    
    public static FIRST_NUMBER_INPUT: string  = "First number";
    public static SECOND_NUMBER_INPUT: string = "Second number";
    
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
    
    public static OUTPUT_NAME = "Sum";
    
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
    
    public static OUTPUT_NAME = "Difference";
    
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
    
    public static OUTPUT_NAME = "Product";
    
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
    
    public static OUTPUT_NAME = "Quotient";
    
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
    
    public static OUTPUT_NAME = "Max";
    
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
    
    public static OUTPUT_NAME = "Min";
    
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

export interface ElaborationModeNullGuardOptions {
    dataType: DatumType;
}

export class ElaborationNodeNullGuard extends ElaborationNode {
    
    public static NULLABLE_INPUT: string = "Nullable";
    public static DEFAULT_INPUT: string  = "Default";
    
    public static OUTPUT: string = "Non null value";
    
    public readonly inputs: readonly Datum[];
    
    public readonly outputs: readonly Datum[];
    
    constructor(id: number, public options: ElaborationModeNullGuardOptions) {
        super(id, ElaborationNodeCode.NULL_GUARD);
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
    
    public override toJSON(): ElaborationNodeJSON {
        const result   = super.toJSON();
        result.options = this.options;
        return result;
    }
    
}
