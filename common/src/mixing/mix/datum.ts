import {IsNotEmpty} from "class-decorators";
import {ElaborationNode} from "./elaboration-node";

export class Datum {
    
    constructor(
        public readonly name: string,
        public readonly type: DatumType,
        public readonly nullable: boolean
    ) {
    
    }
    
    public checkValue(value: unknown): boolean {
        if (value == null) {
            return this.nullable;
        }
        switch (this.type) {
            case DatumType.BOOLEAN:
                return typeof value === "boolean";
            case DatumType.NUMBER:
                return typeof value === "number" && isFinite(value);
            case DatumType.TIME:
            case DatumType.DATE:
            case DatumType.DATE_TIME:
                return value instanceof Date;
        }
    }
    
    public toJSON(): DatumJSON {
        return {
            name:     this.name,
            type:     this.type,
            nullable: this.nullable
        };
    }
    
    public static fromJSON(datumJSON: DatumJSON): Datum {
        return new Datum(
            datumJSON.name,
            datumJSON.type,
            datumJSON.nullable == true
        );
    }
    
    public static getDefaultForType(type: DatumType): unknown {
        switch (type) {
            case DatumType.BOOLEAN: {
                return true;
            }
            case DatumType.NUMBER: {
                return 0;
            }
            case DatumType.TIME:
            case DatumType.DATE:
            case DatumType.DATE_TIME: {
                return new Date();
            }
        }
    }
    
    public static getValueFromUnknownAndType(sourceValue: unknown, type: DatumType.BOOLEAN): boolean | null;
    public static getValueFromUnknownAndType(sourceValue: unknown, type: DatumType.NUMBER): number | null;
    public static getValueFromUnknownAndType(sourceValue: unknown, type: DatumType.TIME | DatumType.DATE | DatumType.DATE_TIME): Date | null;
    
    public static getValueFromUnknownAndType(sourceValue: unknown, type: DatumType): number | boolean | Date | null {
        if (sourceValue == null) {
            return null;
        }
        switch (type) {
            case DatumType.BOOLEAN: {
                return sourceValue as boolean;
            }
            case DatumType.NUMBER: {
                return sourceValue as number;
            }
            case DatumType.TIME:
            case DatumType.DATE:
            case DatumType.DATE_TIME: {
                return sourceValue as Date;
            }
        }
    }
}

export interface ElaborationNodeDatum {
    node: ElaborationNode;
    datum: Datum;
    input: boolean;
}

export interface DatumInfo {
    type: DatumType;
    nullable: boolean;
}

export class ExportedDatum extends Datum {
    constructor(name: string,
                type: DatumType,
                nullable: boolean,
                public origin: DatumOrigin,
                public originId: number) {
        super(name, type, nullable);
    }
    
    public get uniqueName(): string {
        return ExportedDatum.uniqueName(this);
    }
    
    public override toJSON(): ExportedDatumJSON {
        return {
            name:     this.name,
            type:     this.type,
            nullable: this.nullable,
            origin:   this.origin,
            originId: this.originId
        };
    }
    
    public static override fromJSON(datumJSON: ExportedDatumJSON): ExportedDatum {
        return new ExportedDatum(
            datumJSON.name,
            datumJSON.type,
            datumJSON.nullable == true,
            datumJSON.origin,
            datumJSON.originId
        );
    }
    
    public equals(exp: ExportedDatum): boolean {
        return this.name === exp.name && this.origin === exp.origin && this.originId === exp.originId;
    }
    
    public static uniqueName(datum: ExportedDatum): string {
        return `${datum.origin}.${datum.originId}.${datum.name}`;
    }
}

export class DatumJSON {
    
    @IsNotEmpty()
    public name: string;
    
    public type: DatumType;
    
    public nullable?: boolean;
    
    constructor(name: string, type: DatumType, nullable: boolean) {
        this.name     = name;
        this.type     = type;
        this.nullable = nullable;
    }
    
}

export class ExportedDatumJSON extends DatumJSON {
    public origin: DatumOrigin;
    public originId: number;
    
    constructor(name: string,
                type: DatumType,
                nullable: boolean,
                origin: DatumOrigin, originId: number) {
        super(name, type, nullable);
        this.origin   = origin;
        this.originId = originId;
    }
}

export enum DatumOrigin {
    EVENT = "EVENT",
    GROUP = "GROUP",
}

export enum DatumType {
    BOOLEAN   = "BOOLEAN",
    NUMBER    = "NUMBER",
    TIME      = "TIME",
    DATE      = "DATE",
    DATE_TIME = "DATE_TIME"
}

export enum DatumChangeType {
    NEW     = "NEW",
    DELETED = "DELETED"
}

export interface DatumChange {
    change: DatumChangeType,
    datum: Datum
}
