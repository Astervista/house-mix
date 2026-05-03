/**
 * This module contains the {@link SensorService|`SensorService`} class, handling the business logic about {@link Sensor|`Sensor`s}.
 *
 * @module
 */
import {BadRequestException, ConflictException, forwardRef, Inject, Injectable, NotFoundException} from "@nestjs/common";
import {FileService} from "../../helpers/file/file.service";
import {MixService} from "../../mixing/mix/mix.service";
import {Sensor, SensorJSON} from "@common/devices/sensor/sensor";
import {GroupService} from "../group/group.service";
import {SensorEditChanges} from "@common/devices/sensor/rest-classes";
import {Datum, DatumChangeType, DatumOrigin} from "@common/mixing/mix/datum";
import {EntityType} from "@common/devices/constants";
import {PersistentDataService} from "../../helpers/file/persistent-data-service";
import {GetDevicesOptions, LockedExposes} from "@common/devices/rest-classes";
import {MixPositionInfo} from "@common/mixing/mix/rest-classes";
import {EngineService} from "../../engine/engine.service";

// noinspection ES6UnusedImports
import type {Group} from '@common/devices/group/group';
// noinspection ES6UnusedImports
import type {Mix} from '@common/mixing/mix/mix';

/**
 * The path of the file where to save the data about {@link Sensor|`Sensor`s}.
 */
const SAVE_FILE = "devices/sensor.json";

/**
 * This service handles the business logic about {@link Sensor|`Sensor`s}.
 */
@Injectable()
export class SensorService extends PersistentDataService<SensorData, SensorDataJSON> {
    
    /**
     * Creates an instance of the class. Do not call this constructor directly, it's handled by dependency injection.
     *
     * @param {FileService} fileService - The service handling persistent storage. Instantiated by dependency injection.
     * @param {GroupService} groupService - The service handling {@link Group|`Group`} business logic. Instantiated by dependency injection.
     * @param {MixService} mixService - The service handling {@link Mix|`Mix`} business logic. Instantiated by dependency injection.
     * @param {EngineService} engineService - The service running the main cycle elaboration. Instantiated by dependency injection.
     */
    constructor(
        fileService: FileService,
        @Inject(forwardRef(() => GroupService))
        private groupService: GroupService,
        @Inject(forwardRef(() => MixService))
        private mixService: MixService,
        @Inject(forwardRef(() => EngineService))
        private engineService: EngineService
    ) {
        super(fileService, SAVE_FILE, SensorData);
    }
    
    /**
     * Get all {@link Sensor|`Sensor`s} in the system, optionally filtered by {@link Mix|`Mix`}.
     *
     * @param {GetDevicesOptions} options - The options to filter the results.
     * @returns {Promise<Sensor[]>} An array containing the resulting {@link Sensor|`Sensor`s}.
     * @throws {BadRequestException} - {@link BadRequestException|`BadRequestException`} if both {@link GetDevicesOptions#mix|`mix`} and {@link GetDevicesOptions#anyMixed|`anyMixed`} are
     *     specified at the same time.
     */
    public async getAllSensors(options: GetDevicesOptions = {}): Promise<Sensor[]> {
        if (options.anyMixed != undefined && options.anyMixed) {
            if (options.mix !== undefined) {
                throw new BadRequestException("Either set anyMixed to false/undefined, of do not specify the mix");
            }
        }
        return (await this.data)
            .sensors
            .filter(
                sensor => {
                    if (options.anyMixed === true) {
                        return sensor.mix != null;
                    } else {
                        if (options.mix !== undefined) {
                            if (sensor.mix !== options.mix) {
                                return false;
                            }
                        }
                        return true;
                    }
                }
            );
    }
    
    /**
     * Get a {@link Sensor|`Sensor`} with a specific {@link Sensor#name|`name`}.
     *
     * @param {string} name - The {@link Sensor#name|`name`} of the sensor to retrieve.
     * @returns {Promise<Sensor | null>} - The {@link Sensor|`Sensor`} or null if not found.
     */
    public async getSensorByName(name: string): Promise<Sensor | null> {
        return (await this.data).sensors.find(a => a.name === name) ?? null;
    }
    
    /**
     * Get multiple {@link Sensor|`Sensor`s} given a list of {@link Sensor#name|`name`s}.
     *
     * @param {string[]} names - The list of names for which to retrieve the {@link Sensor|`Sensor`s}.
     * @returns {Promise<Sensor[]>} An array containing the resulting {@link Sensor|`Sensor`s}.
     *                              The order is not ensured to be the same as the names, neither the length,
     *                              in case some names don't match with any {@link Sensor|`Sensor`}.
     */
    public async getSensorsByNames(names: string[]): Promise<Sensor[]> {
        return (await this.data).sensors.filter(a => names.includes(a.name));
    }
    
