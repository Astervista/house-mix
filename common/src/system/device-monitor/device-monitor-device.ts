import {IsBoolean, IsIP, IsNotEmpty, IsOptional, IsString} from "rest-decorators";

export class DeviceMonitorDevice {
    
    constructor(public ip: string | undefined, public name: string, public connected: boolean | null = null) {
    
    }
    
    public toJSON(): DeviceMonitorDeviceJSON {
        return new DeviceMonitorDeviceJSON(this.ip, this.name, this.connected ?? undefined);
    }
    
    public static fromJSON(json: DeviceMonitorDeviceJSON): DeviceMonitorDevice {
        return new DeviceMonitorDevice(json.ip, json.name, json.connected);
    }
    
}

export class DeviceMonitorDeviceJSON {
    
    @IsIP(4)
    public ip?: string;
    
    @IsString()
    @IsNotEmpty()
    public name: string;
    
    @IsOptional()
    @IsBoolean()
    public connected?: boolean;
    
    constructor(ip: string | undefined, name: string, connected?: boolean) {
        this.ip        = ip;
        this.name      = name;
        this.connected = connected;
    }
    
}
