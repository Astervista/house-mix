import {IsInt, IsNotEmpty, IsOptional, IsString, Max, Min} from "rest-decorators";

export class SystemSettings {
    
    
    public homeName: string           = "Home";
    public offlineCheck: number       = 180;
    public onlineCheck: number        = 60;
    public unavailableTimeout: number = 300;
    public throttleTiming: number     = 30;
    
    public update(update: SystemSettingsJSON): void {
        if (update.homeName != null) {
            this.homeName = update.homeName;
        }
        if (update.offlineCheck != null) {
            this.offlineCheck = update.offlineCheck;
        }
        if (update.onlineCheck != null) {
            this.onlineCheck = update.onlineCheck;
        }
        if (update.unavailableTimeout != null) {
            this.unavailableTimeout = update.unavailableTimeout;
        }
        if (update.throttleTiming != null) {
            this.throttleTiming = update.throttleTiming;
        }
    }
    
    public toJSON(): SystemSettingsJSON {
        return {
            homeName:           this.homeName,
            offlineCheck:       this.offlineCheck,
            onlineCheck:        this.onlineCheck,
            unavailableTimeout: this.unavailableTimeout,
            throttleTiming:     this.throttleTiming
        };
    }
    
    public static fromJSON(json: SystemSettingsJSON): SystemSettings {
        const result = new SystemSettings();
        result.update(json);
        return result;
        
    }
    
}

export class SystemSettingsJSON {
    
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    public homeName?: string;
    
    @IsInt()
    @Min(10)
    @Max(3600)
    @IsOptional()
    public offlineCheck?: number;
    
    @IsInt()
    @Min(10)
    @Max(3600)
    @IsOptional()
    public onlineCheck?: number;
    
    @IsInt()
    @Min(10)
    @Max(86399)
    @IsOptional()
    public unavailableTimeout?: number;
    
    @IsInt()
    @Min(0)
    @Max(1000)
    @IsOptional()
    public throttleTiming?: number;
    
}
