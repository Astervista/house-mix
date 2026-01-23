import {IsArray, IsNotEmpty, IsOptional, Matches, Type, ValidateNested} from "rest-decorators";
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
