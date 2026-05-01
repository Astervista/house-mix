/**
 * This module contains classes about {@link Group|`Group`s}, a collection of devices or other {@link Group|`Group`s}.
 *
 * @module
 */
import {IsArray, IsInt, IsNotEmpty, Matches, Min, ValidateIf} from "rest-decorators";
import {UNIQUE_NAME_PATTERN} from "../../utils/constants";

// noinspection ES6UnusedImports
import type {Mix} from "../../mixing/mix/mix";
// noinspection ES6UnusedImports
import type {Device} from "../device";
// noinspection ES6UnusedImports
import type {Actuator} from "../actuator/actuator";
// noinspection ES6UnusedImports
import type {Sensor} from "../sensor/sensor";

/**
 * This class represent a group of {@link Device|`Device`s} and other groups, to
 * organize the devices in a hierarchy.
 */
export class Group {
    
    /** The unique {@link Group#name|`name`}s of the first-level subgroups of this group. */
    private readonly _groups: string[] = [];
    
    /** The unique {@link Actuator#name|`name`s} of the {@link Actuator|`Actuator`} children this group. */
    private readonly _actuators: string[] = [];
    
    /** The unique {@link Sensor#name|`name`s} of the {@link Sensor|`Sensor`} children this group. */
    private readonly _sensors: string[] = [];
    
    /**
     * The {@link Mix#id|`id`} of the {@link Mix|`Mix`} relative to this group on the sensor phase
     * (meaning on the side of the main cycle that goes from the sensors to the middle of the cycle).
     */
    public sensorMix: number | null = null;
    
    /**
     * The {@link Mix#id|`id`} of the {@link Mix|`Mix`} relative to this group on the actuator phase
     * (meaning on the side of the main cycle that goes from the middle of the cycle to the actuators).
     */
    public actuatorMix: number | null = null;
    
    /**
     * Creates an instance of the class.
     *
     * @param {string} name - The unique name of this device. It must follow the {@link UNIQUE_NAME_PATTERN | `/^([a-z\-0-9_]+)$/`} pattern.
     * @param {string} displayName - The name with which the device is shown in the frontend UI.
     */
    constructor(
        public name: string,
        public displayName: string
    ) {
    }
    
    /**
     * Returns the unique {@link Group#name|`name`}s of the first-level actuators of this group as a
     * copy of the internal array.
     *
     * @returns {readonly string[]} An immutable array containing the actuators.
     */
    public get actuators(): readonly string[] {
        return this._actuators.slice();
    }
    
    /**
     * Returns the unique {@link Group#name|`name`}s of the first-level sensors of this group as a
     * copy of the internal array.
     *
     * @returns {readonly string[]} An immutable array containing the sensors.
     */
    public get sensors(): readonly string[] {
        return this._sensors.slice();
    }
    
    /**
     * Returns the unique {@link Group#name|`name`}s of the first-level subgroups of this
     * group as a copy of the internal.
     *
     * @returns {readonly string[]} An immutable array containing the subgroups.
     */
    public get groups(): readonly string[] {
        return this._groups.slice();
    }
    
    /**
     * Determines whether the current object has child elements, such as actuators, groups, or sensors.
     *
     * @returns {boolean} True if there are any child elements (actuators, groups, or sensors); otherwise, false.
     */
    public get hasChildren(): boolean {
        return this._actuators.length > 0 || this._groups.length > 0 || this._sensors.length > 0;
    }
    
    /**
     * Provided an array of known groups, retrieves the names of all groups descending from `this`.
     *
     * If the array provided does not contain the instance corresponding to a specific descendant's {@link Group#name|`name`},
     * that group and all its descendant (even if present in the array) are ignored and not returned.
     *
     * @param {readonly Group[]} groups - An array of all known groups to search through. It should contain all the possible children.
     * @returns {string[]} An array of names for all descendant groups.
     */
    public getAllDescendants(groups: readonly Group[]): string[] {
        const children: string[]        = [];
        const checkingChildren: Group[] = [this];
        while (checkingChildren.length > 0) {
            const checkGroup = checkingChildren.pop();
            if (checkGroup != null) {
                children.push(checkGroup.name);
                const childrenNames = checkGroup.groups;
                checkingChildren.push(...groups.filter(otherGroup => childrenNames.includes(otherGroup.name)));
            }
        }
        return children;
    }
    
