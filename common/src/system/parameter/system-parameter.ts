/**
 * This module contains {@link SystemParameter|`SystemParameter`} and the related classes, to define
 * custom parameters, values available all through the system.
 *
 * @module
 */
import {Datum, DatumJSON} from "../../mixing/mix/datum";
import {Allow, IsNotEmpty, Type, ValidateNested} from "rest-decorators";

// noinspection ES6UnusedImports
import {Mix} from "../../mixing/mix/mix";

/**
 * A parameter in the system. Parameters are values that are available as {@link Mix#inputs|`inputs`} for
 * {@link Mix|`Mix`es}, and are consistent in the whole system to any that use them, and can be easily
 * changed in the system view on the frontend.
 */
export class SystemParameter {
    
    /**
     * The type of the parameter.
     *
     * @see {@link SystemParameter#datum|`datum`}.
     */
    private _datum: Datum;
    /**
     * The parameter's value.
     *
     * @see {@link SystemParameter#value|`value`}.
     */
    private _value: unknown;
    
    /**
     * Creates an instance for the class.
     *
     * @param {string} displayName - The name that is used to display the parameter in the UI.
     * @param {Datum} datum - The type of the parameter.
     * @param {unknown} value - The value of the parameter.
     * @throws {Error} When the value given to the parameter is of the wrong type.
     */
    constructor(public displayName: string, datum: Datum, value?: unknown) {
        this._datum = datum;
        this.editDatum(datum, value);
    }
    
    /**
     * The type of the parameter. This value is also used to identify the parameter uniquely through {@link Datum#name|`Datum.name`}.
     */
    public get datum(): Datum {
        return this._datum;
    }
    
    /**
     * The parameter's value.
     */
    public get value(): unknown {
        return this._value;
    }
    
    /**
     * Set the type of the parameter. Uses {@link SystemParameter#editDatum|`editDatum()`} to assure the new
     * value is consistent with the datum.
     */
    public set value(value: unknown) {
        this.editDatum(this._datum, value);
    }
    
    /**
     * The unique name to identify the parameter in the system.
     * It's the same as {@link SystemParameter#datum|`datum`}`.`{@link Datum#name|`name`}.
     */
    public get name(): string {
        return this._datum.name;
    }
    
    /**
     * Edit the datum linked to the parameter. Assures that {@link SystemParameter#value|`value`} is set
     * to `null` or {@link Datum.getDefaultForType|the type's default} to keep consistency with the
     * type.
     *
     * @param {Datum} newDatum - The new datum information to change.
     * @throws {Error} When the value given to the parameter is of the wrong type.
     */
    public editDatum(newDatum: Datum): void;
    /**
     * Edit the datum and value linked to the parameter. Assures that the new datum and the
     * new value are consistent and not violating type restrictions.
     *
     * @param {Datum} newDatum - The new datum information to change.
     * @param {unknown} newValue - The new value to be assigned to the parameter.
     * @throws {Error} When the value given to the parameter is of the wrong type.
     */
    public editDatum(newDatum: Datum, newValue: unknown): void;
    /**
     * Edit the datum and possibly the value linked to the parameter. Assures that the new datum and the
     * new {@link SystemParameter#value|`value`} are consistent and not violating type restrictions,
     * if a value is provided, otherwise sets the vale to {@link Datum.getDefaultForType|the type's default}.
     *
     * @param {Datum} newDatum - The new datum information to change.
     * @param {unknown} [newValue] - If set, the new value to be assigned to the parameter.
     *                               If `undefined` or not set, the value will be set according to type and {@link Datum.getDefaultForType|its default}.
     * @throws {Error} When the value given to the parameter is of the wrong type.
     */
    public editDatum(newDatum: Datum, newValue?: unknown): void {
        if (newValue == undefined) {
            if (!newDatum.nullable) {
                this._value = Datum.getDefaultForType(newDatum.type);
            } else {
                this._value = null;
            }
        } else {
            if (!newDatum.checkValue(newValue)) {
                throw new Error("The value given to the parameter is of the wrong type.");
            }
        }
        this._value = newValue;
        this._datum = new Datum(this._datum.name, newDatum.type, newDatum.nullable);
    }
    
    /**
     * Converts the system parameter instance into its JSON representation.
     *
     * @returns {SystemParameterJSON} The JSON representation of `this`.
     */
    public toJSON(): SystemParameterJSON {
        return new SystemParameterJSON(this.displayName, this._datum.toJSON(), Datum.valueToJSON(this._value, this.datum.type));
    }
    
    /**
     * Constructs a new {@link SystemParameter|`SystemParameter`} instance from a given JSON representation.
     *
     * @param {SystemParameterJSON} systemParameterJSON - The JSON representation of the system parameter.
     * @returns {SystemParameter} The system parameter object constructed from the provided JSON.
     */
    public static fromJSON(systemParameterJSON: SystemParameterJSON): SystemParameter {
        const datum = Datum.fromJSON(systemParameterJSON.datum);
        return new SystemParameter(
            systemParameterJSON.displayName,
            datum,
            Datum.valueFromJSON(
                systemParameterJSON.value,
                datum.type
            )
        );
    }
    
}

/**
 * The serialization of the class {@link SystemParameter|`SystemParameter`}.
 */
export class SystemParameterJSON {
    
    /**
     * Serialization of the property {@link SystemParameter#displayName|`displayName`}.
     */
    @IsNotEmpty()
    public displayName: string;
    
    /**
     * Serialization of the property {@link SystemParameter#datum|`datum`}.
     */
    @ValidateNested()
    @Type(() => DatumJSON)
    public datum: DatumJSON;
    
    /**
     * Serialization of the property {@link SystemParameter#value|`value`}.
     */
    @Allow()
    public value: unknown;
    
    /**
     * Creates an instance of the class.
     *
     * @param {string} displayName - Value for {@link SystemParameter#displayName|`displayName`}.
     * @param {DatumJSON} datum - Value for {@link SystemParameter#datum|`datum`}.
     * @param {unknown} value - Value for {@link SystemParameter#value|`value`}.
     */
    constructor(displayName: string, datum: DatumJSON, value: unknown) {
        this.displayName = displayName;
        this.datum       = datum;
        this.value       = value;
    }
    
}
