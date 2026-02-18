import {Allow, IsEnum, IsNotEmpty, IsNumber, Matches, Min, ValidateIf} from "rest-decorators";
import {UNIQUE_NAME_PATTERN} from "../../utils/constants";

export enum AdjustmentType {
    ANIMATION_OFF  = "ANIMATION_OFF",
    ANIMATION_ON   = "ANIMATION_ON",
    SPLIT_COMMANDS = "SPLIT_COMMANDS"
}

export abstract class Adjustment<D, J> {
    
    public readonly type: AdjustmentType;
    public id: number | "NEW" = "NEW";
    public data: D;
    
    protected constructor(id: number | "NEW", type: AdjustmentType, data: D) {
        this.id   = id;
        this.type = type;
        this.data = data;
    }
    
    public abstract dataFromJSON(dataJSON: J): D;
    
    public abstract dataToJSON(dataJSON: D): J;
    
    public abstract isValidData(data: unknown): boolean;
    
    public toJSON(): AdjustmentJSON<J> {
        return {
            id:   this.id,
            type: this.type,
            data: this.dataToJSON(this.data)
        };
    }
    
    public static fromJSON(adjustmentJSON: AdjustmentJSON<unknown>): Adjustment<unknown, unknown> | null {
        switch (adjustmentJSON.type) {
            case AdjustmentType.ANIMATION_OFF: {
                const validatedJSON = AdjustmentAnimationOff.validateJSON(adjustmentJSON.data);
                if (validatedJSON) {
                    return new AdjustmentAnimationOff(adjustmentJSON.id, validatedJSON);
                } else {
                    return null;
                }
            }
            case AdjustmentType.ANIMATION_ON: {
                const validatedJSON = AdjustmentAnimationOn.validateJSON(adjustmentJSON.data);
                if (validatedJSON) {
                    return new AdjustmentAnimationOn(adjustmentJSON.id, validatedJSON);
                } else {
                    return null;
                }
            }
            case AdjustmentType.SPLIT_COMMANDS: {
                const validatedJSON = AdjustmentSplitCommands.validateJSON(adjustmentJSON.data);
                if (validatedJSON) {
                    return new AdjustmentSplitCommands(adjustmentJSON.id, validatedJSON);
                } else {
                    return null;
                }
            }
        }
    }
    
}

export class AdjustmentAnimationOff extends Adjustment<AdjustmentAnimationOffData, AdjustmentAnimationOffData> {
    
    constructor(id: number | "NEW", data: AdjustmentAnimationOffData) {
        super(id, AdjustmentType.ANIMATION_OFF, data);
    }
    
    public dataFromJSON(dataJSON: AdjustmentAnimationOffData): AdjustmentAnimationOffData {
        return dataJSON;
    }
    
    public dataToJSON(dataJSON: AdjustmentAnimationOffData): AdjustmentAnimationOffData {
        return dataJSON;
    }
    
    public override isValidData(data: unknown): boolean {
        return AdjustmentAnimationOff.validateJSON(data) != null;
    }
    
    public static validateJSON(dataJSON: unknown): AdjustmentAnimationOffData | undefined {
        if (typeof dataJSON == "object"
            && dataJSON != null
            && "minValidBrightness" in dataJSON
            && "actuatorName" in dataJSON
        ) {
            if (typeof dataJSON.minValidBrightness != "number") {
                return undefined;
            }
            if (typeof dataJSON.actuatorName != "string" || dataJSON.actuatorName.length == 0 || !UNIQUE_NAME_PATTERN.test(dataJSON.actuatorName)) {
                return undefined;
            }
            return new AdjustmentAnimationOffData(
                dataJSON.minValidBrightness,
                dataJSON.actuatorName
            );
        } else {
            return undefined;
        }
    }
    
    
}

export class AdjustmentAnimationOffData {
    
    @IsNumber()
    @Min(0)
    public minValidBrightness: number;
    
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public actuatorName: string;
    