    /**
     * Adds a new group to the list of first-level subgroups.
     *
     * @param {string} group - The name of the group to be added.
     */
    public addGroup(group: string): void {
        this._groups.push(group);
    }
    
    /**
     * Removes a group from the list of groups if it is present.
     *
     * @param {string} group - The name of the group to be removed.
     * @returns {boolean} Returns true if the group was a subgroup before removal, false if the call didn't remove anything.
     */
    public removeGroup(group: string): boolean {
        const index = this._groups.indexOf(group);
        if (index > -1) {
            this._groups.splice(index, 1);
            return true;
        } else {
            return false;
        }
    }
    
    /**
     * Checks if the specified group exists in the current list of first-level subgroups.
     *
     * <u>This does not check if the group is a remote descendant</u>.
     *
     * @param {string} group - The name of the group to check for existence.
     * @returns {boolean} Returns true if the group is a first-level subgroup, otherwise false.
     */
    public containsGroup(group: string): boolean {
        return this._groups.includes(group);
    }
    
    /**
     * Function to notify the group that another group's name was changed. If the name corresponds to a first-level
     * subgroup, its name gets changed.
     *
     * @param {string} oldName - The name of the existing group to be renamed.
     * @param {string} newName - The new name for the group.
     * @returns {boolean} `true` if the renamed group was a first-level subgroup and the renaming had an effect. `false` otherwise.
     */
    public groupRenamed(oldName: string, newName: string): boolean {
        if (this.containsGroup(oldName)) {
            this.removeGroup(oldName);
            this.addGroup(newName);
            return true;
        } else {
            return false;
        }
    }
    
    /**
     * Adds a new actuator to the list of actuators.
     *
     * @param {string} actuator - The name of the actuator to be added.
     */
    public addActuator(actuator: string): void {
        this._actuators.push(actuator);
    }
    
    /**
     * Removes an actuator from the list of actuators if it is present.
     *
     * @param {string} actuator - The name of the actuator to be removed.
     * @returns {boolean} Returns true if the actuator was present before removal, false otherwise.
     */
    public removeActuator(actuator: string): boolean {
        const index = this._actuators.indexOf(actuator);
        if (index > -1) {
            this._actuators.splice(index, 1);
            return true;
        } else {
            return false;
        }
    }
    
    /**
     * Checks if the specified actuator exists in the current list.
     *
     * @param {string} actuator - The name of the actuator to check for existence.
     * @returns {boolean} Returns true if the actuator is in the list, otherwise false.
     */
    public containsActuator(actuator: string): boolean {
        return this._actuators.includes(actuator);
    }
    
    /**
     * Function to notify the group that an actuator's name was changed. If the name corresponds to a
     * child actuator, its name gets updated.
     *
     * @param {string} oldName - The name of the existing actuator to be renamed.
     * @param {string} newName - The new name for the actuator.
     * @returns {boolean} `true` if the renamed actuator was a child and the renaming had an effect. `false` otherwise.
     */
    public actuatorRenamed(oldName: string, newName: string): boolean {
        if (this.containsActuator(oldName)) {
            this.removeActuator(oldName);
            this.addActuator(newName);
            return true;
        } else {
            return false;
        }
    }
    
    /**
     * Adds a new sensor to the list of sensors.
     *
     * @param {string} sensor - The name of the sensor to be added.
     */
    public addSensor(sensor: string): void {
        this._sensors.push(sensor);
    }
    
    /**
     * Removes a sensor from the list of sensors if it is present.
     *
     * @param {string} sensor - The name of the sensor to be removed.
     * @returns {boolean} Returns true if the sensor was present before removal, false otherwise.
     */
    public removeSensor(sensor: string): boolean {
        const index = this._sensors.indexOf(sensor);
        if (index > -1) {
            this._sensors.splice(index, 1);
            return true;
        } else {
            return false;
        }
    }
    
