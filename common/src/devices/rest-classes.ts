/**
 * This module contains support classes to be used in the communication
 * regarding operations about {@link Device|`Device`s}.
 *
 * @module
 */
import {IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, Matches, Transform, Type, ValidateIf, ValidateNested} from "rest-decorators";
import {DatumJSON} from "../mixing/mix/datum";
import {UNIQUE_NAME_PATTERN} from "../utils/constants";
import {MixPositionInfo} from "../mixing/mix/rest-classes";

// noinspection ES6UnusedImports
import {Device} from "./device";
// noinspection ES6UnusedImports
import {Mix} from "../mixing/mix/mix";

/**
 * Data transfer class that represents an edit to a {@link Device|`Device`}, used for communication with the REST API.
 */
export class DeviceEditChanges {
    
    /** An edit to {@link Device#name|`Device.name`}. If `undefined`, the device's name remains unchanged. */
    @IsOptional()
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public name?: string;
    
    /** An edit to {@link Device#displayName|`Device.displayName`}. If `undefined`, the device's display name remains unchanged. */
    @IsOptional()
    @IsNotEmpty()
    public displayName?: string;
    
    /** An edit to {@link Device#zigbeeAddress|`Device.zigbeeAddress`}. If `undefined`, the device's zigbee address remains unchanged. */
    @IsOptional()
    @IsNotEmpty()
    @Matches(/^[0-9a-f]+$/)
    public zigbeeAddress?: string;
    
    /** An edit to {@link Device#exposes|`Device.exposes`}. If `undefined`, the device's exposed properties remain unchanged. */
    @IsOptional()
    @IsArray()
    @ValidateNested({
                        each: true
                    })
    @Type(() => DatumJSON)
    public exposes?: DatumJSON[];
}

/**
 * Data transfer class that describes a complex query to retrieve a {@link Device|`Device`} from the REST API.
 */
export class GetDevicesOptions {
    
    /**
     * Requests the resulting devices to be filtered following this logic:
     *  - When a number, only devices that have a {@link Device.mix|mix id} equal to this value.
     *  - When null, only devices that have a {@link Device.mix|mix id} not set (equivalent to {@link GetDevicesOptions#anyMixed|`anyMixed`}` = false`).
     *  - When undefined, does not require any filtering on the {@link Device.mix|mix id}.
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
    public mix?: number | null;
    
    /**
     * Requests the resulting devices to be filtered following this logic:
     *  - When `true`, only devices that have a {@link Device.mix|mix id} set to any mix id.
     *  - When `true`, only devices that have a {@link Device.mix|mix id} not set (equivalent to {@link GetDevicesOptions#mix|`mix`}` = null`).
     *  - When `undefined`, does not require any filtering on the {@link Device.mix|mix id}.
     */
    @IsBoolean()
    @IsOptional()
    public anyMixed?: boolean;
    
}

/**
 * Data transfer class that represents a member of {@link Device#exposes|`Device.exposes`} that cannot be deleted
 * because it is used in some other part of the system (it is **locked**).
 */
export class LockedExposes {
    
    /**
     * Creates an instance of the class.
     *
     * @param {string} name - The name of the exposed property that is locked.
     * @param {string} dependencies - All the places where the exposed property is used in the system,
     *                     causing the lock.
     */
    constructor(
        public name: string,
        public dependencies: MixPositionInfo[]
    ) {
    
    }
    
}

/**
 * Data transfer class that represents the set of parents unavailable to a specific
 * entity to be moved to, or some other similar operation.
 */
export class UnavailableParents {
    
    /**
     * Constructs an instance of the class.
     *
     * @param {Array<string | null>} names - The {@link Device#name|unique names} of the parents unavailable for the operation.
     * @param {Array<string | null>} displayNames - The {@link Device#displayName|display names} of the parents unavailable for the operation.
     * @param {MixPositionInfo | null} unreachable - The nearest {@link Mix|`Mix`} that would become unreachable by this entity if it were to be moved,
     *                                               if the cause of the unavailability is upstream.
     * @param {MixPositionInfo | null} depending - The nearest {@link Mix|`Mix`} that would become depending on this entity if it were to be moved,
     *                                             if the cause of the unavailability is downstream.
     */
    constructor(
        public names: (string | null)[],
        public displayNames: (string | null)[],
        public unreachable: MixPositionInfo | null,
        public depending: MixPositionInfo | null
    ) {}
    
}
