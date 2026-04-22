/**
 * This module defines the core data structures used for variables and data units within the elaboration cycle.
 *
 * @module
 */
import {IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Type, ValidateNested} from "rest-decorators";
import {ElaborationNode} from "./elaboration-node";
import {Color, ColorSpace} from "../../utils/color-convert";
import {DEFAULT_TEMP, MAX_ALLOWED_TEMP, MIN_ALLOWED_TEMP} from "../../utils/constants";


// noinspection ES6UnusedImports
import type {Mix} from "./mix";
// noinspection ES6UnusedImports
import type {SystemParameter} from "../../system/parameter/system-parameter";
// noinspection ES6UnusedImports
import type {SystemTimer} from "../../system/timer/system-timer";
// noinspection ES6UnusedImports
import type {Device} from "../../devices/device";

/**
 * This class represents a single unit of data, or a variable, in the context of the main elaboration cycle.
 * It can represent variables elaborated in a {@link Mix|`Mix`} by an {@link ElaborationNode|`ElaborationNode`}
 * or exposed values in a {@link Device|`Device`}.
 */
export class Datum {
    
    /**
     * Creates an instance of the class.
     *
     * @param {string} name - The unique name to identify the datum.
     * @param {DatumType} type - The type of the datum.
     * @param {boolean} nullable - Whether the value `null` is valid for this datum.
     */
    constructor(
        public name: string,
        public readonly type: DatumType,
        public readonly nullable: boolean
    ) {
    
    }
    
    /**
     * Checks if the provided value meets the criteria to be assigned to this datum.
     *
     * @param {unknown} value - The value to be checked.
     * @returns {boolean} `true` if the value satisfies the conditions, `false` otherwise.
     */
    public checkValue(value: unknown): boolean {
        return Datum.checkValue(value, this.type, this.nullable);
    }
    
    /**
     * Converts the datum instance into its JSON representation.
     *
     * @returns {DatumJSON} The JSON representation of `this`.
     */
    public toJSON(): DatumJSON {
        return {
            name:     this.name,
            type:     this.type,
            nullable: this.nullable
        };
    }
    
    /**
     * Constructs a new {@link Datum|`Datum`} instance from a given JSON representation.
     *
     * @param {DatumJSON} datumJSON - The JSON representation of the datum.
     * @returns {Datum} The datum object constructed from the provided JSON.
     */
    public static fromJSON(datumJSON: DatumJSON): Datum {
        return new Datum(
            datumJSON.name,
            datumJSON.type,
            datumJSON.nullable
        );
    }
    
