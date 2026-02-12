import {IsArray, IsInt, IsNotEmpty, Matches, Min, Type, ValidateIf, ValidateNested} from "rest-decorators";
import {Datum, DatumChange, DatumChangeType, DatumJSON} from "../mixing/mix/datum";
import {UNIQUE_NAME_PATTERN} from "../utils/constants";

export class Device {
    
    public mix: number | null = null;
    
    public readonly exposes: Datum[] = [];
    
    constructor(private _zigbeeAddress: string, public name: string, public displayName: string) {
    }
    
    public get zigbeeAddress(): string {
        return this._zigbeeAddress.toLowerCase();
    }
    
    public set zigbeeAddress(value: string) {
        this._zigbeeAddress = value.toLowerCase();
    }
    
    public calculateExposesChanges(newExposes: Datum[]): DatumChange[] {
        const changes: DatumChange[] = [];
        for (const oldExpose of this.exposes) {
            const newVersion = newExposes.find(a => a.name === oldExpose.name);
            if (newVersion == null) {
                changes.push(new DatumChange(DatumChangeType.DELETED, oldExpose));
            } else {
                if (newVersion.type !== oldExpose.type || newVersion.nullable !== oldExpose.nullable) {
                    changes.push(new DatumChange(DatumChangeType.DELETED, oldExpose));
                    changes.push(new DatumChange(DatumChangeType.NEW, newVersion));
                }
            }
        }
        for (const newExpose of newExposes) {
            if (!this.exposes.some(a => a.name === newExpose.name)) {
                changes.push(new DatumChange(DatumChangeType.NEW, newExpose));
            }
        }
        return changes;
    }
    
    public toJSON(): DeviceJSON {
        return {
            zigbeeAddress: this.zigbeeAddress,
            name:          this.name,
            displayName:   this.displayName,
            exposes:       this.exposes.map(datum => datum.toJSON()),
            mix:           this.mix
        };
    }
    
    public static fromJSON(deviceJSON: DeviceJSON): Device {
        const device = new Device(deviceJSON.zigbeeAddress, deviceJSON.name, deviceJSON.displayName);
        device.mix   = deviceJSON.mix;
        return device;
    }
}

export class DeviceJSON {
    
    @IsNotEmpty()
    @Matches(/^[0-9a-f]+$/)
    public zigbeeAddress: string;
    
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public name: string;
    
    @IsNotEmpty()
    public displayName: string;
    
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => DatumJSON)
    public exposes: DatumJSON[] = [];
    
    @ValidateIf((o: DeviceJSON) => o.mix !== null)
    @IsInt()
    @Min(0)
    public mix: number | null = null;
    
    constructor(zigbeeAddress: string, name: string, displayName: string) {
        this.zigbeeAddress = zigbeeAddress;
        this.name          = name;
        this.displayName   = displayName;
    }
}
