/**
 * This module contains the {@link GroupService|`GroupService`} class, handling the business logic about {@link Group|`Group`s}.
 *
 * @module
 */
import {BadRequestException, ConflictException, forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException} from "@nestjs/common";
import {Group, GroupJSON} from "@common/devices/group/group";
import {FileService} from "../../helpers/file/file.service";
import {ActuatorService} from "../actuator/actuator.service";
import {DeleteGroupChildFate, DeleteGroupOptions, GetGroupsOptions, GroupEditChanges} from "@common/devices/group/rest-classes";
import {EntityType} from "@common/devices/constants";
import {Device} from "@common/devices/device";
import {SensorService} from "../sensor/sensor.service";
import {PersistentDataService} from "../../helpers/file/persistent-data-service";
import {MixPhase} from "@common/mixing/mix/rest-classes";
import {MixService} from "../../mixing/mix/mix.service";
import {UnavailableParents} from "@common/devices/rest-classes";
import {Mix} from "@common/mixing/mix/mix";

// noinspection ES6UnusedImports
import type {Actuator} from '@common/devices/actuator/actuator';
// noinspection ES6UnusedImports
import type {Sensor} from '@common/devices/sensor/sensor';


/**
 * The path of the file where to save the data about {@link Group|`Group`s}.
 */
const SAVE_FILE = "devices/group.json";

/**
 * This service handles the business logic about {@link Group|`Group`s}.
 */
@Injectable()
export class GroupService extends PersistentDataService<GroupData, GroupDataJSON> {
    
    /**
     * Creates an instance of the class. Do not call this constructor directly, it's handled by dependency injection.
     *
     * @param {FileService} fileService - The service handling persistent storage. Instantiated by dependency injection.
     * @param {ActuatorService} actuatorService - The service handling {@link Actuator|`Actuator`} business logic. Instantiated by dependency injection.
     * @param {SensorService} sensorService - The service handling {@link Sensor|`Sensor`} business logic. Instantiated by dependency injection.
     * @param {MixService} mixService - The service handling {@link Mix|`Mix`} business logic. Instantiated by dependency injection.
     */
    constructor(
        fileService: FileService,
        @Inject(forwardRef(() => ActuatorService))
        private actuatorService: ActuatorService,
        @Inject(forwardRef(() => SensorService))
        private sensorService: SensorService,
        @Inject(forwardRef(() => MixService))
        private mixService: MixService
    ) {
        super(fileService, SAVE_FILE, GroupData);
    }
    
    /**
     * Get all {@link Group|`Group`s} in the system, optionally filtered by {@link Mix|`Mix`}.
     *
     * @param {GetGroupsOptions} options - The options to filter the results.
     * @returns {Promise<Group[]>} An array containing the resulting {@link Group|`Group`s}.
     * @throws {BadRequestException} - {@link BadRequestException|`BadRequestException`} if one of {@link GetGroupsOptions#actuatorMix|`actuatorMix`} and {@link GetGroupsOptions#sensorMix|`sensorMix`} is specified at the same time as {@link GetGroupsOptions#anyMixed|`anyMixed`}.
     */
    public async getAllGroups(options: GetGroupsOptions = {}): Promise<Group[]> {
        if (options.anyMixed != undefined && options.anyMixed) {
            if ((options.sensorMix !== undefined) || (options.actuatorMix !== undefined)) {
                throw new BadRequestException("Either set anyMixed to false/undefined, of do not specify sensorMix or actuatorMix");
            }
        }
        return (await this.data)
            .groups
            .filter(group => {
                if (options.anyMixed === true) {
                    return group.sensorMix != null || group.actuatorMix != null;
                } else {
                    if (options.actuatorMix !== undefined) {
                        if (group.actuatorMix !== options.actuatorMix) {
                            return false;
                        }
                    }
                    if (options.sensorMix !== undefined) {
                        if (group.sensorMix !== options.sensorMix) {
                            return false;
                        }
                    }
                    return true;
                }
            });
    }
    
    /**
     * Get a {@link Group|`Group`} with a specific {@link Group#name|`name`}.
     *
     * @param {string} name - The {@link Group#name|`name`} of the group to retrieve.
     * @returns {Promise<Group | null>} - The {@link Group|`Group`} or null if not found.
     */
    public async getGroupByName(name: string): Promise<Group | null> {
        return (await this.data).groups.find(a => a.name === name) ?? null;
    }
    
