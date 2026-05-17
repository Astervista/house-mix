/**
 * This module contains support classes to be used in the communication
 * regarding operations about {@link Group|`Group`s}.
 *
 * @module
 */
import {IsBoolean, IsInt, IsNotEmpty, IsOptional, Matches, Transform, ValidateIf} from "rest-decorators";
import {UNIQUE_NAME_PATTERN} from "../../utils/constants";

// noinspection ES6UnusedImports
import type {Group} from "./group";
// noinspection ES6UnusedImports
import type {Actuator} from "../actuator/actuator";
// noinspection ES6UnusedImports
import type {Sensor} from "../sensor/sensor";


/**
 * Data transfer class that describes a complex query to retrieve a {@link Group|`Group`} from the REST API.
 */
export class GetGroupsOptions {
    
    /**
     * Requests the resulting groups to be filtered following this logic:
     * - When a number, only groups that have a {@link Group.actuatorMix|actuator mix id} equal to this value.
     * - When null, only groups that have a  {@link Group.actuatorMix|actuator mix id} not set
     * - When undefined, does not require any filtering on the {@link Group.actuatorMix|actuator mix id}.
     */
    @Transform(({value}) => {
        if (value === undefined) {
            return undefined;
        } // param not provided
        if (value === "null") {
            return null;
        }         // explicit null
        return Number(value);                      // number
    })
    @ValidateIf((_, value) => value !== null)    // skip validation if null
    @IsInt()
    @IsOptional()
    public actuatorMix?: number | null;
    
    /**
     * Requests the resulting groups to be filtered following this logic:
     * - When a number, only groups that have a {@link Group.sensorMix|sensor mix id} equal to this value.
     * - When null, only groups that have a  {@link Group.sensorMix|sensor mix id} not set
     * - When undefined, does not require any filtering on the {@link Group.sensorMix|sensor mix id}.
     */
    @Transform(({value}) => {
        if (value === undefined) {
            return undefined;
        } // param not provided
        if (value === "null") {
            return null;
        }         // explicit null
        return Number(value);                      // number
    })
    @ValidateIf((_, value) => value !== null)    // skip validation if null
    @IsInt()
    @IsOptional()
    public sensorMix?: number | null;
    
    /**
     * Requests the resulting groups to be filtered following this logic:
     * - When `true`, only groups that have either the {@link Group.actuatorMix|actuator mix id}
     *   or {@link Group.sensorMix|sensor mix id} set to any mix id.
     * - When `false`, only groups that have both the {@link Group.actuatorMix|actuator mix id}
     *   and {@link Group.sensorMix|sensor mix id} not set.
     * - When `undefined`, does not require any filtering on the  {@link Group.actuatorMix|actuator mix id} or {@link Group.sensorMix|sensor mix id}.
     */
    @IsBoolean()
    @IsOptional()
    public anyMixed?: boolean;
    
}

/**
 * Query parameters that represents the options during the request of the creation of a {@link Group|`Group`}, {@link Sensor|`Sensor`} or{@link Actuator|`Actuator`} in the REST API.
 */
export class GroupCreateOptions {
    
    /**
     * Which parent group the group, sensor or actuator will be assigned to. If not specified, it will not be added to any group.
     */
    @IsOptional()
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public parent?: string;
    
}

/**
 * Data transfer class that represents an edit to a {@link Group|`Group`}, used for communication with the REST API.
 */
export class GroupEditChanges {
    
    /** An edit to {@link Group#name|`Group.name`}. If `undefined`, the group's name remains unchanged. */
    @IsOptional()
    @Matches(UNIQUE_NAME_PATTERN)
    public name?: string;
    
    /** An edit to {@link Group#displayName|`Group.displayName`}. If `undefined`, the group's display name remains unchanged. */
    @IsOptional()
    @IsNotEmpty()
    public displayName?: string;
}

/**
 * Data transfer class that represents the change of a parent of any entity, used for communication with the REST API.
 */
export class ChangeParentChange {
    
    /**
     * The new parent. If null, the entity will be assigned to the root level.
     */
    @IsOptional()
    @Matches(UNIQUE_NAME_PATTERN)
    public parent: string | null = null;
}

/**
 * Enum representing the possible fates of a group's child when the group is deleted.
 *
 * @readonly
 */
export enum DeleteGroupChildFate {
    /** The children will be put at the same level as the deleted parent, effectively assigning them to their grandparent. */
    CURRENT_LEVEL = "CURRENT_LEVEL",
    /** The children will be put at the root level. */
    ROOT_LEVEL    = "ROOT_LEVEL",
    /** The new parent is specified. */
    CHOOSE_WHERE  = "CHOOSE_WHERE"
}

/**
 * Represents the options for deleting a group, including the fate of its child groups
 * and the parent group in certain scenarios.
 *
 * This type provides two structural variants:
 * - One where the `fate` is `CURRENT_LEVEL`, `ROOT_LEVEL`, or `null`, and the `parent` property is not allowed.
 * - Another where the `fate` is `CHOOSE_WHERE` and the `parent` property is required.
 *
 * The `fate` property determines what happens to child groups when the group is deleted.
 * If `fate` is `CHOOSE_WHERE`, the `parent` property specifies the new parent group for the children.
 */
export type DeleteGroupOptions = {
    /** What happens to child groups when the group is deleted. */
    fate: DeleteGroupChildFate.CURRENT_LEVEL | DeleteGroupChildFate.ROOT_LEVEL | null;
    /** This property shouldn't be set. */
    parent?: never
} | {
    /** What happens to child groups when the group is deleted. */
    fate: DeleteGroupChildFate.CHOOSE_WHERE
    /** The `parent` property specifies the new parent group for the children. */
    parent: string
}

