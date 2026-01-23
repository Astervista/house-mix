import {IsArray, IsNotEmpty, Matches, Type, ValidateNested} from "rest-decorators";
import {Datum, DatumChange, DatumChangeType, DatumJSON} from "../mixing/mix/datum";

export class Device {
    
    public readonly exposes: Datum[] = [];
    
    constructor(public zigbeeAddress: string, public name: string, public displayName: string) {
    }
    
    public calculateExposesChanges(newExposes: Datum[]): DatumChange[] {
        const changes: DatumChange[] = [];
        for (const oldExpose of this.exposes) {
            const newVersion = newExposes.find(a => a.name === oldExpose.name);
            if (newVersion == null) {
                changes.push(new DatumChange( DatumChangeType.DELETED,  oldExpose));
            } else {
                if (newVersion.type !== oldExpose.type || newVersion.nullable !== oldExpose.nullable) {
                    changes.push(new DatumChange( DatumChangeType.DELETED,  oldExpose));
                    changes.push(new DatumChange( DatumChangeType.NEW,  newVersion));
                }
            }
        }
        for (const newExpose of newExposes) {
            if (!this.exposes.some(a => a.name === newExpose.name)) {
                changes.push(new DatumChange( DatumChangeType.NEW,newExpose));
            }
        }
        return changes
    }
    
    public toJSON(): DeviceJSON {
        return {
            zigbeeAddress: this.zigbeeAddress,
            name: this.name,
            displayName: this.displayName,
            exposes: this.exposes.map(datum => datum.toJSON())
        }
    }
    
    public static fromJSON(JSON: DeviceJSON): Device {
        return new Device(JSON.zigbeeAddress, JSON.name, JSON.displayName);
    }
}

export class DeviceJSON {
    
    @IsNotEmpty()
    @Matches(/^[0-9A-F]+$/)
    public zigbeeAddress: string;
    
    @IsNotEmpty()
    @Matches(/^[a-z\-0-9_]+$/)
    public name: string;
    
    @IsNotEmpty()
    public displayName: string;
    
    @IsArray()
    @ValidateNested({
        each: true
    })
    @Type(() => DatumJSON)
    public exposes: DatumJSON[] = [];
    
    constructor(zigbeeAddress: string, name: string, displayName: string) {
        this.zigbeeAddress = zigbeeAddress;
        this.name = name;
        this.displayName = displayName;
    }
}
