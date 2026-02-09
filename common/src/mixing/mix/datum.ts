import {IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Type, ValidateNested} from "rest-decorators";
import {ElaborationNode} from "./elaboration-node";
import {Color, ColorSpace} from "../../utils/color-convert";

export class Datum {
    
    constructor(
        public name: string,
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
            case DatumType.STRING:
                return "";
            case DatumType.COLOR:
                return new DatumTypeColor(DatumTypeColorBase.RGB, 255, 255, 255);
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
    public static getValueFromUnknownAndType(sourceValue: unknown, type: DatumType.COLOR): DatumTypeColor | null;
    public static getValueFromUnknownAndType(sourceValue: unknown, type: DatumType.STRING): string | null;
    
    public static getValueFromUnknownAndType(sourceValue: unknown, type: DatumType): number | boolean | Date | string | DatumTypeColor | null {
        if (sourceValue == null) {
            return null;
        }
        switch (type) {
            case DatumType.STRING:
                return sourceValue as string;
            case DatumType.COLOR:
                return sourceValue as DatumTypeColor;
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
            case DatumType.STRING:
                return typeof value === "string";
            case DatumType.COLOR:
                return DatumTypeColor.checkObject(value);
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
            case DatumType.STRING:
                return typeof value === "string";
            case DatumType.COLOR:
                return DatumTypeColor.checkObject(value);
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
    
    public static compareEquality(dataType: DatumType, firstValue: unknown, secondValue: unknown): boolean {
        if (firstValue == null && secondValue == null) {
            return true;
        }
        if (firstValue == null || secondValue == null) {
            return false;
        }
        switch (dataType) {
            case DatumType.BOOLEAN:
            case DatumType.NUMBER:
            case DatumType.STRING:
                return firstValue === secondValue;
            case DatumType.COLOR:
                return (firstValue as DatumTypeColor).equals(secondValue as DatumTypeColor);
            case DatumType.TIME: {
                const firstAsDate  = firstValue as Date;
                const secondAsDate = secondValue as Date;
                return firstAsDate.getHours() == secondAsDate.getHours()
                       && firstAsDate.getMinutes() == secondAsDate.getMinutes()
                       && firstAsDate.getSeconds() == secondAsDate.getSeconds();
            }
            case DatumType.DATE: {
                const firstAsDate  = firstValue as Date;
                const secondAsDate = secondValue as Date;
                return firstAsDate.getFullYear() == secondAsDate.getFullYear()
                       && firstAsDate.getMonth() == secondAsDate.getMonth()
                       && firstAsDate.getDate() == secondAsDate.getDate();
            }
            case DatumType.DATE_TIME:
                return (firstValue as Date).getTime() === (secondValue as Date).getTime();
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
            case DatumType.STRING:
                return value as string;
            case DatumType.COLOR:
                return DatumTypeColor.fromJSON(value as DatumTypeColorJSON);
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
            case DatumType.STRING:
                return value as string;
            case DatumType.COLOR:
                return (value as DatumTypeColor).toJSON();
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
    
    public sameIdentification(exp: ExportedDatum): boolean {
        return this.name === exp.name && this.origin === exp.origin && this.originName === exp.originName;
    }
    
    public static uniqueName(datum: ExportedDatum): string {
        return `${datum.origin}.${datum.originName}.${datum.name}`;
    }
}

export enum DatumType {
    BOOLEAN   = "BOOLEAN",
    NUMBER    = "NUMBER",
    STRING    = "STRING",
    COLOR     = "COLOR",
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
    GROUP         = "GROUP",
    SENSOR        = "SENSOR",
    SENSOR_DATA   = "SENSOR_DATA",
    SENSOR_UPDATE = "SENSOR_UPDATE",
    SYSTEM        = "SYSTEM",
    CENTER        = "CENTER"
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

export enum DatumTypeColorBase {
    XY  = "XY",
    RGB = "RGB"
}

export class DatumTypeColor {
    
    private _r?: number;
    private _g?: number;
    private _b?: number;
    private _x?: number;
    private _y?: number;
    private _base: DatumTypeColorBase;
    
    constructor(base: DatumTypeColorBase.XY, x: number, y: number);
    constructor(base: DatumTypeColorBase.RGB, r: number, g: number, b: number);
    constructor(base: DatumTypeColorBase, valueA: number, valueB: number, valueC?: number) {
        switch (base) {
            case DatumTypeColorBase.XY:
                this._x = valueA;
                this._y = valueB;
                break;
            case DatumTypeColorBase.RGB:
                this._r = valueA;
                this._g = valueB;
                this._b = valueC;
                break;
        }
        this._base = base;
    }
    
    public get base(): DatumTypeColorBase {
        return this._base;
    }
    
    public set base(newBase: DatumTypeColorBase) {
        if (this._base != newBase) {
            switch (newBase) {
                case DatumTypeColorBase.XY: {
                    if (this._r == undefined || this._g == undefined || this._b == undefined) {
                        return;
                    }
                    const conversion = ColorSpace.sRGB.xyYFromColor(new Color(this._r, this._g, this._b, 1));
                    this._x          = conversion.x;
                    this._y          = conversion.y;
                    this._r          = undefined;
                    this._g          = undefined;
                    this._b          = undefined;
                    break;
                }
                case DatumTypeColorBase.RGB: {
                    if (this._x == undefined || this._y == undefined) {
                        return;
                    }
                    const conversion = ColorSpace.sRGB.colorFromXY(this._x, this._y);
                    this._r = conversion.r;
                    this._g = conversion.g;
                    this._b = conversion.b;
                    this._x = undefined;
                    this._y = undefined;
                    break;
                }
            }
        }
    }
    
    public get r(): number | undefined {
        return this._r;
    }
    
    public get g(): number | undefined {
        return this._g;
    }
    
    public get b(): number | undefined {
        return this._b;
    }
    
    public get x(): number | undefined {
        return this._x;
    }
    
    public get y(): number | undefined {
        return this._y;
    }
    
    public setRGB(r: number, g: number, b: number): void {
        this._base = DatumTypeColorBase.RGB;
        this._r = r;
        this._g = g;
        this._b = b;
        this._x = undefined;
        this._y = undefined;
    }
    
    public setXY(x: number, y: number): void {
        this._base = DatumTypeColorBase.XY;
        this._x = x;
        this._y = y;
        this._r = undefined;
        this._g = undefined;
        this._b = undefined;
    }
    
    public toHEX(): string {
        if (this.base == DatumTypeColorBase.RGB) {
            const r = this.r ?? 255;
            const g = this.g ?? 255;
            const b = this.b ?? 255;
            return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
        } else {
            return ColorSpace.sRGB.colorFromXY(this.x ?? 0.33, this.y ?? 0.33).toHex();
        }
    }
    
    public equals(other: DatumTypeColor): boolean {
        if (this._base != other._base) {
            return false;
        }
        switch (this._base) {
            case DatumTypeColorBase.XY:
                return this._x == other._x && this._y == other._y;
            case DatumTypeColorBase.RGB:
                return this._r == other._r && this._g == other._g && this._b == other._b;
        }
    }
    
    public toJSON(): DatumTypeColorJSON {
        return {
            r:    this._r,
            g:    this._g,
            b:    this._b,
            x:    this._x,
            y:    this._y,
            base: this.base
        };
    }
    
    public static fromJSON(datumTypeColorJSON: DatumTypeColorJSON): DatumTypeColor {
        switch (datumTypeColorJSON.base) {
            case DatumTypeColorBase.XY:
                if (
                    datumTypeColorJSON.x == undefined
                    || datumTypeColorJSON.y == undefined) {
                    throw new Error("Wrong XY data for color");
                }
                return new DatumTypeColor(DatumTypeColorBase.XY, datumTypeColorJSON.x, datumTypeColorJSON.y);
            case DatumTypeColorBase.RGB:
                if (
                    datumTypeColorJSON.r == undefined
                    || datumTypeColorJSON.g == undefined
                    || datumTypeColorJSON.b == undefined
                ) {
                    throw new Error("Wrong RGB data for color");
                }
                return new DatumTypeColor(DatumTypeColorBase.RGB, datumTypeColorJSON.r, datumTypeColorJSON.g, datumTypeColorJSON.b);
        }
    }
    
    public static checkObject(value: unknown): boolean {
        if (typeof value === "object" && value != null) {
            const objValue = value as {
                r?: unknown;
                g?: unknown;
                b?: unknown;
                x?: unknown;
                y?: unknown;
                base: unknown;
            };
            if (objValue.base == DatumTypeColorBase.RGB) {
                if (
                    objValue.r == undefined
                    || objValue.g == undefined
                    || objValue.b == undefined
                ) {
                    return false;
                } else if (
                    typeof objValue.r !== "number" || !isFinite(objValue.r)
                    || typeof objValue.g !== "number" || !isFinite(objValue.g)
                    || typeof objValue.b !== "number" || !isFinite(objValue.b)
                ) {
                    return false;
                }
                return true;
            } else if (objValue.base == DatumTypeColorBase.XY) {
                if (
                    objValue.x == undefined
                    || objValue.y == undefined
                ) {
                    return false;
                } else if (
                    typeof objValue.x !== "number" || !isFinite(objValue.x)
                    || typeof objValue.y !== "number" || !isFinite(objValue.y)
                ) {
                    return false;
                }
                return true;
            }
        }
        return false;
    }
}

export class DatumTypeColorJSON {
    
    @IsNumber()
    @IsOptional()
    public r?: number;
    
    @IsNumber()
    @IsOptional()
    public g?: number;
    
    @IsNumber()
    @IsOptional()
    public b?: number;
    
    @IsNumber()
    @IsOptional()
    public x?: number;
    
    @IsNumber()
    @IsOptional()
    public y?: number;
    
    @IsEnum(DatumTypeColorBase)
    public base: DatumTypeColorBase;
    
    constructor(
        r: number,
        g: number,
        b: number,
        x: number,
        y: number,
        base: DatumTypeColorBase
    ) {
        this.r    = r;
        this.g    = g;
        this.b    = b;
        this.x    = x;
        this.y    = y;
        this.base = base;
    }
    
    
}