    /**
     * Returns the default non-null value for the specified type.
     *
     * @param {DatumType} type - The type for which the default value is requested.
     * @returns {unknown} The default value corresponding to the given type.
     */
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
            case DatumType.COLOR_TEMP: {
                return DEFAULT_TEMP;
            }
        }
    }
    
    /**
     * Transforms the unknown value (assumed to be already checked as valid with {@link Datum#checkValue|`Datum.checkValue`})
     * of {@link DatumType|`DatumType`} {@link DatumType.BOOLEAN|`BOOLEAN`} into a boolean.
     *
     * @param sourceValue - The value to be converted, as unknown type.
     * @param type - {@link DatumType.BOOLEAN|`BOOLEAN`}.
     * @returns `sourceValue` cast into a boolean.
     */
    public static getValueFromUnknownAndType(sourceValue: unknown, type: DatumType.BOOLEAN): boolean | null;
    /**
     * Transforms the unknown value (assumed to be already checked as valid with {@link Datum#checkValue|`Datum.checkValue`})
     * of {@link DatumType|`DatumType`} {@link DatumType.NUMBER|`NUMBER`} or {@link DatumType.COLOR_TEMP|`COLOR_TEMP`} into a number.
     *
     * @param sourceValue - The value to be converted, as unknown type.
     * @param type - {@link DatumType.NUMBER|`NUMBER`} or {@link DatumType.COLOR_TEMP|`COLOR_TEMP`}.
     * @returns `sourceValue` cast into a number.
     */
    public static getValueFromUnknownAndType(sourceValue: unknown, type: DatumType.NUMBER | DatumType.COLOR_TEMP): number | null;
    /**
     * Transforms the unknown value (assumed to be already checked as valid with {@link Datum#checkValue|`Datum.checkValue`})
     * of {@link DatumType|`DatumType`} {@link DatumType.TIME|`TIME`}, {@link DatumType.DATE|`DATE`} or {@link DatumType.DATE_TIME|`DATE_TIME`} into a Date.
     *
     * @param sourceValue - The value to be converted, as unknown type.
     * @param type - {@link DatumType.TIME|`TIME`}, {@link DatumType.DATE|`DATE`} or {@link DatumType.DATE_TIME|`DATE_TIME`}.
     * @returns `sourceValue` cast into a Date.
     */
    public static getValueFromUnknownAndType(sourceValue: unknown, type: DatumType.TIME | DatumType.DATE | DatumType.DATE_TIME): Date | null;
    /**
     * Transforms the unknown value (assumed to be already checked as valid with {@link Datum#checkValue|`Datum.checkValue`})
     * of {@link DatumType|`DatumType`} {@link DatumType.COLOR|`COLOR`} into a DatumTypeColor.
     *
     * @param sourceValue - The value to be converted, as unknown type.
     * @param type - {@link DatumType.COLOR|`COLOR`}.
     * @returns `sourceValue` cast into a DatumTypeColor.
     */
    public static getValueFromUnknownAndType(sourceValue: unknown, type: DatumType.COLOR): DatumTypeColor | null;
    /**
     * Transforms the unknown value (assumed to be already checked as valid with {@link Datum#checkValue|`Datum.checkValue`})
     * of {@link DatumType|`DatumType`} {@link DatumType.STRING|`STRING`} into a string.
     *
     * @param sourceValue - The value to be converted, as unknown type.
     * @param type - {@link DatumType.STRING|`STRING`}.
     * @returns `sourceValue` cast into a string.
     */
    public static getValueFromUnknownAndType(sourceValue: unknown, type: DatumType.STRING): string | null;
    
    /**
     * Transforms the unknown value (assumed to be already checked as valid with {@link Datum#checkValue|`Datum.checkValue`})
     * into the correct JavaScript builtin/class, based on the type.
     *
     * @param {unknown} sourceValue - The value to be converted, as unknown type.
     * @param {DatumType} type - The DatumType of the value.
     * @returns {number | boolean | Date | string | DatumTypeColor | null} `sourceValue` cast into the correct type.
     */
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
            case DatumType.COLOR_TEMP:
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
    
    
    /**
     * Checks if the provided value meets the criteria to be assigned to a datum of a specific type, with a specific
     * nullability condition.
     *
     * @param {unknown} value - The value to be checked.
     * @param {DatumType} type - The type of the datum.
     * @param {boolean} nullable - Whether to accept null.
     * @returns {boolean} `true` if the value satisfies the conditions, `false` otherwise.
     */
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
            case DatumType.COLOR_TEMP:
            case DatumType.NUMBER:
                return typeof value === "number" && isFinite(value);
            case DatumType.TIME:
            case DatumType.DATE:
            case DatumType.DATE_TIME:
                return value instanceof Date;
        }
    }
    
    /**
     * Checks if the provided value meets the criteria to be assigned to a datum of a specific type, with a specific
     * nullability condition, in a serialized context. The difference with {@link Datum#checkValue|`Datum.checkValue`}
     * is that the check is done regarding the serialization of the values in a `*JSON` class, where, for example,
     * `Date` objects are represented as their epoch (of type `number`).
     *
     * @param {unknown} value - The value to be checked.
     * @param {DatumType} type - The type of the datum.
     * @param {boolean} nullable - Whether to accept null.
     * @returns {boolean} `true` if the value satisfies the conditions, `false` otherwise.
     */
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
            case DatumType.COLOR_TEMP:
            case DatumType.NUMBER:
                return typeof value === "number" && isFinite(value);
            case DatumType.TIME:
            case DatumType.DATE:
            case DatumType.DATE_TIME:
                return typeof value === "number";
        }
    }
    
    /**
     * Compares two values for equality based on the specified data type.
     *
     * N.B.: Especially in the context of {@link DatumType.TIME|`TIME`}, {@link DatumType.DATE|`DATE`} and {@link DatumType.DATE_TIME|`DATE_TIME`},
     *       this doesn't mean `==` or `===` comparison, since, for example, in {@link DatumType.TIME|`TIME`} only the hour, minutes and seconds are compared.
     *
     * @param {DatumType} dataType - The type of the data to dictate how the comparison should be performed.
     * @param {unknown} firstValue - The first value to be compared.
     * @param {unknown} secondValue - The second value to be compared.
     * @returns {boolean} Returns true if the values are considered equal for the given data type, otherwise false.
     */
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
            case DatumType.COLOR_TEMP:
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
    
    /**
     * Converts a serialized value from its JSON representation back into its runtime type,
     * according to the target desired type.
     *
     * This function cannot distinguish between types that are serialized in the same builtin/object.
     *
     * @param {unknown} value - The serialized value to convert.
     * @param {DatumType} type - The expected data type.
     * @returns {unknown} The converted value (e.g., Date object, DatumTypeColor, etc.).
     * @throws {Error} If the value does not match the expected JSON format for the type.
     */
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
            case DatumType.COLOR_TEMP: {
                return Math.min(MAX_ALLOWED_TEMP, Math.max(MIN_ALLOWED_TEMP, value as number));
            }
            case DatumType.TIME: {
                const date = new Date(value as number);
                date.setFullYear(2000, 0, 1);
                return date;
            }
            case DatumType.DATE: {
                const date = new Date(value as number);
                date.setHours(0, 0, 0, 0);
                return date;
            }
            case DatumType.DATE_TIME: {
                const date = new Date(value as number);
                return date;
            }
        }
    }
    
    /**
     * Converts a value from its runtime type into its serialized JSON representation,
     * according to the target desired type.
     *
     * @param {unknown} value - The runtime value to serialize.
     * @param {DatumType} type - The data type of the value.
     * @returns {unknown} The serialized value (e.g., epoch for Dates, JSON object for Colors).
     * @throws {Error} If the value does not match the expected runtime format for the type.
     */
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
            case DatumType.COLOR_TEMP:
            case DatumType.NUMBER: {
                return value as number;
            }
            case DatumType.TIME: {
                const date = value as Date;
                date.setFullYear(2000, 0, 1);
                return date.getTime();
            }
            case DatumType.DATE: {
                const date = value as Date;
                date.setHours(0, 0, 0, 0);
                return date.getTime();
            }
            case DatumType.DATE_TIME: {
                const date = value as Date;
                return date.getTime();
            }
        }
    }
    
}