    /**
     * Creates a new {@link Group|`Group`} in the system.
     *
     * @param {Group} group - The {@link Group|`Group`} to be created.
     * @param {string | null} parentName - The name of the {@link Group|`Group`} where the new group will be placed, or null.
     * @throws {BadRequestException} - If the group has children.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if there already exist a {@link Group|group} with the same {@link Group#name|name}.
     * @throws {NotFoundException} - If parent does not exist.
     */
    public async createGroup(group: Group, parentName: string | null): Promise<void> {
        if ((group.groups.length > 0) || (group.actuators.length > 0) || (group.sensors.length > 0)) {
            throw new BadRequestException(undefined, "A new group cannot be created already with children");
        }
        const data               = await this.data;
        const alreadyExisting    = data.groups.some(otherGroup => otherGroup.name === group.name);
        let parent: Group | null = null;
        if (parentName != null) {
            parent = data.groups.find(otherGroup => otherGroup.name === parentName) ?? null;
            if (parent == null) {
                throw new NotFoundException(undefined, "Parent group does not exist");
            }
        }
        if (!alreadyExisting) {
            data.groups.push(group);
            if (parent != null) {
                parent.addGroup(group.name);
            }
            this.saveData();
        } else {
            throw new ConflictException();
        }
    }
    
    /**
     * Edit a {@link Group|`Group`}'s properties, given its {@link Group#name|`name`}.
     *
     * @param {string} oldName - The {@link Group#name|`name`} of the group to edit.
     * @param {GroupEditChanges} edit - The {@link GroupEditChanges|properties} to be updated.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Group|`Group`} was found with the specified name.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if a new {@link Group#name|`name`} was specified, but a {@link Group|group} with that name already exists.
     */
    public async editGroup(oldName: string, edit: GroupEditChanges): Promise<void> {
        const data        = await this.data;
        const newName     = edit.name;
        const groupToEdit = data.groups.find(otherGroup => otherGroup.name === oldName);
        if (groupToEdit == null) {
            throw new NotFoundException();
        }
        let alreadyExisting = false;
        if (oldName !== newName) {
            alreadyExisting = data.groups.some(otherGroup => otherGroup.name === edit.name);
        }
        if (!alreadyExisting) {
            let displayChanged = false;
            let nameChanged    = false;
            if (edit.displayName != null) {
                displayChanged          = groupToEdit.displayName != edit.displayName;
                groupToEdit.displayName = edit.displayName;
            }
            if ((newName != null) && (oldName != newName)) {
                nameChanged      = true;
                groupToEdit.name = newName;
                data.groups.forEach(otherGroup => {
                    otherGroup.groupRenamed(oldName, newName);
                });
            }
            if (displayChanged || nameChanged) {
                await this.mixService.groupRenamed(oldName, groupToEdit.name, groupToEdit.displayName);
            }
            this.saveData();
        } else {
            throw new ConflictException();
        }
    }
    
