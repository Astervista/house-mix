import {IsArray, IsNotEmpty, Matches, IsOptional, IsEnum, ValidateIf, Transform, IsInt} from "rest-decorators";
import {UNIQUE_NAME_PATTERN} from "../../utils/constants";

export class GetGroupOptions {
    
    @Transform(({ value }) => {
        if (value === undefined) return undefined; // param not provided
        if (value === 'null') return null;         // explicit null
        return Number(value);                      // number
    })
    @ValidateIf((_, value) => value !== null)    // skip validation if null
    @IsInt()
    @IsOptional()
    public actuatorMix?: number | null;
    
    @Transform(({ value }) => {
        if (value === undefined) return undefined; // param not provided
        if (value === 'null') return null;         // explicit null
        return Number(value);                      // number
    })
    @ValidateIf((_, value) => value !== null)    // skip validation if null
    @IsInt()
    @IsOptional()
    public sensorMix?: number | null;
}

export class GroupCreateOptions {
    
    @IsOptional()
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public parent?: string;
    
}

export class GroupEditChanges {
    
    @IsOptional()
    @Matches(UNIQUE_NAME_PATTERN)
    public name?: string;
    
    @IsOptional()
    @IsNotEmpty()
    public displayName?: string;
}

// TODO: should be moved
export class EntityPathParams {
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public name: string = "";
}

export class ChangeParentChange {
    @IsOptional()
    @Matches(UNIQUE_NAME_PATTERN)
    public parent: string | null = null;
}

export enum DeleteGroupChildFate {
    CURRENT_LEVEL = "CURRENT_LEVEL",
    ROOT_LEVEL    = "ROOT_LEVEL",
    CHOOSE_WHERE  = "CHOOSE_WHERE"
}

export type DeleteGroupOptions = {
    fate: DeleteGroupChildFate.CURRENT_LEVEL | DeleteGroupChildFate.ROOT_LEVEL | null;
    parent?: never
} | {
    fate: DeleteGroupChildFate.CHOOSE_WHERE
    parent: string
}