/**
 * A {@link Datum|`Datum`} when used as an input/output value of an {@link ElaborationNode|`ElaborationNode`}.
 */
export interface ElaborationNodeDatum {
    /** The elaboration node to which the datum belongs. */
    node: ElaborationNode;
    /** The datum itself. */
    datum: Datum;
    /** Whether the datum is an input (when `true`) or output (when `false`). */
    input: boolean;
}

/**
 * The type information of a {@link Datum|`Datum`}.
 */
export interface DatumInfo {
    /** The type of the datum. */
    type: DatumType;
    /** Whether the value `null` is valid for this datum. */
    nullable: boolean;
}

/**
 * A {@link Datum|`Datum`} when used as input or output for a {@link Mix|`Mix`}.
 *
 * This class extends {@link Datum|`Datum`} by adding information not only on the
 * datum's properties itself, but also about the origin of the datum so that the
 * original datum can be identified in the whole system.
 */
export class ExportedDatum extends Datum {
    
    /**
     * Creates an instance of the class.
     *
     * @param {string} name - Same as in {@link Datum|`new Datum()`}.
     * @param {DatumType} type - Same as in {@link Datum|`new Datum()`}.
     * @param {boolean} nullable - Same as in {@link Datum|`new Datum()`}.
     * @param {DatumOrigin} origin - The type of origin the datum is assigned to.
     * @param {string} originName - The unique name of the origin the datum is assigned to.
     * @param {string} [displayName] - The display name of the datum, used to identify it in the UI.
     * @param {string} [originDisplayName] - The display name of the origin the datum is assigned to, used to identify the origin in the UI.
     */
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
    
    
    /* eslint-disable jsdoc/no-undefined-types */
    /**
     * Generates a reference string for `this`, unique in the whole system, using {@link ExportedDatum.origin|the origin's type},
     * {@link ExportedDatum.originName|the origin's unique name} and {@link Datum#name|the datum unique name}.
     */
    public get uniqueName(): string {
        return ExportedDatum.uniqueName(this);
    }
    
