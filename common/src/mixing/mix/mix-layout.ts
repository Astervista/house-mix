import {Allow, IsArray, IsBoolean, IsInt, IsNotEmpty, IsString, Min, Type, ValidateIf, ValidateNested} from "rest-decorators";

export interface Point {
    x: number;
    y: number;
}

export class MixLayout {
    
    @Allow()
    public nodePositions: Record<string, Point>;
    
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => NodeGroupJSON)
    public groups: NodeGroupJSON[];
    
    constructor(
        nodePositions: Record<string, Point> = {},
        groups: NodeGroupJSON[]              = []
    ) {
        this.nodePositions = nodePositions;
        this.groups = groups;
    }
    
}

export class NodeGroupJSON {
    
    @IsString()
    @IsNotEmpty()
    public name: string = "Group";
    
    @IsInt({each: true})
    public nodeIds: number[] = [];
    
    @IsInt({each: true})
    @Min(0, {
        each: true
    })
    public subGroupIds: number[] = [];
    
    @IsBoolean()
    public collapsed: boolean      = false;
    @IsBoolean()
    public showConnectors: boolean = true;
    
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => DatumAliasJSON)
    public inputAliases: DatumAliasJSON[]  = [];
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => DatumAliasJSON)
    public outputAliases: DatumAliasJSON[] = [];
    
    @ValidateIf(o => (o as Partial<NodeGroupJSON>).parentId != null)
    @IsInt()
    public parentId: number | null = null;
    
    @IsInt()
    public level: number = 0;
    
}

export class DatumAliasJSON {
    
    @IsString()
    @IsNotEmpty()
    public datumName: string = "";
    
    @IsInt()
    public nodeId: number = 0;
    
    @IsString()
    @IsNotEmpty()
    public alias: string = "";
    
}