    /**
     * Creates a new device of type {@link Sensor|`Sensor`} in the system.
     *
     * @param {Sensor} sensor - The {@link Sensor|`Sensor`} to be created.
     * @param {string | null} parentName - The name of the {@link Group|`Group`} where the sensor will be placed, or null.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if there already exist a {@link Sensor|sensor} with the same {@link Sensor#name|name}.
     */
    public async createSensor(sensor: Sensor, parentName: string | null): Promise<void> {
        const data            = await this.data;
        const alreadyExisting = data.sensors.some(otherSensor => otherSensor.name === sensor.name);
        if (alreadyExisting) {
            throw new ConflictException();
        }
        if (parentName != null) {
            await this.groupService.addDevice(parentName, sensor.name, EntityType.SENSOR, false, false);
        }
        data.sensors.push(sensor);
        
        void this.engineService.updateSensors();
        this.saveData();
    }
    
    /**
     * Checks if a name corresponds to an existing {@link Sensor|`Sensor`}.
     *
     * @param {string} sensorName - The name to check.
     * @returns {Promise<boolean>} Whether there exists an {@link Sensor|`Sensor`} with the specified name.
     */
    public async sensorExists(sensorName: string): Promise<boolean> {
        return (await this.data).sensors.some(a => a.name === sensorName);
    }
    
    /**
     * Removes a {@link Sensor|`Sensor`} identified by name from the system.
     *
     * @param {string} name - The name of the {@link Sensor|`Sensor`} to remove from the system.
     * @returns {Promise<void>}
     */
    public async deleteSensor(name: string): Promise<void> {
        const data           = await this.data;
        const sensorToDelete = data.sensors.find(otherSensor => otherSensor.name === name);
        if (sensorToDelete == null) {
            throw new NotFoundException();
        }
        const toDeleteIndex = data.sensors.findIndex(otherSensor => otherSensor.name === name);
        if (toDeleteIndex !== -1) {
            data.sensors.splice(toDeleteIndex, 1);
        }
        void this.engineService.updateSensors();
        this.saveData();
    }
    
    /**
     * Edit a {@link Sensor|`Sensor`}'s properties, given its {@link Sensor#name|`name`}.
     *
     * @param {string} oldName - The {@link Sensor#name|`name`} of the sensor to edit.
     * @param {SensorEditChanges} edit - The {@link SensorEditChanges|properties} to be updated.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Sensor|`Sensor`} was found with the specified name.
     * @throws {ConflictException} - {@link ConflictException|`ConflictException`} if a new {@link Sensor#name|`name`} was specified, but a {@link Sensor|sensor} with that name already
     *     exists.
     */
    public async editSensor(oldName: string, edit: SensorEditChanges): Promise<void> {
        const data         = await this.data;
        const newName      = edit.name;
        const sensorToEdit = data.sensors.find(otherSensor => otherSensor.name === oldName);
        if (sensorToEdit == null) {
            throw new NotFoundException();
        }
        let alreadyExisting = false;
        if (oldName !== newName) {
            alreadyExisting = data.sensors.some(otherSensor => otherSensor.name === edit.name);
        }
        if (!alreadyExisting) {
            if (edit.exposes != null) {
                const exposeChanges = sensorToEdit.calculateExposesChanges(edit.exposes.map(expose => Datum.fromJSON(expose)));
                for (const change of exposeChanges.filter(deletion => deletion.change === DatumChangeType.DELETED)) {
                    // We have to check the exposes doesn't break any mix connections
                    if (await this.mixService.dependencyExists(DatumOrigin.SENSOR_DATA, sensorToEdit.name, change.datum.name)) {
                        // Cannot delete/edit dependency, it's used somewhere
                        throw new ConflictException(`Cannot delete/edit export ${change.datum.name}, it's used in a mix`);
                    }
                    if (await this.mixService.dependencyExists(DatumOrigin.SENSOR_UPDATE, sensorToEdit.name, change.datum.name)) {
                        // Cannot delete/edit dependency, it's used somewhere
                        throw new ConflictException(`Cannot delete/edit export ${change.datum.name}, it's used in a mix`);
                    }
                }
                for (const change of exposeChanges.filter(deletion => deletion.change === DatumChangeType.DELETED)) {
                    const index = sensorToEdit.exposes.findIndex(otherExpose => otherExpose.name == change.datum.name);
                    if (index != -1) {
                        sensorToEdit.exposes.splice(index, 1);
                    }
                }
                for (const change of exposeChanges.filter(addition => addition.change === DatumChangeType.NEW)) {
                    sensorToEdit.exposes.push(change.datum);
                }
            }
            let displayChanged = false;
            let nameChanged = false;
            if (edit.displayName != null) {
                displayChanged = sensorToEdit.displayName != edit.displayName;
                sensorToEdit.displayName = edit.displayName;
            }
            if ((newName != null) && (oldName != newName)) {
                sensorToEdit.name = newName;
                nameChanged = true;
                await this.groupService.sensorRenamed(oldName, newName);
            }
            if (displayChanged || nameChanged) {
                await this.mixService.sensorRenamed(oldName, sensorToEdit.name, sensorToEdit.displayName);
            }
            if (edit.zigbeeAddress != null) {
                sensorToEdit.zigbeeAddress = edit.zigbeeAddress;
            }
            if (edit.type != null) {
                sensorToEdit.type = edit.type;
            }
            void this.engineService.updateSensors();
            this.saveData();
        } else {
            throw new ConflictException();
        }
    }
    