    /* eslint-enable jsdoc/no-undefined-types */
    
    /**
     * Converts the exported datum instance into its JSON representation.
     *
     * @returns {ExportedDatumJSON} The JSON representation of `this`.
     */
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
    
    /**
     * Constructs a new {@link ExportedDatum|`ExportedDatum`} instance from a given JSON representation.
     *
     * @param {ExportedDatumJSON} datumJSON - The JSON representation of the exported datum.
     * @returns {ExportedDatum} The exported datum object constructed from the provided JSON.
     */
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
    
    /**
     * Compares the current object's identification details with those of the provided ExportedDatum object.
     *
     * @param {ExportedDatum} exp - The object to compare against, containing identification details.
     * @returns {boolean} Returns `true` if the names, origin type and origin names of both objects match, `false` otherwise.
     */
    public sameIdentification(exp: ExportedDatum): boolean {
        return this.name === exp.name && this.origin === exp.origin && this.originName === exp.originName;
    }
    
    
    /* eslint-disable jsdoc/no-undefined-types */
    /**
     * Generates a reference string for a datum, unique in the whole system, using {@link ExportedDatum.origin|the origin's type},
     * {@link ExportedDatum.originName|the origin's unique name} and {@link Datum#name|the datum unique name}.
     *
     * @param {ExportedDatum} datum - The datum for which to generate the unique reference.
     * @returns {string} The unique reference for the datum.
     */
    public static uniqueName(datum: ExportedDatum): string {
        return `${datum.origin}.${datum.originName}.${datum.name}`;
    }
    
    /* eslint-enable jsdoc/no-undefined-types */
}

/**
 * The abstract data type a `{@link Datum|`Datum`} can be assigned to.
 */
export enum DatumType {
    /** A boolean value, `true` or `false`. */
    BOOLEAN    = "BOOLEAN",
    /** Any number, finite or not finite or `NaN`. */
    NUMBER     = "NUMBER",
    /** Any string. */
    STRING     = "STRING",
    /** A color for a light, expressed in RGB, XY or HSB. */
    COLOR      = "COLOR",
    /** The temperature of a light, expressed in K or mired. */
    COLOR_TEMP = "COLOR_TEMP",
    /** Hour, minute and second in any day. */
    TIME       = "TIME",
    /** A specific year, month and day. */
    DATE       = "DATE",
    /** A specific year, month, day, hour, minute and second. */
    DATE_TIME  = "DATE_TIME"
}

/**
 * The serialization of the class {@link Datum|`Datum`}.
 */
export class DatumJSON {
    
    /**
     * Serialization of the property {@link Datum#name|`name`}.
     */
    @IsNotEmpty()
    public name: string;
    
    /**
     * Serialization of the property {@link Datum#type|`type`}.
     */
    @IsEnum(DatumType)
    public type: DatumType;
    
    /**
     * Serialization of the property {@link Datum#nullable|`nullable`}.
     */
    @IsBoolean()
    public nullable: boolean;
    
    /**
     * Creates an instance of the class.
     *
     * @param {string} name - Value for {@link Datum#name|`name`}.
     * @param {DatumType} type - Value for {@link Datum#type|`type`}.
     * @param {boolean} nullable - Value for {@link Datum#nullable|`nullable`}.
     */
    constructor(name: string, type: DatumType, nullable: boolean) {
        this.name     = name;
        this.type     = type;
        this.nullable = nullable;
    }
    
}