    /**
     * Removes a {@link Group|`Group`} from the system by its name, if possible.
     *
     * @param {string} name - The {@link Group#name|`name`} of the {@link Group|group} to remove.
     * @param {DeleteGroupOptions} options - The options for handling children of the deleted group.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Group|`Group`} was found with the specified name.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if the {@link Group|`Group`} cannot be deleted because it is linked to a {@link Mix|mix} that is
     *     referenced by another {@link Mix|mix}.
     */
    public async deleteGroup(
        name: string,
        options: DeleteGroupOptions
    ): Promise<void> {
        const data          = await this.data;
        const groupToDelete = data.groups.find(otherGroup => otherGroup.name === name);
        if (groupToDelete == null) {
            throw new NotFoundException();
        }
        let destinationGroup: Group | null = null;
        const mixes: number[]              = [];
        if (groupToDelete.sensorMix != null) {
            mixes.push(groupToDelete.sensorMix);
        }
        if (groupToDelete.actuatorMix != null) {
            mixes.push(groupToDelete.actuatorMix);
        }
        if (!await this.mixService.canDelete(EntityType.GROUP, name, mixes)) {
            throw new ConflictException(`Cannot delete group "${name}" it is linked to a mix that is referenced in a mix downstream`);
        }
        if (groupToDelete.hasChildren) {
            switch (options.fate) {
                case DeleteGroupChildFate.CURRENT_LEVEL: {
                    const parentGroup = data.groups.find(group => group.containsGroup(name));
                    if (parentGroup != null) {
                        destinationGroup = parentGroup;
                    }
                    break;
                }
                case DeleteGroupChildFate.CHOOSE_WHERE: {
                    destinationGroup = data.groups.find(group => group.name === options.parent) ?? null;
                    if (destinationGroup == null) {
                        throw new NotFoundException(undefined, "Destination group does not exist");
                    }
                    break;
                }
                case null:
                case DeleteGroupChildFate.ROOT_LEVEL: {
                    destinationGroup = null;
                    break;
                }
            }
            if (options.fate != DeleteGroupChildFate.CURRENT_LEVEL) {
                for (const childGroup of groupToDelete.groups) {
                    await this.testGroupMoveTo(childGroup, destinationGroup?.name ?? null);
                }
                for (const childActuator of groupToDelete.actuators) {
                    await this.testActuatorMoveTo(childActuator, destinationGroup?.name ?? null);
                }
                for (const childSensor of groupToDelete.sensors) {
                    await this.testSensorMoveTo(childSensor, destinationGroup?.name ?? null);
                }
            }
        }
        if (destinationGroup != null) {
            const children = groupToDelete.getAllDescendants(data.groups);
            if (children.includes(destinationGroup.name)) {
                throw new BadRequestException(undefined, "Cannot move a group into one of its own descendants");
            }
            groupToDelete.groups.forEach(group => { destinationGroup.addGroup(group);});
            groupToDelete.actuators.forEach(actuator => { destinationGroup.addActuator(actuator);});
            groupToDelete.sensors.forEach(sensor => { destinationGroup.addSensor(sensor);});
        }
        const toDeleteIndex = data.groups.findIndex(otherGroup => otherGroup.name === name);
        if (toDeleteIndex !== -1) {
            data.groups.splice(toDeleteIndex, 1);
        }
        const parentGroup = data.groups.find(group => group.containsGroup(name));
        if (parentGroup != null) {
            parentGroup.removeGroup(name);
        }
        this.saveData();
    }
    
    /**
     * Move an entity inside a different {@link Group|`Group`}, or take it out of any {@link Group|`Group`}.
     *
     * @param {string} entityToMove - The name of the entity to move.
     * @param {string | null} newParentName - The name of the new parent {@link Group|`Group`} or null to remove the parent.
     * @param {EntityType} entityType - The type of the entity.
     * @throws {NotFoundException} - If the entity or new parent does not exist.
     * @throws {ConflictException} - If the move would break dependencies.
     */
    public async changeParent(entityToMove: string, newParentName: string | null, entityType: EntityType): Promise<void> {
        const data                  = await this.data;
        let elementToMove: Group | Device | null;
        let newParent: Group | null = null;
        if (newParentName != null) {
            newParent = data.groups.find(otherGroup => otherGroup.name === newParentName) ?? null;
            if (newParent == null) {
                throw new NotFoundException(undefined, "New parent group does not exist");
            }
        }
        switch (entityType) {
            case EntityType.GROUP: {
                const groupToMove = elementToMove = data.groups.find(otherGroup => otherGroup.name === entityToMove) ?? null;
                if (groupToMove != null) {
                    await this.testGroupMoveTo(groupToMove.name, newParentName);
                }
                break;
            }
            case EntityType.SENSOR: {
                const sensorToMove = elementToMove = await this.sensorService.getSensorByName(entityToMove);
                if (sensorToMove != null) {
                    await this.testSensorMoveTo(sensorToMove.name, newParentName);
                }
                break;
            }
            case EntityType.ACTUATOR: {
                const actuatorToMove = elementToMove = await this.actuatorService.getActuatorByName(entityToMove);
                if (actuatorToMove != null) {
                    await this.testActuatorMoveTo(actuatorToMove.name, newParentName);
                }
                break;
            }
        }
        if (elementToMove == null) {
            throw new NotFoundException("Could not find requested element");
        }
        if (newParentName != null) {
            if ((entityType == EntityType.GROUP) && (elementToMove instanceof Group)) {
                const descendants = elementToMove.getAllDescendants(data.groups);
                if (descendants.includes(newParentName)) {
                    throw new ConflictException(undefined, "Cannot move a group into one of its own descendants");
                }
            }
        }
        switch (entityType) {
            case EntityType.GROUP: {
                const oldParent = data.groups.find(otherGroup => otherGroup.containsGroup(entityToMove));
                if (oldParent != null) {
                    oldParent.removeGroup(entityToMove);
                }
                break;
            }
            case EntityType.ACTUATOR: {
                const oldParent = data.groups.find(otherGroup => otherGroup.containsActuator(entityToMove));
                if (oldParent != null) {
                    oldParent.removeActuator(entityToMove);
                }
                break;
            }
            case EntityType.SENSOR: {
                const oldParent = data.groups.find(otherGroup => otherGroup.containsSensor(entityToMove));
                if (oldParent != null) {
                    oldParent.removeSensor(entityToMove);
                }
                break;
            }
            
        }
        if (newParent != null) {
            switch (entityType) {
                case EntityType.GROUP:
                    newParent.addGroup(entityToMove);
                    break;
                case EntityType.ACTUATOR:
                    newParent.addActuator(entityToMove);
                    break;
                case EntityType.SENSOR:
                    newParent.addSensor(entityToMove);
                    break;
            }
        }
        this.saveData();
    }
    
