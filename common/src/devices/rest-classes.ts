import {IsArray, IsInt, IsNotEmpty, IsOptional, Matches, Transform, Type, ValidateIf, ValidateNested} from "rest-decorators";
import {DatumJSON} from "../mixing/mix/datum";

export class DeviceEditChanges {
    
    @IsOptional()
    @IsNotEmpty()
    @Matches(/^[a-z\-0-9_]+$/)
    public name?: string;
    
    @IsOptional()
    @IsNotEmpty()
    public displayName?: string;
    
    @IsOptional()
    @IsNotEmpty()
    @Matches(/^[0-9A-F]+$/)
    public zigbeeAddress?: string;
    
    @IsOptional()
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => DatumJSON)
    public exposes?: DatumJSON[];
}

export class GetDevicesOptions {
    
    @Transform(({ value }) => {
        if (value === undefined) return undefined; // param not provided
        if (value === 'null') return null;         // explicit null
        return Number(value);                      // number
    })
    @ValidateIf((_, value) => value !== null)    // skip validation if null
    @IsInt()
    @IsOptional()
    public mix?: number | null;
    
}