/**
 * An enum containing all the possible origins where a datum can be assigned to.
 */
export enum DatumOrigin {
    /** The datum is an output of a {@link Mix|`Mix`} assigned to a group. */
    GROUP         = "GROUP",
    /** The datum is an output of a {@link Mix|`Mix`} assigned to a sensor. */
    SENSOR        = "SENSOR",
    /** The datum is the raw value coming from a sensor's status in zigbee2mqtt. */
    SENSOR_DATA   = "SENSOR_DATA",
    /** The datum is the update status value (whether the value has been changed this cycle) coming from a sensor's status in zigbee2mqtt. */
    SENSOR_UPDATE = "SENSOR_UPDATE",
    /** The datum comes from some system behavior/data stream, like {@link SystemParameter|`SystemParameter`} or {@link SystemTimer|`SystemTimer`}. */
    SYSTEM        = "SYSTEM",
    /** The datum comes from a central mix (mix in the central stage of the cycle, between sensor stage and actuator stage). */
    CENTER        = "CENTER"
}

/**
 * The serialization of the class {@link ExportedDatum|`ExportedDatum`}.
 */
export class ExportedDatumJSON extends DatumJSON {
    
    /**
     * Serialization of the property {@link ExportedDatum#origin|`origin`}.
     */
    @IsEnum(DatumOrigin)
    public origin: DatumOrigin;
    
    /**
     * Serialization of the property {@link ExportedDatum#originName|`originName`}.
     */
    @IsNotEmpty()
    public originName: string;
    
    /**
     * Serialization of the property {@link ExportedDatum#displayName|`displayName`}.
     */
    @IsOptional()
    @IsString()
    public displayName?: string;
    
    /**
     * Serialization of the property {@link ExportedDatum#originDisplayName|`originDisplayName`}.
     */
    @IsOptional()
    public originDisplayName?: string;
    
    /**
     * Creates an instance of the class.
     *
     * @param {string} name - Value for {@link Datum#name|`name`}.
     * @param {DatumType} type - Value for {@link Datum#type|`type`}.
     * @param {boolean} nullable - Value for {@link Datum#nullable|`nullable`}.
     * @param {DatumOrigin} origin - Value for {@link ExportedDatum#origin|`origin`}.
     * @param {string} originName - Value for {@link ExportedDatum#originName|`originName`}.
     * @param {string} [displayName] - Value for {@link ExportedDatum#displayName|`displayName`}.
     * @param {string} [originDisplayName] - Value for {@link ExportedDatum#originDisplayName|`originDisplayName`}.
     */
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

/**
 * Enumeration containing the type of datum change actions.
 */
export enum DatumChangeType {
    /** The action is to create a datum. */
    NEW     = "NEW",
    /** The action is to delete a datum. */
    DELETED = "DELETED"
}

/**
 * Represents a change related to a datum, encapsulating the type of change
 * and the associated datum data.
 */
export class DatumChange {
    
    /**
     * The type of change.
     */
    public change: DatumChangeType;
    
    /**
     * The datum that was affected by the change.
     */
    public datum: Datum;
    
    /**
     * Creates an instance of the class.
     *
     * @param {DatumChangeType} change - The type of change.
     * @param {Datum} datum - The datum that was affected by the change.
     */
    constructor(change: DatumChangeType, datum: Datum) {
        this.change = change;
        this.datum  = datum;
    }
    
    /**
     * Converts the datum change instance into its JSON representation.
     *
     * @returns {DatumChangeJSON} The JSON representation of `this`.
     */
    public toJSON(): DatumChangeJSON {
        return {
            change: this.change,
            datum:  this.datum.toJSON()
        };
    }
    
    /**
     * Constructs a new {@link DatumChange|`DatumChange`} instance from a given JSON representation.
     *
     * @param {DatumChangeJSON} datumChangeJSON - The JSON representation of the datum change.
     * @returns {DatumChange} The datum change object constructed from the provided JSON.
     */
    public static fromJSON(datumChangeJSON: DatumChangeJSON): DatumChange {
        return new DatumChange(datumChangeJSON.change, Datum.fromJSON(datumChangeJSON.datum));
    }
    
}

/**
 * The serialization of the class {@link DatumChange|`DatumChange`}.
 */
export class DatumChangeJSON {
    
