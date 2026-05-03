/**
 * This module contains the {@link ActuatorService|`ActuatorService`} class, handling the business logic about {@link Actuator|`Actuator`s}.
 *
 * @module
 */
import {BadRequestException, ConflictException, forwardRef, Inject, Injectable, NotFoundException} from "@nestjs/common";
import {FileService} from "../../helpers/file/file.service";
import {MixService} from "../../mixing/mix/mix.service";
import {Actuator, ActuatorJSON} from "@common/devices/actuator/actuator";
import {GroupService} from "../group/group.service";
import {ActuatorEditChanges} from "@common/devices/actuator/rest-classes";
import {Datum, DatumChangeType} from "@common/mixing/mix/datum";
import {EntityType} from "@common/devices/constants";
import {PersistentDataService} from "../../helpers/file/persistent-data-service";
import {GetDevicesOptions} from "@common/devices/rest-classes";

// noinspection ES6UnusedImports
import type {Group} from '@common/devices/group/group';
// noinspection ES6UnusedImports
import type {Mix} from '@common/mixing/mix/mix';

/**
 * The path of the file where to save the data about {@link Actuator|`Actuator`s}.
 */
const SAVE_FILE = "devices/actuator.json";

/**
 * This service handles the business logic about {@link Actuator|`Actuator`s}.
 */
@Injectable()
export class ActuatorService extends PersistentDataService<ActuatorData, ActuatorDataJSON> {
    
    /**
     * Creates an instance of the class. Do not call this constructor directly, it's handled by dependency injection.
     *
     * @param {FileService} fileService - The service handling persistent storage. Instantiated by dependency injection.
     * @param {GroupService} groupService - The service handling {@link Group|`Group`} business logic. Instantiated by dependency injection.
     * @param {MixService} mixService - The service handling {@link Mix|`Mix`} business logic. Instantiated by dependency injection.
     */
    constructor(
        fileService: FileService,
        @Inject(forwardRef(() => GroupService))
        private groupService: GroupService,
        @Inject(forwardRef(() => MixService))
        private mixService: MixService
    ) {
        super(fileService, SAVE_FILE, ActuatorData);
    }
    
    /**
     * Get all {@link Actuator|`Actuator`s} in the system, optionally filtered by {@link Mix|`Mix`}.
     *
     * @param {GetDevicesOptions} options - The options to filter the results.
     * @returns {Promise<Actuator[]>} An array containing the resulting {@link Actuator|`Actuator`s}.
     * @throws {BadRequestException} - {@link BadRequestException|`BadRequestException`} if both {@link GetDevicesOptions#mix|`mix`} and {@link GetDevicesOptions#anyMixed|`anyMixed`} are
     *     specified at the same time.
     */
    public async getAllActuators(options: GetDevicesOptions = {}): Promise<Actuator[]> {
        if (options.anyMixed !== undefined) {
            if (options.mix !== undefined) {
                throw new BadRequestException([
                                                  "Either set anyMixed to undefined, or do not specify the mix"
                                              ]);
            }
        }
        return (await this.data)
            .actuators
            .filter(
                actuator => {
                    if (options.anyMixed === true) {
                        return actuator.mix != null;
                    } else if (options.anyMixed === false) {
                        return actuator.mix == null;
                    } else {
                        if (options.mix !== undefined) {
                            if (actuator.mix !== options.mix) {
                                return false;
                            }
                        }
                        return true;
                    }
                }
            );
    }
    
    /**
     * Get an {@link Actuator|`Actuator`} with a specific {@link Actuator#name|`name`}.
     *
     * @param {string} name - The {@link Actuator#name|`name`} of the actuator to retrieve.
     * @returns {Promise<Actuator | null>} - The {@link Actuator|`Actuator`} or null if not found.
     */
    public async getActuatorByName(name: string): Promise<Actuator | null> {
        return (await this.data).actuators.find(a => a.name === name) ?? null;
    }
    