    /**
     * Returns information about all the {@link Group|`Group`s} that cannot be parents for this entity, because they would break
     * dependencies inside the {@link Mix|mixes}. For example, if a {@link Group|group}'s {@link Mix|`Mix`} is referenced by a parent {@link Group|group}'s
     * {@link Mix|`Mix`}, this parent must remain in the hierarchy, otherwise the {@link Group|group}'s {@link Mix|mix} will not be able to reach it.
     *
     * @param {string} name - The name of the entity.
     * @param {EntityType} entityType - The type of the entity.
     * @returns {Promise<UnavailableParents>} The information about the unavailable groups.
     */
    public async getUnavailableParents(name: string, entityType: EntityType): Promise<UnavailableParents> {
        const data = await this.data;
        const result: UnavailableParents = {
            names: [],
            displayNames: [],
            unreachable: null,
            depending: null
        };

        let availableGroups: {
            available: (Group | null)[],
            blocking: Group | null,
            unreachableMix: Mix | null,
            dependingMix: Mix | null
        };

        switch (entityType) {
            case EntityType.SENSOR:
                availableGroups = await this.mixService.sensorMixAvailableGroups(EntityType.SENSOR, name);
                break;
            case EntityType.ACTUATOR:
                availableGroups = await this.mixService.actuatorMixAvailableGroups(EntityType.ACTUATOR, name);
                break;
            case EntityType.GROUP: {
                const sensorSide = await this.mixService.sensorMixAvailableGroups(EntityType.GROUP, name);
                const actuatorSide = await this.mixService.actuatorMixAvailableGroups(EntityType.GROUP, name);
                
                // Intersection of available groups
                const available = sensorSide.available.filter(g => actuatorSide.available.includes(g));
                
                // Blocking is the nearest parent of the two
                let blocking = sensorSide.blocking;
                let unreachableMix = sensorSide.unreachableMix;
                let dependingMix = sensorSide.dependingMix;
                
                if (actuatorSide.blocking != null) {
                    const sensorAncestors = sensorSide.blocking ? (await this.getAncestorGroups(sensorSide.blocking.name)).map(g => g.name) : [];
                    if (blocking == null || sensorAncestors.includes(actuatorSide.blocking.name)) {
                        blocking = actuatorSide.blocking;
                        unreachableMix = actuatorSide.unreachableMix;
                        dependingMix = actuatorSide.dependingMix;
                    }
                }

                availableGroups = {
                    available,
                    blocking,
                    unreachableMix,
                    dependingMix
                };
                break;
            }
            default:
                throw new InternalServerErrorException("Unknown entity type");
        }

        for (const group of data.groups) {
            if (!availableGroups.available.includes(group)) {
                result.names.push(group.name);
                result.displayNames.push(group.displayName);
            }
        }
        if (!availableGroups.available.includes(null)) {
            result.names.push(null);
            result.displayNames.push(null);
        }

        if ((availableGroups.unreachableMix != null) && (availableGroups.unreachableMix.id != "NEW")) {
            result.unreachable = await this.mixService.getMixPosition(availableGroups.unreachableMix.id);
        }
        if ((availableGroups.dependingMix != null) && (availableGroups.dependingMix.id != "NEW")) {
            result.depending = await this.mixService.getMixPosition(availableGroups.dependingMix.id);
        }

        return result;
    }
    