    /**
     * Serialization of the property {@link DatumChange#change|`change`}.
     */
    @IsEnum(DatumChangeType)
    public change: DatumChangeType;
    
    /**
     * Serialization of the property {@link DatumChange#datum|`datum`}.
     */
    @ValidateNested()
    @Type(() => DatumJSON)
    public datum: DatumJSON;
    
    /**
     * Creates an instance of the class.
     *
     * @param {DatumChangeType} change - Value for {@link DatumChange#change|`change`}.
     * @param {DatumJSON} datum - Value for {@link DatumChange#datum|`datum`}.
     */
    constructor(change: DatumChangeType, datum: DatumJSON) {
        this.change = change;
        this.datum  = datum;
    }
    
}

/**
 * The color space in which a color can be defined.
 */
export enum DatumTypeColorBase {
    /** The CIE 1931 color space, defining color in the XY plane (without luminance information). */
    XY  = "XY",
    /** The generic RGB color space. */
    RGB = "RGB"
}

/**
 * The value of a {@link Datum|`Datum`} when the type is {@link DatumType.COLOR|`COLOR`}.
 */
export class DatumTypeColor {
    
    
    /** The red value in the RGB base/color space. */
    private _r?: number;
    /** The green value in the RGB base/color space. */
    private _g?: number;
    /** The blue value in the RGB base/color space. */
    private _b?: number;
    /** The X value in the XY base/color space. */
    private _x?: number;
    /** The Y value in the XY base/color space. */
    private _y?: number;
    /** The base for this color, i.e., the color space in which the color is defined. */
    private _base: DatumTypeColorBase;
    
    /**
     * Constructs an instance of the class in the XY color space.
     *
     * @param {DatumTypeColorBase.XY} base - The color base {@link DatumTypeColorBase.XY|`XY`}.
     * @param {number} x - The x-coordinate value.
     * @param {number} y - The y-coordinate value.
     */
    constructor(base: DatumTypeColorBase.XY, x: number, y: number);
    /**
     * Constructs an instance of the class in the RGB color space.
     *
     * @param {DatumTypeColorBase.RGB} base - The color base {@link DatumTypeColorBase.RGB|`RGB`}.
     * @param r - The red value.
     * @param g - The green value.
     * @param b - The blue value.
     */
    constructor(base: DatumTypeColorBase.RGB, r: number, g: number, b: number);
    /**
     * Constructs an instance of the class in the correct color space.
     *
     * @param {DatumTypeColorBase} base - The color base (or color space).
     * @param {number} valueA - The first value.
     * @param {number} valueB - The second value.
     * @param {number} [valueC] - The third value - only used for blue in {@link DatumTypeColorBase.RGB|`RGB`}.
     */
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
    
    /**
     * The base for this color, i.e., the color space in which the color is defined.
     */
    public get base(): DatumTypeColorBase {
        return this._base;
    }
    
    /**
     * Sets the base (color space) in which the color is defined. Converts the represented color from one
     * base to the other.
     *
     * <u>Remember that the conversion loses or clips the color.</u> From RGB to XY, the luminance is lost,
     * while XY encodes more hues/saturation values than RGB.
     *
     * @param {DatumTypeColorBase} newBase - The new base.
     */
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
    
    /**
     * The red value in the RGB base/color space.
     * If the color is not in RGB, this value is `undefined`.
     */
    public get r(): number | undefined {
        return this._r;
    }
    
    /**
     * The green value in the RGB base/color space.
     * If the color is not in RGB, this value is `undefined`.
     */
    public get g(): number | undefined {
        return this._g;
    }
    
    /**
     * The blue value in the RGB base/color space.
     * If the color is not in RGB, this value is `undefined`.
     */
    public get b(): number | undefined {
        return this._b;
    }
    
