import {IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Type, ValidateNested} from "rest-decorators";
import {ElaborationNode} from "./elaboration-node";

export class Datum {
    
    constructor(
        public readonly name: string,
        public readonly type: DatumType,
        public readonly nullable: boolean
    ) {
    
    }
    
    public checkValue(value: unknown): boolean {
        return Datum.checkValue(value, this.type, this.nullable);
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
            datumJSON.nullable
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
    
    public static checkValue(value: unknown, type: DatumType, nullable: boolean): boolean {
        if (value == null) {
            return nullable;
        }
        switch (type) {
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
    
    public static checkValueJSON(value: unknown, type: DatumType, nullable: boolean): boolean {
        if (value == null) {
            return nullable;
        }
        switch (type) {
            case DatumType.BOOLEAN:
                return typeof value === "boolean";
            case DatumType.NUMBER:
                return typeof value === "number" && isFinite(value);
            case DatumType.TIME:
            case DatumType.DATE:
            case DatumType.DATE_TIME:
                return typeof value === "number";
        }
    }
    
    public static valueFromJSON(value: unknown, type: DatumType): unknown {
        if (!Datum.checkValueJSON(value, type, true)) {
            throw new Error("Incompatible value and types");
        }
        if (value == null) {
            return null;
        }
        switch (type) {
            case DatumType.BOOLEAN: {
                return value as boolean;
            }
            case DatumType.NUMBER: {
                return value as number;
            }
            case DatumType.TIME:
            case DatumType.DATE:
            case DatumType.DATE_TIME: {
                return new Date(value as number);
            }
        }
    }
    
    public static valueToJSON(value: unknown, type: DatumType): unknown {
        if (!Datum.checkValue(value, type, true)) {
            throw new Error("Incompatible value and times");
        }
        if (value == null) {
            return null;
        }
        switch (type) {
            case DatumType.BOOLEAN: {
                return value as boolean;
            }
            case DatumType.NUMBER: {
                return value as number;
            }
            case DatumType.TIME:
            case DatumType.DATE:
            case DatumType.DATE_TIME: {
                return (value as Date).getTime();
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
    constructor(
        name: string,
        type: DatumType,
        nullable: boolean,
        public origin: DatumOrigin,
        public originName: string,
        public displayName?: string,
        public originDisplayName?: string
    ) {
        super(name, type, nullable);
    }
    
    public get uniqueName(): string {
        return ExportedDatum.uniqueName(this);
    }
    
    public override toJSON(): ExportedDatumJSON {
        return {
            name:              this.name,
            type:              this.type,
            nullable:          this.nullable,
            origin:            this.origin,
            originName:        this.originName,
            displayName:       this.displayName,
            originDisplayName: this.originDisplayName
        };
    }
    
    public static override fromJSON(datumJSON: ExportedDatumJSON): ExportedDatum {
        return new ExportedDatum(
            datumJSON.name,
            datumJSON.type,
            datumJSON.nullable,
            datumJSON.origin,
            datumJSON.originName,
            datumJSON.displayName,
            datumJSON.originDisplayName
        );
    }
    
    public equals(exp: ExportedDatum): boolean {
        return this.name === exp.name && this.origin === exp.origin && this.originName === exp.originName;
    }
    
    public static uniqueName(datum: ExportedDatum): string {
        return `${datum.origin}.${datum.originName}.${datum.name}`;
    }
}

export enum DatumType {
    BOOLEAN   = "BOOLEAN",
    NUMBER    = "NUMBER",
    TIME      = "TIME",
    DATE      = "DATE",
    DATE_TIME = "DATE_TIME"
}

export class DatumJSON {
    
    @IsNotEmpty()
    public name: string;
    
    @IsEnum(DatumType)
    public type: DatumType;
    
    @IsBoolean()
    public nullable: boolean;
    
    constructor(name: string, type: DatumType, nullable: boolean) {
        this.name     = name;
        this.type     = type;
        this.nullable = nullable;
    }
    
}

export enum DatumOrigin {
    GROUP  = "GROUP",
    SENSOR = "SENSOR",
    SENSOR_DATA = "SENSOR_DATA",
    SYSTEM = "SYSTEM",
}

export class ExportedDatumJSON extends DatumJSON {
    
    @IsEnum(DatumOrigin)
    public origin: DatumOrigin;
    
    @IsNotEmpty()
    public originName: string;
    
    @IsOptional()
    @IsString()
    public displayName?: string;
    
    @IsOptional()
    public originDisplayName?: string;
    
    constructor(name: string,
                type: DatumType,
                nullable: boolean,
                origin: DatumOrigin,
                originName: string,
                displayName?: string,
                originDisplayName?: string) {
        super(name, type, nullable);
        this.origin            = origin;
        this.originName        = originName;
        this.displayName       = displayName;
        this.originDisplayName = originDisplayName;
    }
}

export enum DatumChangeType {
    NEW     = "NEW",
    DELETED = "DELETED"
}

export class DatumChange {
    
    public change: DatumChangeType;
    
    public datum: Datum;
    
    constructor(change: DatumChangeType, datum: Datum) {
        this.change = change;
        this.datum  = datum;
    }
    
    public toJSON(): DatumChangeJSON {
        return {
            change: this.change,
            datum:  this.datum.toJSON()
        };
    }
    
    public static fromJSON(json: DatumChangeJSON): DatumChange {
        return new DatumChange(json.change, Datum.fromJSON(json.datum));
    }
    
}

export class DatumChangeJSON {
    
    @IsEnum(DatumChangeType)
    public change: DatumChangeType;
    
    @ValidateNested()
    @Type(() => DatumJSON)
    public datum: DatumJSON;
    
    constructor(change: DatumChangeType, datum: DatumJSON) {
        this.change = change;
        this.datum  = datum;
    }
    
}