    /**
     * This method checks whether an {@link Actuator|`Actuator`} can be moved to a specific group, without
     * breaking dependencies betweeen {@link Mix|`Mix`es}. In case it can't be moved, this function throws a {@link ConflictException}.
     *
     * @param {string} actuatorToMoveName - The name of the actuator to move.
     * @param {string | null} newParentName - The name of the new parent {@link Group|`Group`} or null to check the move to the root of the system.
     * @returns {Promise<void>}
     * @throws {ConflictException} - If the move would break dependencies.
     */
    private async testActuatorMoveTo(actuatorToMoveName: string, newParentName: string | null): Promise<void> {
        const availableGroups = await this.mixService.actuatorMixAvailableGroups(EntityType.ACTUATOR, actuatorToMoveName);
        if (!availableGroups.available.some(availableGroup => availableGroup?.name == newParentName)) {
            throw new ConflictException(`Actuator ${
                actuatorToMoveName
            } cannot be moved to ${
                newParentName
            }: it's depending on ${
                availableGroups.blocking?.name
            } through a mix, and would be excluded from reaching it`);
        }
    }
    
    /**
     * This method checks whether a {@link Sensor|`Sensor`} can be moved to a specific group, without
     * breaking dependencies between {@link Mix|`Mix`es}. In case it can't be moved, this function throws a {@link ConflictException}.
     *
     * @param {string} sensorToMove - The name of the sensor to move.
     * @param {string | null} newParentName - The name of the new parent {@link Group|`Group`} or null to check the move to the root of the system.
     * @returns {Promise<void>}
     * @throws {ConflictException} - If the move would break dependencies.
     */
    private async testSensorMoveTo(sensorToMove: string, newParentName: string | null): Promise<void> {
        const availableGroups = await this.mixService.sensorMixAvailableGroups(EntityType.SENSOR, sensorToMove);
        if (!availableGroups.available.some(availableGroup => availableGroup?.name == newParentName)) {
            throw new ConflictException(`Sensor ${
                sensorToMove
            } cannot be moved to ${
                newParentName
            }: ${
                availableGroups.blocking?.name
            } is depending on it through a mix, and would be excluded from reaching it`);
        }
    }
    
    /**
     * This method checks whether a {@link Group|`Group`} can be moved to a specific group, without
     * breaking dependencies between {@link Mix|`Mix`es} on both sensor and actuator sides.
     * In case it can't be moved, this function throws a {@link ConflictException}.
     *
     * @param {string} groupToMoveName - The name of the group to move.
     * @param {string | null} newParentName - The name of the new parent {@link Group|`Group`} or null to check the move to the root of the system.
     * @returns {Promise<void>}
     * @throws {ConflictException} - If the move would break dependencies.
     */
    private async testGroupMoveTo(groupToMoveName: string, newParentName: string | null): Promise<void> {
        const availableGroupsSensorSide = await this.mixService.sensorMixAvailableGroups(EntityType.GROUP, groupToMoveName);
        if (!availableGroupsSensorSide.available.some(availableGroup => availableGroup?.name == newParentName)) {
            throw new ConflictException(`Group "${
                groupToMoveName
            }" cannot be moved to ${
                newParentName != null ? `"${newParentName}"` : "the root"
            }: "${
                availableGroupsSensorSide.blocking?.name
            }" is depending on it (or one of its descendants) through a mix, and would be excluded from reaching it`);
        }
        const availableGroupsActuatorSide = await this.mixService.actuatorMixAvailableGroups(EntityType.GROUP, groupToMoveName);
        if (!availableGroupsActuatorSide.available.some(availableGroup => availableGroup?.name == newParentName)) {
            throw new ConflictException(`Group "${
                groupToMoveName
            }" cannot be moved to ${
                newParentName != null ? `"${newParentName}"` : "the root"
            }: it (or one of its descendants) is depending on "${
                availableGroupsActuatorSide.blocking?.name
            }" through a mix, and would be excluded from reaching it`);
        }
    }
    