    /**
     * The X value in the XY base/color space.
     * If the color is not in XY, this value is `undefined`.
     */
    public get x(): number | undefined {
        return this._x;
    }
    
    /**
     * The Y value in the XY base/color space.
     * If the color is not in XY, this value is `undefined`.
     */
    public get y(): number | undefined {
        return this._y;
    }
    
    /**
     * Sets the color in the RGB base/color space. This changes the base to RGB.
     *
     * @param {number} r - Red.
     * @param {number} g - Green.
     * @param {number} b - Blue.
     */
    public setRGB(r: number, g: number, b: number): void {
        this._base = DatumTypeColorBase.RGB;
        this._r = r;
        this._g = g;
        this._b = b;
        this._x = undefined;
        this._y = undefined;
    }
    
    /**
     * Sets the color in the XY base/color space. This changes the base to XY.
     *
     * @param {number} x - X.
     * @param {number} y - Y.
     */
    public setXY(x: number, y: number): void {
        this._base = DatumTypeColorBase.XY;
        this._x = x;
        this._y = y;
        this._r = undefined;
        this._g = undefined;
        this._b = undefined;
    }
    
    /**
     * Returns `this` represented in HEX format (#RRGGBB), converted if the color is not in RGB base.
     *
     * @returns {string} The color in HEX format.
     */
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
    
    /**
     * Checks if another color is equal to `this`. If the colors are in two different bases/color spaces,
     * they are always not equal, even if one is the equivalent of the other after conversion.
     *
     * @param {DatumTypeColor} other - The color to compare with.
     * @returns {boolean} Whether `other` is equal to `this` or not.
     */
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
    
    /**
     * Converts the color instance into its JSON representation.
     *
     * @returns {DatumTypeColorJSON} The JSON representation of `this`.
     */
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
    
    /**
     * Constructs a new {@link DatumTypeColor|`DatumTypeColor`} instance from a given JSON representation.
     *
     * @param {DatumTypeColorJSON} datumTypeColorJSON - The JSON representation of the color.
     * @returns {DatumTypeColor} The datumTypeColor object constructed from the provided JSON.
     * @throws {Error} If the JSON data is missing required fields for the specified color base.
     */
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
    
    /**
     * Check whether a value is a valid representation of {@link DatumTypeColor|`DatumTypeColor`}.
     *
     * @param {unknown} value - The value to be checked.
     * @returns {boolean} `true` if the value satisfies the conditions, `false` otherwise.
     */
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

/**
 * The serialization of the class {@link DatumType|`DatumType`}.
 */
export class DatumTypeColorJSON {
    
    
    /**
     * Serialization of the property {@link DatumTypeColor#r|`r`}.
     */
    @IsNumber()
    @IsOptional()
    public r?: number;
    
    /**
     * Serialization of the property {@link DatumTypeColor#g|`g`}.
     */
    @IsNumber()
    @IsOptional()
    public g?: number;
    
    /**
     * Serialization of the property {@link DatumTypeColor#b|`b`}.
     */
    @IsNumber()
    @IsOptional()
    public b?: number;
    
    /**
     * Serialization of the property {@link DatumTypeColor#x|`x`}.
     */
    @IsNumber()
    @IsOptional()
    public x?: number;
    
    /**
     * Serialization of the property {@link DatumTypeColor#y|`y`}.
     */
    @IsNumber()
    @IsOptional()
    public y?: number;
    
    /**
     * Serialization of the property {@link DatumTypeColor#base|`base`}.
     */
    @IsEnum(DatumTypeColorBase)
    public base: DatumTypeColorBase;
    
    /**
     * Creates an instance of the class.
     *
     * @param {number} r - Value for {@link DatumTypeColor#r|`r`}.
     * @param {number} g - Value for {@link DatumTypeColor#g|`g`}.
     * @param {number} b - Value for {@link DatumTypeColor#b|`b`}.
     * @param {number} x - Value for {@link DatumTypeColor#x|`x`}.
     * @param {number} y - Value for {@link DatumTypeColor#y|`y`}.
     * @param {DatumTypeColorBase} base - Value for {@link DatumTypeColor#base|`base`}.
     */
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