    constructor(minValidBrightness: number, actuatorName: string) {
        this.minValidBrightness = minValidBrightness;
        this.actuatorName       = actuatorName;
    }
    
    
}

export class AdjustmentAnimationOn extends Adjustment<AdjustmentAnimationOnData, AdjustmentAnimationOnData> {
    
    constructor(id: number | "NEW", data: AdjustmentAnimationOnData) {
        super(id, AdjustmentType.ANIMATION_ON, data);
    }
    
    public dataFromJSON(dataJSON: AdjustmentAnimationOnData): AdjustmentAnimationOnData {
        return dataJSON;
    }
    
    public dataToJSON(dataJSON: AdjustmentAnimationOnData): AdjustmentAnimationOnData {
        return dataJSON;
    }
    
    public override isValidData(data: unknown): boolean {
        return AdjustmentAnimationOn.validateJSON(data) != null;
    }
    
    
    public static validateJSON(dataJSON: unknown): AdjustmentAnimationOnData | undefined {
        if (typeof dataJSON == "object"
            && dataJSON != null
            && "minValidBrightness" in dataJSON
            && "actuatorName" in dataJSON
        ) {
            if (typeof dataJSON.minValidBrightness != "number") {
                return undefined;
            }
            if (typeof dataJSON.actuatorName != "string" || dataJSON.actuatorName.length == 0 || !UNIQUE_NAME_PATTERN.test(dataJSON.actuatorName)) {
                return undefined;
            }
            return new AdjustmentAnimationOffData(dataJSON.minValidBrightness, dataJSON.actuatorName);
        } else {
            return undefined;
        }
    }
    
}


export class AdjustmentAnimationOnData {
    
    @IsNumber()
    @Min(0)
    public minValidBrightness: number;
    
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public actuatorName: string;
    
    constructor(minValidBrightness: number, actuatorName: string) {
        this.minValidBrightness = minValidBrightness;
        this.actuatorName       = actuatorName;
    }
    
}


export class AdjustmentSplitCommands extends Adjustment<AdjustmentSplitCommandsData, AdjustmentSplitCommandsData> {
    
    constructor(id: number | "NEW", data: AdjustmentSplitCommandsData) {
        super(id, AdjustmentType.SPLIT_COMMANDS, data);
    }
    
    public dataFromJSON(dataJSON: AdjustmentSplitCommandsData): AdjustmentSplitCommandsData {
        return dataJSON;
    }
    
    public dataToJSON(dataJSON: AdjustmentSplitCommandsData): AdjustmentSplitCommandsData {
        return dataJSON;
    }
    
    public override isValidData(data: unknown): boolean {
        return AdjustmentSplitCommands.validateJSON(data) != null;
    }
    
    public static validateJSON(dataJSON: unknown): AdjustmentSplitCommandsData | undefined {
        if (typeof dataJSON == "object"
            && dataJSON != null
            && "actuatorName" in dataJSON
        ) {
            if (typeof dataJSON.actuatorName != "string" || dataJSON.actuatorName.length == 0 || !UNIQUE_NAME_PATTERN.test(dataJSON.actuatorName)) {
                return undefined;
            }
            return new AdjustmentSplitCommandsData(
                dataJSON.actuatorName
            );
        } else {
            return undefined;
        }
    }
    
    
}

export class AdjustmentSplitCommandsData {
    
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public actuatorName: string;
    
    constructor(actuatorName: string) {
        this.actuatorName = actuatorName;
    }
    
    
}

export class AdjustmentJSON<J> {
    
    @IsEnum(AdjustmentType)
    public type: AdjustmentType;
    
    @ValidateIf((o: unknown) => typeof o == "object" && o != null && "id" in o && o.id != "NEW")
    @IsNumber()
    @Min(0)
    public id: number | "NEW" = "NEW";
    
    @Allow()
    public data: J;
    
    constructor(id: number | "NEW", type: AdjustmentType, data: J) {
        this.id   = id;
        this.type = type;
        this.data = data;
    }
    
    
}