    /**
     * Get multiple {@link Actuator|`Actuator`s} given a list of {@link Actuator#name|`name`s}.
     *
     * @param {string[]} names - The list of names for which to retrieve the {@link Actuator|`Actuator`s}.
     * @returns {Promise<Actuator[]>} An array containing the resulting {@link Actuator|`Actuator`s}.
     *                                The order is not ensured to be the same as the names, neither the length,
     *                                in case some names don't match with any {@link Actuator|`Actuator`}.
     */
    public async getActuatorsByName(names: string[]): Promise<Actuator[]> {
        return (await this.data).actuators.filter(a => names.includes(a.name));
    }
    
    /**
     * Creates a new device of type {@link Actuator|`Actuator`} in the system.
     *
     * @param {Actuator} actuator - The {@link Actuator|`Actuator`} to be created.
     * @param {string | null} parentName - The name of the {@link Group|`Group`} where the actuator will be placed, or null.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if there already exist an {@link Actuator|actuator} with the same {@link Actuator#name|name}.
     */
    public async createActuator(actuator: Actuator, parentName: string | null): Promise<void> {
        const data            = await this.data;
        const alreadyExisting = data.actuators.some(otherActuator => otherActuator.name === actuator.name);
        if (alreadyExisting) {
            throw new ConflictException();
        }
        if (parentName != null) {
            await this.groupService.addDevice(parentName, actuator.name, EntityType.ACTUATOR, false, false);
        }
        data.actuators.push(actuator);
        
        this.saveData();
    }
    
    /**
     * Checks if a name corresponds to an existing {@link Actuator|`Actuator`}.
     *
     * @param {string} actuatorName - The name to check.
     * @returns {Promise<boolean>} Whether there exists an {@link Actuator|`Actuator`} with the specified name.
     */
    public async actuatorExists(actuatorName: string): Promise<boolean> {
        return (await this.data).actuators.some(a => a.name === actuatorName);
    }
    
    /**
     * Removes an {@link Actuator|`Actuator`} identified by name from the system.
     *
     * @param {string} name - The name of the {@link Actuator|`Actuator`} to remove from the system.
     * @returns {Promise<void>}
     */
    public async deleteActuator(name: string): Promise<void> {
        const data             = await this.data;
        const actuatorToDelete = data.actuators.find(otherActuator => otherActuator.name === name);
        if (actuatorToDelete == null) {
            throw new NotFoundException();
        }
        const toDeleteIndex = data.actuators.findIndex(otherActuator => otherActuator.name === name);
        if (toDeleteIndex !== -1) {
            data.actuators.splice(toDeleteIndex, 1);
        }
        this.saveData();
    }
    
    /**
     * Edit an {@link Actuator|`Actuator`}'s properties, given its {@link Actuator#name|`name`}.
     *
     * @param {string} oldName - The {@link Actuator#name|`name`} of the actuator to edit.
     * @param {ActuatorEditChanges} edit - The {@link ActuatorEditChanges|properties} to be updated.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Actuator|`Actuator`} was found with the specified name.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if a new {@link Actuator#name|`name`} was specified, but an {@link Actuator|actuator} with that name
     *     already exists.
     */
    public async editActuator(oldName: string, edit: ActuatorEditChanges): Promise<void> {
        const data           = await this.data;
        const newName        = edit.name;
        const actuatorToEdit = data.actuators.find(otherActuator => otherActuator.name === oldName);
        if (actuatorToEdit == null) {
            throw new NotFoundException();
        }
        let alreadyExisting = false;
        if (oldName !== newName) {
            alreadyExisting = data.actuators.some(otherActuator => otherActuator.name === edit.name);
        }
        if (!alreadyExisting) {
            if (edit.exposes != null) {
                const exposeChanges = actuatorToEdit.calculateExposesChanges(edit.exposes.map(expose => Datum.fromJSON(expose)));
                for (const change of exposeChanges.filter(deletion => deletion.change === DatumChangeType.DELETED)) {
                    const index = actuatorToEdit.exposes.findIndex(otherExpose => otherExpose.name == change.datum.name);
                    if (index != -1) {
                        actuatorToEdit.exposes.splice(index, 1);
                    }
                    // If an output is removed, we need to delete the output from the relative mix if it exists
                    if (actuatorToEdit.mix != null) {
                        await this.mixService.removeOutputFromMix(actuatorToEdit.mix, change.datum.name);
                    }
                }
                for (const change of exposeChanges.filter(addition => addition.change === DatumChangeType.NEW)) {
                    actuatorToEdit.exposes.push(change.datum);
                    if (actuatorToEdit.mix != null) {
                        await this.mixService.addOutputToMix(actuatorToEdit.mix, change.datum);
                    }
                }
            }
            if ((newName != null) && (oldName != newName)) {
                actuatorToEdit.name = newName;
                await this.groupService.actuatorRenamed(oldName, newName);
            }
            if (edit.displayName != null) {
                actuatorToEdit.displayName = edit.displayName;
            }
            if (edit.zigbeeAddress != null) {
                actuatorToEdit.zigbeeAddress = edit.zigbeeAddress;
            }
            if (edit.type != null) {
                actuatorToEdit.type = edit.type;
            }
            this.saveData();
        } else {
            throw new ConflictException();
        }
    }
    
