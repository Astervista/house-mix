import {IsNotEmpty, Matches} from "class-decorators";

export class Device {
    
    private readonly _uid: string;
    private readonly _name: string;
    
    constructor(uid: string, name: string, public displayName: string) {
        this._uid = uid;
        this._name = name;
    }

    public get uid(): string {
        return this._uid;
    }

    public get name(): string {
        return this._name;
    }
    
    public toJSON(): DeviceJSON {
        return {
            uid: this.uid,
            name: this.name,
            displayName: this.displayName
        }
    }
    
    public static fromJSON(JSON: DeviceJSON): Device {
        return new Device(JSON.uid, JSON.name, JSON.displayName);
    }
}

export class DeviceJSON {
    
    @IsNotEmpty()
    public uid: string;
    
    @IsNotEmpty()
    @Matches(/^[a-z\-0-9_]+$/)
    public name: string;
    
    @IsNotEmpty()
    public displayName: string;
    
    constructor(uid: string, name: string, displayName: string) {
        this.uid = uid;
        this.name = name;
        this.displayName = displayName;
    }
}
