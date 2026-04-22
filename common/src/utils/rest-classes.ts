/**
 * This module defines generic helper classes for REST communication.
 *
 * @module
 */
import {IsNotEmpty, Matches} from "rest-decorators";
import {UNIQUE_NAME_PATTERN} from "./constants";

/**
 * A class to represent any entity with a unique name that follows
 * the {@link UNIQUE_NAME_PATTERN|`UNIQUE_NAME_PATTERN`} for use with the REST API.
 */
export class EntityPathParams {
    
    /**
     * The unique name of the entity.
     */
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public name: string = "";
    
}
