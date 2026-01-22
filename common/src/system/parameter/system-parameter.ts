import {Datum, DatumJSON} from "../../mixing/mix/datum";

export class SystemParameter {
    
    private _datum: Datum;
    private _value: unknown;
    
    constructor(public displayName: string, datum: Datum, value?: unknown) {
        this._datum = datum;
        this.editDatum(datum, value);
    }
    
    public get datum(): Datum {
        return this._datum;
    }
    
    public get value(): unknown {
        return this._value;
    }
    
    public set value(value: unknown) {
        this.editDatum(this._datum, value);
    }
    
    public get name(): string {
        return this._datum.name
    }
    
    public editDatum(newDatum: Datum, newValue?: unknown): void {
        if (newValue == undefined) {
            if (!newDatum.nullable) {
                this._value = Datum.getDefaultForType(newDatum.type)
            } else {
                this._value = null;
            }
        }
        this._value = newValue;
        this._datum = new Datum(this._datum.name, newDatum.type, newDatum.nullable);
    }
    
    public toJSON(): SystemParameterJSON {
        return new SystemParameterJSON(this.displayName, this._datum.toJSON(), this._value);
    }
    
    public static fromJSON(json: SystemParameterJSON): SystemParameter {
        return new SystemParameter(json.displayName, Datum.fromJSON(json.datum), json.value);
    }
    
}

export class SystemParameterJSON {
    
    //TODO: Type checking
    
    public displayName: string;
    
    public datum: DatumJSON;
    
    public value: unknown;
    
    constructor(displayName: string, datum: DatumJSON, value: unknown) {
        this.displayName  = displayName;
        this.datum = datum;
        this.value = value;
    }
    
}
