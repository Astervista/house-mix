/**
 * This module defines the MixLayout and related JSON structures for node positioning in the display of nodes.
 *
 * These are defined in the common library because they are stored in the backend, even if they are irrelevant for the backend's functionality.
 *
 * @module
 */
import {Allow, IsArray, IsBoolean, IsInt, IsNotEmpty, IsNumber, IsString, Min, Type, ValidateIf, ValidateNested} from "rest-decorators";

// noinspection ES6UnusedImports
import type {Mix} from "./mix";
// noinspection ES6UnusedImports
import type {ElaborationNode} from "./elaboration-node";

/**
 * A 2D point in the plane.
 */
export interface Point {
    /** The horizontal coordinate of the point. */
    x: number;
    /** The vertical coordinate of the point. */
    y: number;
}

/**
 * This class defines the visual arrangement of the elements inside a {@link Mix|`Mix`}.
 * This class is already a serialized class and can be used in network communication and storage on file as JSON.
 */
export class MixLayout {
    
    /**
     * The position of each {@link Mix#nodes|node}, indexed by {@link ElaborationNode#id|`id`}.
     */
    @Allow()
    public nodePositions: Record<string, Point>;
    
    /**
     * {@link Mix#nodes|Nodes} in a {@link Mix|`Mix`} can be grouped. This is the list of those groups.
     */
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => NodeGroupJSON)
    public groups: NodeGroupJSON[];
    
    /**
     * Creates an instance of the class.
     *
     * @param {Record<string, Point>} nodePositions - Value for {@link MixLayout#nodePositions|`nodePositions`}.
     * @param {NodeGroupJSON[]} groups - Value for {@link MixLayout#groups|`groups`}.
     */
    constructor(
        nodePositions: Record<string, Point> = {},
        groups: NodeGroupJSON[]              = []
    ) {
        this.nodePositions = nodePositions;
        this.groups = groups;
    }
    
}

/**
 * A group for containing {@link Mix#nodes|nodes} in a {@link Mix|`Mix`}, with properties to describe its
 * appearance in the visualization of the mix structure in the UI.
 */
export class NodeGroupJSON {
    
    /** The name of the group, to be shown in the UI. */
    @IsString()
    @IsNotEmpty()
    public name: string = "Group";
    
    /** The list of {@link Mix#nodes|node} {@link ElaborationNode#id|`id`s} contained in this group. */
    @IsInt({each: true})
    public nodeIds: number[] = [];
    
    /**
     * The list of groups that are subgroups of this group, identified by their id.
     * The id of a group is its index in the {@link MixLayout#groups|`groups`} array.
     */
    @IsInt({each: true})
    @Min(0, {
        each: true
    })
    public subGroupIds: number[] = [];
    
    /** Whether this group should be shown in the UI in a collapsed state, hiding its subgroups and nodes contained in it. */
    @IsBoolean()
    public collapsed: boolean      = false;
    /** Whether the inputs and outputs of this group should be shown individually with connectors, or all grouped in one. This applies only when the group is collapsed. */
    @IsBoolean()
    public showConnectors: boolean = true;
    
    /**
     * When a group is collapsed, the inputs of nodes contained in it can have an alias to be shown instead of the corresponding node's input name, to be more clearly understandable in
     * that context. This is a list of all the aliases for inputs coming from outside this group.
     */
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => DatumAliasJSON)
    public inputAliases: DatumAliasJSON[] = [];
    
    /**
     * When a group is collapsed, the outputs of nodes contained in it can have an alias to be shown instead of the corresponding node's output name, to be more clearly understandable in
     * that context. This is a list of all the aliases for outputs going outside this group.
     */
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => DatumAliasJSON)
    public outputAliases: DatumAliasJSON[] = [];
    
    /**
     * When a group is collapsed, the inputs of nodes contained in it can be arranged to be shown in an arbitrary order.
     * This is a list of all the positions for inputs coming from outside this group.
     */
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => DatumPositionJSON)
    public inputPositions: DatumPositionJSON[] = [];
    
    /**
     * When a group is collapsed, the inputs of nodes contained in it can be arranged to be shown in an arbitrary order.
     * This is a list of all the positions for inputs coming from outside this group.
     */
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => DatumPositionJSON)
    public outputPositions: DatumPositionJSON[] = [];
    
    /**
     * If this group is a subgroup of another group, this is the id (its index in the {@link MixLayout#groups|`groups`} array)
     * of the group containing it. This means that the parent group has this group's id in its {@link NodeGroupJSON#subGroupIds|`subGroupIds`} list.
     */
    @ValidateIf(o => (o as Partial<NodeGroupJSON>).parentId != null)
    @IsInt()
    public parentId: number | null = null;
    
    /**
     * The depth level of this group in the subgroups hierarchy.
     *
     * @see {@link NodeGroupJSON#subGroupIds|`subGroupIds`} and {@link NodeGroupJSON#parentId|`parentId`}.
     */
    @IsInt()
    public level: number = 0;
    
}

/**
 * A class to describe the aliasing of a {@link ElaborationNode|`ElaborationNode`} input/output in a {@link NodeGroupJSON|node group}, aliased to another name.
 */
export class DatumAliasJSON {
    
    /** The name of the input/output as shown in the {@link ElaborationNode|`ElaborationNode`}. */
    @IsString()
    @IsNotEmpty()
    public datumName: string = "";
    
    /** The {@link ElaborationNode#id|`id`} of the node containing the datum to be aliased. */
    @IsInt()
    public nodeId: number = 0;
    
    /** The aliased name. */
    @IsString()
    @IsNotEmpty()
    public alias: string = "";
    
}

/**
 * A class to describe the order of a {@link ElaborationNode|`ElaborationNode`} input/output in a {@link NodeGroupJSON|node group}.
 */
export class DatumPositionJSON {
    
    /** The name of the input/output as shown in the {@link ElaborationNode|`ElaborationNode`}. */
    @IsString()
    @IsNotEmpty()
    public datumName: string = "";
    
    /** The {@link ElaborationNode#id|`id`} of the node containing the datum. */
    @IsInt()
    public nodeId: number = 0;
    
    /** The position in which this datum will be shown. */
    @IsNumber()
    @IsNotEmpty()
    public order: number = 0;
    
}
