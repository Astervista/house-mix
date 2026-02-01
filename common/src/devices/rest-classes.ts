import {IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, Matches, Transform, Type, ValidateIf, ValidateNested} from "rest-decorators";
import {DatumJSON} from "../mixing/mix/datum";
import {UNIQUE_NAME_PATTERN} from "../utils/constants";
import {MixingGraphDependency} from "../mixing/mixing-graph";
import {MixPositionInfo} from "../mixing/mix/rest-classes";

export class DeviceEditChanges {
    
    @IsOptional()
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
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
    
    @IsBoolean()
    @IsOptional()
    public anyMixed?: boolean;
    
}

export class LockedExposes {

    constructor(
        public name: string,
        public dependencies: MixPositionInfo[]
    ) {
    
    }
    
}

export class UnavailableParents {
    
    constructor(
        public names: (string | null)[],
        public displayNames: (string | null)[],
        public unreachable: MixPositionInfo | null,
        public depending: MixPositionInfo | null
    ) {}

}