    /**
     * Change the {@link Actuator#mix|`mix`} of an {@link Actuator|`Actuator`}, identified by name.
     *
     * @param {string} actuatorName - The name identifying the {@link Actuator|`Actuator`} to change the {@link Actuator#mix|`mix`} of.
     * @param {number | "NEW"} mixId - The {@link Mix|`Mix`} {@link Mix#id|`id`} to assign to the actuator. This value can't be `NEW`, the mix must be saved beforehand.
     * @throws {BadRequestException} - {@link BadRequestException|`BadRequestException`} if `mixId` is `NEW`.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Actuator|`Actuator`} was found with the specified name,
     *                               or if no {@link Mix|`Mix`} was found with the specified id.
     * @returns {Promise<void>}
     */
    public async setMixForActuator(actuatorName: string, mixId: number | "NEW"): Promise<void> {
        if (mixId == "NEW") {
            throw new BadRequestException("Cannot assign a new mix directly");
        }
        const actuator = await this.getActuatorByName(actuatorName);
        if (actuator == null) {
            throw new NotFoundException(`Cannot find actuator "${actuatorName}"`);
        } else {
            if (await this.mixService.getMixById(mixId) == null) {
                throw new NotFoundException(`Cannot find mix with id ${mixId}`);
            }
        }
        actuator.mix = mixId;
        this.saveData();
    }
    
    /**
     * Remove the {@link Actuator#mix|`mix`} linked to an {@link Actuator|`Actuator`} identified by name, setting it to null.
     *
     * @param {string} name - The name identifying the {@link Actuator|`Actuator`} to remove the {@link Actuator#mix|`mix`} from.
     * @returns {Promise<void>}
     */
    public async removeMixFromActuator(name: string): Promise<void> {
        const actuator = await this.getActuatorByName(name);
        if (actuator == null) {
            throw new NotFoundException(`Cannot find actuator "${name}"`);
        }
        actuator.mix = null;
        this.saveData();
    }
    
    
}

/**
 * The persistent data structure used by {@link ActuatorService|`ActuatorService`}
 * for persisting data about {@link Actuator|`Actuator`s}.
 */
export class ActuatorData {
    
    /**
     * All the actuators in the system.
     */
    public actuators: Actuator[];
    
    /**
     * Creates an instance of the class from the saved serialized {@link ActuatorDataJSON|`ActuatorDataJSON`}.
     *
     * @param {ActuatorDataJSON} actuatorDataJSON - The saved serialized {@link ActuatorDataJSON|`ActuatorDataJSON`} to use for populating the new instance.
     */
    constructor(actuatorDataJSON?: ActuatorDataJSON) {
        if (actuatorDataJSON) {
            this.actuators = actuatorDataJSON.actuators.map((actuatorJSON: ActuatorJSON) => Actuator.fromJSON(actuatorJSON));
        } else {
            this.actuators = [];
        }
    }
    
    /**
     * Converts the actuator data instance into its JSON representation.
     *
     * @returns {ActuatorDataJSON} The JSON representation of `this`.
     */
    public toJSON(): ActuatorDataJSON {
        return {
            actuators: this.actuators.map((actuator: Actuator) => actuator.toJSON())
        };
    }
    
}

/**
 * The serialization of the class {@link ActuatorData|`ActuatorData`}.
 */
export interface ActuatorDataJSON {
    
    /**
     * Serialization of the property {@link ActuatorData#actuators|`actuators`}.
     */
    actuators: ActuatorJSON[];
}