    /**
     * Change the {@link Sensor#mix|`mix`} of a {@link Sensor|`Sensor`}, identified by name.
     *
     * @param {string} sensorName - The name identifying the {@link Sensor|`Sensor`} to change the {@link Sensor#mix|`mix`} of.
     * @param {number | "NEW"} mixId - The {@link Mix|`Mix`} {@link Mix#id|`id`} to assign to the sensor. This value can't be `NEW`, the mix must be saved beforehand.
     * @throws {BadRequestException} - {@link BadRequestException|`BadRequestException`} if `mixId` is `NEW`.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Sensor|`Sensor`} was found with the specified name,
     *                               or if no {@link Mix|`Mix`} was found with the specified id.
     * @returns {Promise<void>}
     */
    public async setMixForSensor(sensorName: string, mixId: number | "NEW"): Promise<void> {
        if (mixId == "NEW") {
            throw new BadRequestException("Cannot assign a new mix directly");
        }
        const sensor = await this.getSensorByName(sensorName);
        if (sensor == null) {
            throw new NotFoundException(`Cannot find sensor "${sensorName}"`);
        } else {
            if (await this.mixService.getMixById(mixId) == null) {
                throw new NotFoundException(`Cannot find mix with id ${mixId}`);
            }
        }
        sensor.mix = mixId;
        this.saveData();
    }
    
    /**
     * Remove the {@link Sensor#mix|`mix`} linked to a {@link Sensor|`Sensor`} identified by name, setting it to null.
     *
     * @param {string} name - The name identifying the {@link Sensor|`Sensor`} to remove the {@link Sensor#mix|`mix`} from.
     * @returns {Promise<void>}
     */
    public async removeMixFromSensor(name: string): Promise<void> {
        const sensor = await this.getSensorByName(name);
        if (sensor == null) {
            throw new NotFoundException(`Cannot find sensor "${name}"`);
        }
        sensor.mix = null;
        this.saveData();
    }
    
    /**
     * Returns information about all the exposes that cannot be removed from this {@link Sensor|`Sensor`}, because they are referenced
     * in a {@link Mix|`Mix`} downstream.
     *
     * @param {string} name - The {@link Sensor#name|`name`} of the {@link Sensor|`Sensor`}.
     * @returns {Promise<LockedExposes[]>} The information about the {@link LockedExposes|locked exposes}.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Sensor|`Sensor`} was found with the specified name.
     */
    public async getLockedExposes(name: string): Promise<LockedExposes[]> {
        const sensor = await this.getSensorByName(name);
        if (sensor == null) {
            throw new NotFoundException(`Cannot find sensor "${name}"`);
        }
        const result: LockedExposes[] = [];
        for (const exposes of sensor.exposes) {
            const depending = await this.mixService.getDependingMixes([DatumOrigin.SENSOR_DATA, DatumOrigin.SENSOR_UPDATE], sensor.name, exposes.name);
            
            if (depending.length > 0) {
                const positions: MixPositionInfo[] = [];
                for (const mix of depending) {
                    if (mix.id != "NEW") {
                        positions.push(await this.mixService.getMixPosition(mix.id));
                    }
                }
                result.push({
                                name:         exposes.name,
                                dependencies: positions
                            })
            }
        }
        return result;
    }
    
}


/**
 * The persistent data structure used by {@link SensorService|`SensorService`}
 * for persisting data about {@link Sensor|`Sensor`s}.
 */
export class SensorData {
    
    /**
     * All the sensors in the system.
     */
    public sensors: Sensor[];
    
    /**
     * Creates an instance of the class from the saved serialized {@link SensorDataJSON|`SensorDataJSON`}.
     *
     * @param {SensorDataJSON} sensorDataJSON - The saved serialized {@link SensorDataJSON|`SensorDataJSON`} to use for populating the new instance.
     */
    constructor(sensorDataJSON?: SensorDataJSON) {
        if (sensorDataJSON) {
            this.sensors = sensorDataJSON.sensors.map((sensorJSON: SensorJSON) => Sensor.fromJSON(sensorJSON));
        } else {
            this.sensors = [];
        }
    }
    
    /**
     * Converts the sensor data instance into its JSON representation.
     *
     * @returns {SensorDataJSON} The JSON representation of `this`.
     */
    public toJSON(): SensorDataJSON {
        return {
            sensors: this.sensors.map((sensor: Sensor) => sensor.toJSON())
        };
    }
    
}

/**
 * The serialization of the class {@link SensorData|`SensorData`}.
 */
export interface SensorDataJSON {
    /**
     * Serialization of the property {@link SensorData#sensors|`sensors`}.
     */
    sensors: SensorJSON[];
}