    /**
     * Add a device to a group, keeping a consistent status of the system. If the device is not assigned to a group, it gets added to its
     * child devices. If it is not, it either moves it if `move` is true, or errors out. It optionally checks for the existence of the
     * device.
     *
     * @param {string} groupName - The name of the group to which the device will be added.
     * @param {string} deviceName - The name of the device to add.
     * @param {EntityType} entityType - The type of the device. Cannot be {@link EntityType.GROUP|`GROUP`}.
     * @param {boolean} move - Whether to move the device if it is already in another group.
     * @param {boolean} mustExist - Whether check the existence of the device.
     * @returns {Promise<void>}
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if the target group does not exist, or if the device does not exist in the case `mustExist` is `true`.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if the device is already in another group.
     * @throws {InternalServerErrorException} - {@link InternalServerErrorException|`InternalServerErrorException`} if the entity type is {@link EntityType.GROUP|`GROUP`}.
     */
    public async addDevice(groupName: string, deviceName: string, entityType: EntityType, move: boolean, mustExist: boolean = true): Promise<void> {
        if (entityType == EntityType.GROUP) {
            throw new InternalServerErrorException();
        }
        const data = await this.data;
        let containingGroup: Group | null;
        if (entityType == EntityType.ACTUATOR) {
            containingGroup = data.groups.find(otherGroup => otherGroup.containsActuator(deviceName)) ?? null;
        } else {
            containingGroup = data.groups.find(otherGroup => otherGroup.containsSensor(deviceName)) ?? null;
        }
        const targetGroup = data.groups.find(otherGroup => otherGroup.name == groupName);
        if (targetGroup == null) {
            throw new NotFoundException(undefined, "Target group does not exist");
        }
        if (mustExist) {
            let deviceExists: boolean;
            if (entityType == EntityType.ACTUATOR) {
                deviceExists = await this.actuatorService.actuatorExists(deviceName);
            } else {
                deviceExists = await this.sensorService.sensorExists(deviceName);
            }
            if (!deviceExists) {
                throw new NotFoundException(undefined, "Actuator does not exist");
            }
        }
        if (containingGroup?.name === groupName) {
            return;
        }
        if (!move && containingGroup != null) {
            throw new ConflictException(undefined, "The device is already in another group");
        }
        if (entityType == EntityType.ACTUATOR) {
            if (containingGroup != null) {
                containingGroup.removeActuator(deviceName);
            }
            targetGroup.addActuator(deviceName);
        } else {
            if (containingGroup != null) {
                containingGroup.removeSensor(deviceName);
            }
            targetGroup.addSensor(deviceName);
        }
        this.saveData();
    }
    
    /**
     * Removes a device from the system, removing the reference in the containing group (if it exists).
     * This function already handles the removal from the system calling the appropriate function in the correct service.
     *
     * @param {string} name - The name of the device to delete.
     * @param {EntityType.ACTUATOR | EntityType.SENSOR} entityType - The type of the device.
     * @returns {Promise<void>}
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if the device does not exist.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if the device is linked to a mix that is references and cannot be deleted.
     */
    public async removeDevice(name: string, entityType: EntityType.ACTUATOR | EntityType.SENSOR): Promise<void> {
        const data                         = await this.data;
        let elementToRemove: Device | null = null;
        if (entityType == EntityType.ACTUATOR) {
            elementToRemove = await this.actuatorService.getActuatorByName(name);
        } else { // EntityType.SENSOR
            elementToRemove = await this.sensorService.getSensorByName(name);
        }
        if (elementToRemove == null) {
            throw new NotFoundException();
        }
        if (entityType == EntityType.ACTUATOR) {
            const containingGroup = data.groups.find(otherGroup => otherGroup.containsActuator(name));
            if (containingGroup != null) {
                containingGroup.removeActuator(name);
            }
            await this.actuatorService.deleteActuator(name);
        } else { // EntityType.SENSOR
            if (!await this.mixService.canDelete(entityType, name, elementToRemove.mix != null ? [elementToRemove.mix] : [])) {
                throw new ConflictException(`Cannot delete device "${name}" it contains a mix that is referenced in a mix downstream`);
            }
            if (elementToRemove.mix != null) {
                await this
                    .mixService
                    .deleteMix(elementToRemove.mix, true)
                    .catch((err: unknown) => {console.error(err);});
            }
            const containingGroup = data.groups.find(otherGroup => otherGroup.containsSensor(name));
            if (containingGroup != null) {
                containingGroup.removeSensor(name);
            }
            await this.sensorService.deleteSensor(name);
        }
        this.saveData();
    }
    
    /**
     * Realign the references of an {@link Actuator|`Actuator`} after its unique name has been changed,
     * by finding its parent and renaming it into the parent's {@link Group#actuators|`actuators`} array.
     *
     * @param {string} oldName - The old name of the actuator, used in the groups, to find and substitute.
     * @param {string} newName - The new name of the actuator, to substitute into the matching group.
     * @returns {Promise<void>}
     */
    public async actuatorRenamed(oldName: string, newName: string): Promise<void> {
        const data = await this.data;
        data.groups.forEach(group => { group.actuatorRenamed(oldName, newName); });
        this.saveData();
    }
    