    /**
     * Checks if the specified sensor exists in the current list.
     *
     * @param {string} sensor - The name of the sensor to check for existence.
     * @returns {boolean} Returns true if the sensor is in the list, otherwise false.
     */
    public containsSensor(sensor: string): boolean {
        return this._sensors.includes(sensor);
    }
    
    /**
     * Function to notify the group that a sensor's name was changed. If the name corresponds to a
     * child sensor, its name gets updated.
     *
     * @param {string} oldName - The name of the existing sensor to be renamed.
     * @param {string} newName - The new name for the sensor.
     * @returns {boolean} `true` if the renamed sensor was a child and the renaming had an effect. `false` otherwise.
     */
    public sensorRenamed(oldName: string, newName: string): boolean {
        if (this.containsSensor(oldName)) {
            this.removeSensor(oldName);
            this.addSensor(newName);
            return true;
        } else {
            return false;
        }
    }
    
    /**
     * Converts the group instance into its JSON representation.
     *
     * @returns {GroupJSON} The JSON representation of `this`.
     */
    public toJSON(): GroupJSON {
        return {
            name:        this.name,
            displayName: this.displayName,
            groups:      this._groups.slice(),
            actuators:   this._actuators.slice(),
            sensors:     this._sensors.slice(),
            sensorMix:   this.sensorMix,
            actuatorMix: this.actuatorMix
        };
    }
    
    /**
     * Constructs a new Group instance from a given JSON representation.
     *
     * @param {GroupJSON} groupJSON - The JSON representation of the group.
     * @returns {Group} The Group object constructed from the provided JSON.
     */
    public static fromJSON(groupJSON: GroupJSON): Group {
        const group = new Group(groupJSON.name, groupJSON.displayName);
        group._groups.push(...new Set(groupJSON.groups));
        group._actuators.push(...new Set(groupJSON.actuators));
        group._sensors.push(...new Set(groupJSON.sensors));
        group.sensorMix   = groupJSON.sensorMix;
        group.actuatorMix = groupJSON.actuatorMix;
        return group;
    }
}

/**
 * The serialization of the class {@link Group|`Group`}.
 */
export class GroupJSON {
    
    /**
     * Serialization of the property {@link Group#name|`Group.name`}.
     */
    @IsNotEmpty()
    @Matches(UNIQUE_NAME_PATTERN)
    public name: string;
    
    /**
     * Serialization of the property {@link Group#displayName|`Group.displayName`}.
     */
    @IsNotEmpty()
    public displayName: string;
    
    /**
     * Serialization of the property {@link Group#groups|`Group.groups`}.
     */
    @IsArray()
    @Matches(UNIQUE_NAME_PATTERN, {each: true})
    public groups: string[] = [];
    
    /**
     * Serialization of the property {@link Group#actuators|`Group.actuators`}.
     */
    @IsArray()
    @Matches(UNIQUE_NAME_PATTERN, {each: true})
    public actuators: string[] = [];
    
    /**
     * Serialization of the property {@link Group#sensors|`Group.sensors`}.
     */
    @IsArray()
    @Matches(UNIQUE_NAME_PATTERN, {each: true})
    public sensors: string[] = [];
    
    /**
     * Serialization of the property {@link Group#sensorMix|`Group.sensorMix`}.
     */
    @ValidateIf((o: GroupJSON) => o.sensorMix !== null)
    @IsInt()
    @Min(0)
    public sensorMix: number | null = null;
    
    /**
     * Serialization of the property {@link Group#actuatorMix|`Group.actuatorMix`}.
     */
    @ValidateIf((o: GroupJSON) => o.actuatorMix !== null)
    @IsInt()
    @Min(0)
    public actuatorMix: number | null = null;
    
    /**
     * Creates an instance of the class.
     *
     * @param {string} name - The unique name of the group.
     * @param {string} displayName - The display name of the group.
     */
    constructor(name: string, displayName: string) {
        this.name        = name;
        this.displayName = displayName;
    }
    
}