    /**
     * Realign the references of a {@link Sensor|`Sensor`} after its unique name has been changed,
     * by finding its parent and renaming it into the parent's {@link Group#sensors|`sensors`} array.
     *
     * @param {string} oldName - The old name of the sensor, used in the groups, to find and substitute.
     * @param {string} newName - The new name of the sensor, to substitute into the matching group.
     * @returns {Promise<void>}
     */
    public async sensorRenamed(oldName: string, newName: string): Promise<void> {
        const data = await this.data;
        data.groups.forEach(group => { group.sensorRenamed(oldName, newName); });
        this.saveData();
    }
    
    /**
     * Assign a mix to a group in the correct phase.
     *
     * @param {string} groupName - The name of the group to assign the mix to.
     * @param {number | "NEW"} mixId - The id of the mix to assign. Throws an error if `"NEW"`.
     * @param {MixPhase.ACTUATORS | MixPhase.SENSORS} phase - Whether the mix will be put into {@link Group#sensorMix|`Group.sensorMix`} or {@link Group#actuatorMix|`Group.actuatorMix`}.
     * @returns {Promise<void>}
     * @throws {BadRequestException} - {@link BadRequestException|`BadRequestException`} if the mix id is `"NEW"`.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if the group does not exist.
     */
    public async setMixForGroup(groupName: string, mixId: number | "NEW", phase: MixPhase.ACTUATORS | MixPhase.SENSORS): Promise<void> {
        
        if (mixId == "NEW") {
            throw new BadRequestException("Cannot assign a new mix directly");
        }
        const group = await this.getGroupByName(groupName);
        if (group == null) {
            throw new NotFoundException(`Cannot find group "${groupName}"`);
        } else {
            if (await this.mixService.getMixById(mixId) == null) {
                throw new NotFoundException(`Cannot find mix with id ${mixId}`);
            }
        }
        if (phase == MixPhase.SENSORS) {
            group.sensorMix = mixId;
        } else {
            group.actuatorMix = mixId;
        }
        this.saveData();
    }
    
    /**
     * Returns all the descending groups of any depth, not only the direct children.
     *
     * @param {string} groupName - The name of the group to get all the descendants of.
     * @returns {Promise<Group[]>} - All the matching groups.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if the group does not exist.
     */
    public async getDescendingGroups(groupName: string): Promise<Group[]> {
        const data  = await this.data;
        const group = data.groups.find(otherGroup => otherGroup.name === groupName);
        if (group == null) {
            throw new NotFoundException();
        }
        let toCheck                = group.groups;
        const descendants: Group[] = [];
        while (toCheck.length > 0) {
            const children: string[] = [];
            for (const child of toCheck) {
                const childGroup = data.groups.find(otherGroup => otherGroup.name === child);
                if (childGroup != null) {
                    descendants.push(childGroup);
                    children.push(...childGroup.groups);
                }
            }
            toCheck = children;
        }
        return descendants;
    }
    
    /**
     * Get all the group that have a group as a descendant, not only the direct container.
     *
     * @param {string} groupName - The name of the group to get the ancestors of.
     * @returns {Promise<Group[]>} - All the matching groups.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if the group does not exist.
     * @throws {InternalServerErrorException} - {@link InternalServerErrorException|`InternalServerErrorException`} if the search fails because the
     *                                          group hierarchy contains cycles.
     */
    public async getAncestorGroups(groupName: string): Promise<Group[]> {
        const data  = await this.data;
        const group = data.groups.find(otherGroup => otherGroup.name === groupName);
        if (group == null) {
            throw new NotFoundException();
        }
        let toCheck              = data.groups.filter(otherGroup => otherGroup.containsGroup(groupName));
        const ancestors: Group[] = [];
        while ((toCheck.length > 0) && (ancestors.length < data.groups.length)) {
            ancestors.push(...toCheck);
            toCheck = toCheck.flatMap(parent => data.groups.filter(otherGroup => otherGroup.containsGroup(parent.name)));
        }
        if (toCheck.length > 0) {
            throw new InternalServerErrorException();
        }
        return ancestors;
    }
    
    /**
     * Find the group an {@link Actuator|`Actuator`} is assigned to.
     *
     * @param {string} name - The name of the actuator of which to find the parent group.
     * @returns {Promise<Group | null>} - The group, or `null` if the actuator is assigned to the root.
     */
    public async getActuatorGroup(name: string): Promise<Group | null> {
        const data = await this.data;
        return data.groups.find(otherGroup => otherGroup.containsActuator(name)) ?? null;
    }
    
    /**
     * Find the group a {@link Sensor|`Sensor`} is assigned to.
     *
     * @param {string} name - The name of the sensor of which to find the parent group.
     * @returns {Promise<Group | null>} - The group, or `null` if the sensor is assigned to the root.
     */
    public async getSensorGroup(name: string): Promise<Group | null> {
        const data = await this.data;
        return data.groups.find(otherGroup => otherGroup.containsSensor(name)) ?? null;
    }
    
    /**
     * Retrieves the entire chain of ancestor {@link Group|`Group`s} for a given entity. For groups, this is the same as
     * {@link GroupService#getAncestorGroups|`GroupService.getAncestorGroups()`}. For devices, it's that function applied to the parent group.
     *
     * @param {EntityType} entityType - The type of the entity (Group, Sensor, or Actuator).
     * @param {string} name - The unique name of the entity.
     * @returns {Promise<Group[]>} - An array of {@link Group|`Group`s} that are the ancestors of the entity.
     */
    public async getParentChain(entityType: EntityType, name: string): Promise<Group[]> {
        switch (entityType) {
            case EntityType.GROUP:
                return this.getAncestorGroups(name);
            case EntityType.ACTUATOR: {
                const group = await this.getActuatorGroup(name);
                if (group == null) {
                    return [];
                }
                return [group, ...await this.getAncestorGroups(group.name)];
            }
            case EntityType.SENSOR: {
                const group = await this.getSensorGroup(name);
                if (group == null) {
                    return [];
                }
                return [group, ...await this.getAncestorGroups(group.name)];
            }
        }
    }
    
    /**
     * Removes a reference from a {@link Group|`Group`} to a {@link Mix|`Mix`} through {@link Group#sensorMix|`Group.sensorMix`},
     * setting the reference to `null`.
     *
     * @param {string} name - The name of the group for which to remove the reference.
     * @returns {Promise<void>}
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if the group does not exist.
     */
    public async removeSensorMixFromGroup(name: string): Promise<void> {
        const group = await this.getGroupByName(name);
        if (group == null) {
            throw new NotFoundException(`Cannot find group "${name}"`);
        }
        group.sensorMix = null;
        this.saveData();
    }
    
    /**
     * Removes a reference from a {@link Group|`Group`} to a {@link Mix|`Mix`} through {@link Group#actuatorMix|`Group.actuatorMix`},
     * setting the reference to `null`.
     *
     * @param {string} name - The name of the group for which to remove the reference.
     * @returns {Promise<void>}
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if the group does not exist.
     */
    public async removeActuatorMixFromGroup(name: string): Promise<void> {
        const group = await this.getGroupByName(name);
        if (group == null) {
            throw new NotFoundException(`Cannot find group "${name}"`);
        }
        group.actuatorMix = null;
        this.saveData();
    }
}

/**
 * The persistent data structure used by {@link GroupService|`GroupService`}
 * for persisting data about {@link Group|`Group`s}.
 */
export class GroupData {
    
    /**
     * All the groups in the system.
     */
    public groups: Group[];
    
    /**
     * Creates an instance of the class from the saved serialized {@link GroupDataJSON|`GroupDataJSON`}.
     *
     * @param {GroupDataJSON} groupDataJSON - The saved serialized {@link GroupDataJSON|`GroupDataJSON`} to use for populating the new instance.
     */
    constructor(groupDataJSON?: GroupDataJSON) {
        if (groupDataJSON) {
            this.groups = groupDataJSON.groups.map((groupJSON: GroupJSON) => Group.fromJSON(groupJSON));
        } else {
            this.groups = [];
        }
    }
    
    /**
     * Converts the group data instance into its JSON representation.
     *
     * @returns {GroupDataJSON} The JSON representation of `this`.
     */
    public toJSON(): GroupDataJSON {
        return {
            groups: this.groups.map((group: Group) => group.toJSON())
        };
    }
    
}

/**
 * The serialization of the class {@link GroupData|`GroupData`}.
 */
export interface GroupDataJSON {
    
    /**
     * Serialization of the property {@link GroupData#groups|`groups`}.
     */
    groups: GroupJSON[];
    
}
