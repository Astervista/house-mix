/**
 * This module contains the {@link EngineService|`EngineService`} class, handling the business logic of the main elaboration cycle.
 *
 * @module
 */
import { forwardRef, Inject, OnModuleInit } from '@nestjs/common';
import {MixService} from '../mixing/mix/mix.service';
import { SensorService } from '../devices/sensor/sensor.service';
import { Observable, Subscription } from 'rxjs';
import { StatusUpdate, ZigbeeService } from '../zigbee/zigbee.service';
import { ParametersService } from '../system/parameters/parameters.service';
import { TimersService } from '../system/timers/timers.service';
import { Datum, DatumOrigin, DatumType, DatumTypeColor, DatumTypeColorBase, ExportedDatum } from '@common/mixing/mix/datum';
import { EnvironmentInput, SystemOrigin } from '@common/system/constants';
import {
    Mix,
    MixCalculationError,
    MixingCalculationResult,
    mixingCalculationResultFromJSON,
    MixingCalculationResultJSON,
    mixingCalculationResultToJSON,
    MixingStorage,
    MixingStorageJSON,
    mixingStorageToJSON,
    MixNodeTimeout,
    StorageUpdate
} from '@common/mixing/mix/mix';
import { Color } from '@common/utils/color-convert';
import { Sensor } from '@common/devices/sensor/sensor';
import { SystemParameter } from '@common/system/parameter/system-parameter';
import { GroupService } from '../devices/group/group.service';
import { Group } from '@common/devices/group/group';
import { MixingGraph, MixingGraphCenter } from '@common/mixing/mixing-graph';
import { PersistentDataService } from '../helpers/file/persistent-data-service';
import { FileService } from '../helpers/file/file.service';
import { ActuatorService } from '../devices/actuator/actuator.service';
import * as Schedule from 'node-schedule';
import { DeviceMonitorDevice } from '@common/system/device-monitor/device-monitor-device';
import { DeviceMonitorService } from '../system/device-monitor/device-monitor.service';
import { Actuator } from '@common/devices/actuator/actuator';
// noinspection ES6UnusedImports
import type { ElaborationNodeTimeout } from '@common/mixing/mix/elaboration-node';
import { ElaborationNodeSunEvents } from '@common/mixing/mix/elaboration-node';

// noinspection ES6UnusedImports
import type { SystemTimer } from '@common/system/timer/system-timer';

/**
 * The path of the file where to save the data about the engine..
 */
const SAVE_FILE = "engine/engine.json";

/**
 * The interval (in ms) between each time the {@link EngineService|`EngineService`} checks if a recalculation is needed.
 */
export
/**
 * The interval (in ms) between each time the {@link EngineService|`EngineService`} checks if a recalculation is needed.
 */
const MAIN_LOOP_INTERVAL = 1000;

/**
 * This service contains the engine running the main elaboration cycle. Every time some change requires a calculation
 * to adeguate the state of the system, this service runs through the mixes and recalculates all the outputs to send to
 * actuators.
 *
 * When any tool needs to request a new calculation in the system, {@link EngineService#requestRecalculation| `requestRecalculation()`}
 * should be called. The method will schedule a recalculation as soon as possible and recalculate the whole system.
 *
 * The engine hooks to {@link ZigbeeService|`ZigbeeService`}'s events to listen for actuator changes, and automatically
 * requests a new cycle calculation to be performed.
 */
export class EngineService extends PersistentDataService<EngineServiceData, EngineServiceDataJSON> implements OnModuleInit {
    
    /**
     * Whether something has notified the service of the need to trigger a
     * calculation, and the calculation has yet to be performed.
     */
    private invalidated: boolean = false;
    
    /**
     * A map of observables that monitor the values of the sensors for changes.
     * Keys are {@link Sensor#name|`the `Sensor`s' unique names`}.
     */
    private sensorObservables: Map<string, Observable<unknown>> = new Map<string, Observable<unknown>>;
    
    /**
     * The map of subscriptions relative to the sensors observed by
     * {@link EngineService#sensorObservables|`EngineService.sensorObservables`}.
     *
     * Keys are {@link Sensor#name|`the `Sensor`s' unique names`}.
     */
    private sensorSubscriptions: Map<string, Subscription> = new Map<string, Subscription>;
    
    /**
     * A map containing the cached values of the sensors, saved when a change is detected
     * and used during the main calculation. Keys are {@link Sensor#name|`the `Sensor`s' unique names`}.
     *
     * @type {Map<string, unknown>}
     * @private
     */
    private sensorValues: Map<string, unknown> = new Map<string, unknown>;
    
    /**
     * A map containing the handles for timeouts required by
     * {@link ElaborationNodeTimeout|`ElaborationNodeTimeout`}, mapped by the node creation timestamp.
     */
    private readonly timeoutHandles: Map<number, NodeJS.Timeout> = new Map<number, NodeJS.Timeout>();
    
    /**
     * Creates an instance of the class. Do not call this constructor directly, it's handled by dependency injection.
     *
     * @param {MixService} mixService - The service handling {@link Mix|`Mix`} business logic. Instantiated by dependency injection.
     * @param {SensorService} sensorService - The service handling {@link Sensor|`Sensor`} business logic. Instantiated by dependency injection.
     * @param {GroupService} groupService - The service handling {@link Group|`Group`} business logic. Instantiated by dependency injection.
     * @param {ActuatorService} actuatorService - The service handling {@link Actuator|`Actuator`} business logic. Instantiated by dependency injection.
     * @param {ParametersService} parametersService - The service handling {@link SystemParameter|`SystemParameter`}. Instantiated by dependency injection.
     * @param {TimersService} timersService - The service handling {@link SystemTimer|`SystemTimer`}. Instantiated by dependency injection.
     * @param {DeviceMonitorService} deviceMonitorService - The service monitoring device connectivity. Instantiated by dependency injection.
     * @param {ZigbeeService} zigbeeService - The service handling Zigbee communication. Instantiated by dependency injection.
     * @param {FileService} fileService - The service handling persistent storage. Instantiated by dependency injection.
     */
    constructor(
        @Inject(forwardRef(() => MixService))
        private mixService: MixService,
        @Inject(forwardRef(() => SensorService))
        private sensorService: SensorService,
        @Inject(forwardRef(() => GroupService))
        private groupService: GroupService,
        @Inject(forwardRef(() => ActuatorService))
        private actuatorService: ActuatorService,
        @Inject(forwardRef(() => ParametersService))
        private parametersService: ParametersService,
        @Inject(forwardRef(() => TimersService))
        private timersService: TimersService,
        @Inject(forwardRef(() => DeviceMonitorService))
        private deviceMonitorService: DeviceMonitorService,
        private zigbeeService: ZigbeeService,
        fileService: FileService
    ) {
        super(fileService, SAVE_FILE, EngineServiceData);
        this.doAfterLoad(async (data): Promise<void> => {
            // Fetch the location from the ip if not yet available.
            if (data.location == null) {
                try {
                    // Get the public ip
                    const ipRes = await fetch("https://api.ipify.org?format=json");
                    const {ip}  = await ipRes.json() as { ip?: string };
                    
                    // Get the location form the public ip
                    const geoRes = await fetch(`http://ip-api.com/json/${ip}`);
                    const geo    = await geoRes.json() as { lat?: number, lon?: number, status?: string };
                    if (geo.status == "success") {
                        data.location = {latitude: geo.lat ?? 0, longitude: geo.lon ?? 0};
                        this.saveData();
                    } else {
                        return;
                    }
                } catch {
                    return;
                }
            }
            // Pass the found coordinates to the node that needs them
            ElaborationNodeSunEvents.coordinates = data.location;
            
            // Load and check the saved pending timeouts from the last time the system was loaded.
            const now = Date.now();
            data.timeouts.forEach(timeout => {
                if (timeout.expiration > now) {
                    // If the timeout is still valid, reschedule it
                    const newHandle = setTimeout(
                        () => {
                            this.invalidated = true;
                            if (this.timeoutHandles.has(timeout.nodeCreationTimestamp)) {
                                this.timeoutHandles.delete(timeout.nodeCreationTimestamp);
                            }
                        },
                        timeout.expiration - now
                    );
                    this.timeoutHandles.set(timeout.nodeCreationTimestamp, newHandle);
                }
            });
        });
    }
    
    /**
     * @inheritDoc
     */
    public onModuleInit(): void {
        this.updateSensors()
            .then(() => this.updateTimers())
            .then(() => {
                setInterval(this.loop.bind(this) as (() => void), MAIN_LOOP_INTERVAL);
            })
            .catch((error: unknown) => {
                console.error(error);
            });
    }
    
    /**
     * The main loop. This function gets run every {@link MAIN_LOOP_INTERVAL|`MAIN_LOOP_INTERVAL`} to check if
     * the last calculation is {@link EngineService#invalidated|invalidated}, and possibly triggers a recalculation of the system.
     */
    private loop(): void {
        if (this.invalidated) {
            this.invalidated = false;
            this.tick();
        }
    }
    
    /**
     * A list of promises, each one waiting for the previous, that are queued for execution.
     * Each one will perform an elaboration of the system.
     */
    private readonly elaborationQueue: Promise<void>[] = [];
    
    /**
     * This function gets called every time the cycle ticks (a single cycle execution).
     * This function schedules a single elaboration to be calculated as soon as the last
     * tick in the {@link EngineService#elaborationQueue|`elaborationQueue`} terminates execution.
     *
     * @param {SensorDataChange} sensorDataChange - All the sensor that changed value since the last time the system ticked.
     * @param {TimerDataChange} timerDataChange - All the timers that elapsed since the last time the system ticked.
     * @param {DeviceMonitorDevice[]} updateDeviceStatuses - All the monitored device that changed status since the last time the system ticked.
     */
    private tick(sensorDataChange?: SensorDataChange, timerDataChange?: TimerDataChange, updateDeviceStatuses: DeviceMonitorDevice[] = []): void {
        let promise: Promise<void>;
        const lastElement = this.elaborationQueue[this.elaborationQueue.length - 1];
        if (lastElement == undefined) {
            promise = this.asyncTick(sensorDataChange, timerDataChange, updateDeviceStatuses);
        } else {
            promise = lastElement.then(() => this.asyncTick(sensorDataChange));
        }
        // Attach a new elaboration after the last one finishes.
        this
            .elaborationQueue
            .push(promise);
        void promise
            .catch((error: unknown) => {
                if (!(error instanceof TickError)) {
                    error = new TickError(TickErrorType.UNKNOWN_ELABORATION_ERROR, {originalError: error});
                }
                if (error instanceof TickError) {
                    console.log("An error occurred while recalculating values: " + error.message, error.data);
                }
                
            })
            .then(() => {
                // When terminated, remove the promise from the queue.
                const index = this.elaborationQueue.indexOf(promise);
                if (index != -1) {
                    void this.elaborationQueue.splice(index, 1);
                }
            });
    }
    
    /**
     * This function is the core of the engine, it gathers all the inputs from the system, walks the mix tree,
     * gathers all the outputs of the mixes and eleborates each mix from the gathered data. It also gets the actuator
     * mixes' output and sends the commands to the {@link ZigbeeService|`ZigbeeService`}.
     *
     * @param {SensorDataChange} sensorDataChange - All the sensor that changed value since the last time the system ticked.
     * @param {TimerDataChange} timerDataChange - All the timers that elapsed since the last time the system ticked.
     * @param {DeviceMonitorDevice[]} updateDeviceStatuses - All the monitored device that changed status since the last time the system ticked.
     */
    private async asyncTick(sensorDataChange?: SensorDataChange, timerDataChange?: TimerDataChange, updateDeviceStatuses: DeviceMonitorDevice[] = []): Promise<void> {
        
        // Set up all the data structures containing the data needed for the elaboration, and gather all the data already available.
        const data: EngineServiceData                          = await this.data;
        const storage: MixingStorage                           = data.storage;
        const mixingGraph: MixingGraph                         = await this.mixService.getGraph();
        const {sensorGroupLevels, actuatorGroupLevels}         = mixingGraph.generateGroupLevels();
        const mixes: Mix[]                                     = await this.mixService.getAllMixes();
        const parameters: SystemParameter[]                    = await this.parametersService.getAllParameters();
        const sensorStatusCache: ReadonlyMap<string, unknown>  = this.zigbeeService.deviceStatusCache;
        const sensors: Sensor[]                                = await this.sensorService.getAllSensors();
        const groups: Group[]                                  = await this.groupService.getAllGroups();
        const actuators: Actuator[]                            = await this.actuatorService.getAllActuators();
        const mixResults: Map<number, MixingCalculationResult> = new Map<number, MixingCalculationResult>();
        const orderedStorageUpdate: StorageUpdate[]            = [];
        const now                                              = new Date();
        const newTimeouts: MixNodeTimeout[]                    = [];
        const pastTimeouts: number[]                           = data.timeouts
                                                                    .filter(timeout => timeout.expiration <= now.getTime())
                                                                    .map(timeout => timeout.nodeCreationTimestamp);
        for (const mixingGraphSensor of mixingGraph.sensors) {
            const mix = mixes.find(otherMix => otherMix.id == mixingGraphSensor.mix);
            if (mix == null) {
                throw new TickError(TickErrorType.MISSING_MIX, {mixId: mixingGraphSensor.mix});
            }
            const inputs: Map<string, unknown> = new Map<string, unknown>();
            for (const imp of mix.imports) {
                switch (imp.origin) {
                    case DatumOrigin.SENSOR_DATA: {
                        inputs.set(imp.uniqueName, this.getSensorValueForImport(imp, sensors, sensorStatusCache, mix));
                        break;
                    }
                    case DatumOrigin.SENSOR_UPDATE: {
                        inputs.set(imp.uniqueName, this.getSensorUpdateForImport(imp, sensors, sensorDataChange, mix));
                        break;
                    }
                    case DatumOrigin.SYSTEM: {
                        inputs.set(imp.uniqueName, this.getSystemValueForImport(imp, parameters, mix, timerDataChange, updateDeviceStatuses, now));
                        break;
                    }
                    case DatumOrigin.GROUP:
                    case DatumOrigin.SENSOR:
                    case DatumOrigin.CENTER:
                        throw new TickError(TickErrorType.UNAVAILABLE_IMPORT, {mixId: mix.id as number, import: imp});
                }
            }
            try {
                const mixResult = mix.calculate(inputs, storage, pastTimeouts);
                orderedStorageUpdate.push(...mixResult.storageUpdate);
                newTimeouts.push(...mixResult.newTimeouts);
                mixResults.set(mix.id as number, mixResult);
            } catch (e) {
                if (e instanceof MixCalculationError) {
                    throw new TickError(TickErrorType.CALCULATION_ERROR, {mixId: mix.id as number, calculationError: e});
                } else {
                    throw new TickError(TickErrorType.UNKNOWN_ELABORATION_ERROR, {mixId: mix.id as number, originalError: e});
                }
            }
        }
        for (const level of sensorGroupLevels) {
            for (const mixingGraphSensorGroup of level) {
                const mix = mixes.find(otherMix => otherMix.id == mixingGraphSensorGroup.mix);
                if (mix == null) {
                    throw new TickError(TickErrorType.MISSING_MIX, {mixId: mixingGraphSensorGroup.mix});
                }
                const inputs: Map<string, unknown> = new Map<string, unknown>();
                for (const imp of mix.imports) {
                    switch (imp.origin) {
                        case DatumOrigin.SENSOR_DATA: {
                            inputs.set(imp.uniqueName, this.getSensorValueForImport(imp, sensors, sensorStatusCache, mix));
                            break;
                        }
                        case DatumOrigin.SENSOR_UPDATE: {
                            inputs.set(imp.uniqueName, this.getSensorUpdateForImport(imp, sensors, sensorDataChange, mix));
                            break;
                        }
                        case DatumOrigin.SYSTEM: {
                            inputs.set(imp.uniqueName, this.getSystemValueForImport(imp, parameters, mix, timerDataChange, updateDeviceStatuses, now));
                            break;
                        }
                        case DatumOrigin.SENSOR: {
                            inputs.set(imp.uniqueName, this.getSensorExportForImport(imp, sensors, mixResults, mix));
                            break;
                        }
                        case DatumOrigin.GROUP: {
                            inputs.set(imp.uniqueName, this.getGroupExportForImport(imp, true, groups, mixResults, mix));
                            break;
                        }
                        case DatumOrigin.CENTER:
                            throw new TickError(TickErrorType.UNAVAILABLE_IMPORT, {mixId: mix.id as number, import: imp});
                    }
                }
                try {
                    const mixResult = mix.calculate(inputs, storage, pastTimeouts);
                    orderedStorageUpdate.push(...mixResult.storageUpdate);
                    newTimeouts.push(...mixResult.newTimeouts);
                    mixResults.set(mix.id as number, mixResult);
                } catch (e) {
                    if (e instanceof MixCalculationError) {
                        throw new TickError(TickErrorType.CALCULATION_ERROR, {mixId: mix.id as number, calculationError: e});
                    } else {
                        throw new TickError(TickErrorType.UNKNOWN_ELABORATION_ERROR, {mixId: mix.id as number, originalError: e});
                    }
                }
            }
        }
        for (const mixingGraphCenter of mixingGraph.centers) {
            const mix = mixes.find(otherMix => otherMix.id == mixingGraphCenter.mix);
            if (mix == null) {
                throw new TickError(TickErrorType.MISSING_MIX, {mixId: mixingGraphCenter.mix});
            }
            const inputs: Map<string, unknown> = new Map<string, unknown>();
            for (const imp of mix.imports) {
                switch (imp.origin) {
                    case DatumOrigin.SENSOR_DATA: {
                        inputs.set(imp.uniqueName, this.getSensorValueForImport(imp, sensors, sensorStatusCache, mix));
                        break;
                    }
                    case DatumOrigin.SENSOR_UPDATE: {
                        inputs.set(imp.uniqueName, this.getSensorUpdateForImport(imp, sensors, sensorDataChange, mix));
                        break;
                    }
                    case DatumOrigin.SYSTEM: {
                        inputs.set(imp.uniqueName, this.getSystemValueForImport(imp, parameters, mix, timerDataChange, updateDeviceStatuses, now));
                        break;
                    }
                    case DatumOrigin.SENSOR: {
                        inputs.set(imp.uniqueName, this.getSensorExportForImport(imp, sensors, mixResults, mix));
                        break;
                    }
                    case DatumOrigin.GROUP: {
                        inputs.set(imp.uniqueName, this.getGroupExportForImport(imp, true, groups, mixResults, mix));
                        break;
                    }
                    case DatumOrigin.CENTER:
                        throw new TickError(TickErrorType.UNAVAILABLE_IMPORT, {mixId: mix.id as number, import: imp});
                }
            }
            try {
                const mixResult = mix.calculate(inputs, storage, pastTimeouts);
                orderedStorageUpdate.push(...mixResult.storageUpdate);
                newTimeouts.push(...mixResult.newTimeouts);
                mixResults.set(mix.id as number, mixResult);
            } catch (e) {
                if (e instanceof MixCalculationError) {
                    throw new TickError(TickErrorType.CALCULATION_ERROR, {mixId: mix.id as number, calculationError: e});
                } else {
                    throw new TickError(TickErrorType.UNKNOWN_ELABORATION_ERROR, {mixId: mix.id as number, originalError: e});
                }
            }
        }
        for (const level of actuatorGroupLevels) {
            for (const mixingGraphSensorGroup of level) {
                const mix = mixes.find(otherMix => otherMix.id == mixingGraphSensorGroup.mix);
                if (mix == null) {
                    throw new TickError(TickErrorType.MISSING_MIX, {mixId: mixingGraphSensorGroup.mix});
                }
                const inputs: Map<string, unknown> = new Map<string, unknown>();
                for (const imp of mix.imports) {
                    switch (imp.origin) {
                        case DatumOrigin.SYSTEM: {
                            inputs.set(imp.uniqueName, this.getSystemValueForImport(imp, parameters, mix, timerDataChange, updateDeviceStatuses, now));
                            break;
                        }
                        case DatumOrigin.GROUP: {
                            inputs.set(imp.uniqueName, this.getGroupExportForImport(imp, false, groups, mixResults, mix));
                            break;
                        }
                        case DatumOrigin.CENTER: {
                            inputs.set(imp.uniqueName, this.getCenterExportForImport(imp, mixingGraph.centers, mixResults, mix));
                            break;
                        }
                        case DatumOrigin.SENSOR:
                        case DatumOrigin.SENSOR_DATA:
                        case DatumOrigin.SENSOR_UPDATE:
                            throw new TickError(TickErrorType.UNAVAILABLE_IMPORT, {mixId: mix.id as number, import: imp});
                    }
                }
                try {
                    const mixResult = mix.calculate(inputs, storage, pastTimeouts);
                    orderedStorageUpdate.push(...mixResult.storageUpdate);
                    newTimeouts.push(...mixResult.newTimeouts);
                    mixResults.set(mix.id as number, mixResult);
                } catch (e) {
                    if (e instanceof MixCalculationError) {
                        throw new TickError(TickErrorType.CALCULATION_ERROR, {mixId: mix.id as number, calculationError: e});
                    } else {
                        throw new TickError(TickErrorType.UNKNOWN_ELABORATION_ERROR, {mixId: mix.id as number, originalError: e});
                    }
                }
            }
        }
        const actuatorResults: Map<string, MixingCalculationResult> = new Map<string, MixingCalculationResult>();
        for (const mixingGraphActuator of mixingGraph.actuators) {
            const mix = mixes.find(otherMix => otherMix.id == mixingGraphActuator.mix);
            if (mix == null) {
                throw new TickError(TickErrorType.MISSING_MIX, {mixId: mixingGraphActuator.mix});
            }
            const inputs: Map<string, unknown> = new Map<string, unknown>();
            for (const imp of mix.imports) {
                switch (imp.origin) {
                    case DatumOrigin.SYSTEM: {
                        inputs.set(imp.uniqueName, this.getSystemValueForImport(imp, parameters, mix, timerDataChange, updateDeviceStatuses, now));
                        break;
                    }
                    case DatumOrigin.GROUP: {
                        inputs.set(imp.uniqueName, this.getGroupExportForImport(imp, false, groups, mixResults, mix));
                        break;
                    }
                    case DatumOrigin.CENTER: {
                        inputs.set(imp.uniqueName, this.getCenterExportForImport(imp, mixingGraph.centers, mixResults, mix));
                        break;
                    }
                    case DatumOrigin.SENSOR:
                    case DatumOrigin.SENSOR_DATA:
                    case DatumOrigin.SENSOR_UPDATE:
                        throw new TickError(TickErrorType.UNAVAILABLE_IMPORT, {mixId: mix.id as number, import: imp});
                }
            }
            try {
                const actuatorResult = mix.calculate(inputs, storage, pastTimeouts);
                orderedStorageUpdate.push(...actuatorResult.storageUpdate);
                newTimeouts.push(...actuatorResult.newTimeouts);
                actuatorResults.set(mixingGraphActuator.name, actuatorResult);
            } catch (e) {
                if (e instanceof MixCalculationError) {
                    throw new TickError(TickErrorType.CALCULATION_ERROR, {mixId: mix.id as number, calculationError: e});
                } else {
                    throw new TickError(TickErrorType.UNKNOWN_ELABORATION_ERROR, {mixId: mix.id as number, originalError: e});
                }
            }
        }
        
        for (const update of orderedStorageUpdate) {
            storage[update.datumType].set(update.name, update.value);
        }
        
        for (const timeout of newTimeouts) {
            data.timeouts.push({
                                   nodeCreationTimestamp: timeout.nodeCreationTimestamp,
                                   expiration:            timeout.expiration + now.getTime()
                               });
            if (this.timeoutHandles.has(timeout.nodeCreationTimestamp)) {
                clearTimeout(this.timeoutHandles.get(timeout.nodeCreationTimestamp));
            }
            const newHandle = setTimeout(
                () => {
                    this.invalidated = true;
                    if (this.timeoutHandles.has(timeout.nodeCreationTimestamp)) {
                        this.timeoutHandles.delete(timeout.nodeCreationTimestamp);
                    }
                },
                timeout.expiration
            );
            this.timeoutHandles.set(timeout.nodeCreationTimestamp, newHandle);
        }
        data.timeouts = data.timeouts.filter(timeout => timeout.expiration > now.getTime());
        
        for (const [actuatorName, actuatorChange] of actuatorResults.entries()) {
            const actuator = actuators.find(otherActuator => otherActuator.name == actuatorName);
            if (actuator == null) {
                throw new TickError(TickErrorType.UNAVAILABLE_ACTUATOR, {actuatorName});
            }
            const update: Record<string, unknown> = {};
            for (const [outputName, value] of actuatorChange.outputs.entries()) {
                const output = actuator.exposes.find(expose => expose.name == outputName);
                if (output == null) {
                    throw new TickError(TickErrorType.UNKNOWN_EXPOSE, {actuatorName, expose: outputName});
                }
                if (!Datum.checkValue(value, output.type, output.nullable)) {
                    throw new TickError(TickErrorType.WRONG_EXPOSED_VALUE, {actuatorName, expose: outputName, value});
                }
                if (output.type == DatumType.COLOR) {
                    const color = value as DatumTypeColor;
                    let setColor: unknown;
                    if (color.base == DatumTypeColorBase.RGB) {
                        const conversion = Color.rgb(color.r ?? 255, color.g ?? 255, color.b ?? 255).toHSV();
                        setColor         = {
                            h: conversion.h * 360,
                            s: conversion.s * 100
                        };
                    } else {
                        setColor = {
                            x: color.x ?? 0.33,
                            y: color.y ?? 0.33
                        };
                    }
                    update[outputName] = setColor;
                } else if (output.type == DatumType.COLOR_TEMP) {
                    update[outputName] = Math.round(1000000 / (value as number));
                } else {
                    update[outputName] = value;
                }
            }
            this.zigbeeService.setStatus(actuator.zigbeeAddress, actuator.name, update);
        }
        
        data.executions.push(EngineExecution.create(new Date(), mixResults, storage));
        if (data.executions.length > 50) {
            data.executions.shift();
        }
        this.saveData();
    }
    
    /**
     * Get the value of an {@link Sensor#exposes|exported property} coming from a {@link Sensor|`Sensor`} required by a {@link Mix|`Mix`}'s {@link Mix#imports|import} from the system.
     *
     * @param {ExportedDatum} imp - The {@link Mix|`Mix`}'s {@link Mix#imports|import} that
     *                              contains information about the sensor to retrieve the value from.
     * @param {Sensor[]} sensors - The list of {@link Sensor|`Sensor`s} available in the system.
     * @param {ReadonlyMap<string, unknown>} sensorStatusCache - The map containing the latest cached data coming from the {@link Sensor|`Sensor`s} through zigbee2mqtt.
     * @param {Mix} mix - The mix that requires the sensor data. Used for error handling.
     * @returns {unknown} The value of the required exported property.
     * @throws {TickError} - {@link TickError|`TickError`} if the sensor's data is not available.
     */
    private getSensorValueForImport(
        imp: ExportedDatum,
        sensors: Sensor[],
        sensorStatusCache: ReadonlyMap<string, unknown>,
        mix: Mix
    ): unknown {
        const sensor = sensors.find(otherSensor => otherSensor.name == imp.originName);
        if (sensor == null) {
            throw new TickError(TickErrorType.UNAVAILABLE_SENSOR, {mixId: mix.id as number, sensorName: imp.originName});
        }
        const sensorUpdate = sensorStatusCache.get(sensor.zigbeeAddress);
        if (sensorUpdate == null) {
            return null;
        } else {
            let value: unknown = sensorUpdate[imp.name] ?? null;
            if (value != null && imp.type == DatumType.COLOR) {
                const correctedValue = value as { x?: unknown, y?: unknown, r?: unknown, g?: unknown, b?: unknown, h?: unknown, s?: unknown };
                if ((typeof correctedValue.x == "number")
                    && (typeof correctedValue.y == "number")) {
                    value = new DatumTypeColor(
                        DatumTypeColorBase.XY,
                        correctedValue.x,
                        correctedValue.y
                    );
                } else if ((typeof correctedValue.r == "number")
                           && (typeof correctedValue.g == "number")
                           && (typeof correctedValue.b == "number")) {
                    value = new DatumTypeColor(
                        DatumTypeColorBase.RGB,
                        correctedValue.r,
                        correctedValue.g,
                        correctedValue.b
                    );
                } else if ((typeof correctedValue.h == "number")
                           && (typeof correctedValue.s == "number")) {
                    const conversion = Color.hsv(correctedValue.h / 360, correctedValue.s / 100, 1);
                    value            = new DatumTypeColor(
                        DatumTypeColorBase.RGB,
                        Math.round(conversion.r * 255),
                        Math.round(conversion.g * 255),
                        Math.round(conversion.b * 255)
                    );
                } else {
                    value = null;
                }
            } else if (value != null && imp.type == DatumType.COLOR_TEMP) {
                value = 1000000 / (value as number);
            }
            return value;
        }
    }
    
    /**
     * Get whether the value {@link Sensor#exposes|exported property} coming from a {@link Sensor|`Sensor`}
     * required by a {@link Mix|`Mix`}'s {@link Mix#imports|import} has changed since the last time the system ticked.
     *
     * @param {ExportedDatum} imp - The {@link Mix|`Mix`}'s {@link Mix#imports|import} that
     *                              contains information about the sensor to retrieve the value from.
     * @param {Sensor[]} sensors - The list of {@link Sensor|`Sensor`s} available in the system.
     * @param {SensorDataChange | undefined} sensorDataChange - The map containing the information about the sensors that changed since the last time the system ticked.
     * @param {Mix} mix - The mix that requires the sensor data. Used for error handling.
     * @returns {unknown} The value of the required exported property.
     * @throws {TickError} - {@link TickError|`TickError`} if the sensor's data is not available.
     */
    private getSensorUpdateForImport(
        imp: ExportedDatum,
        sensors: Sensor[],
        sensorDataChange: SensorDataChange | undefined,
        mix: Mix
    ): boolean {
        const sensor = sensors.find(otherSensor => otherSensor.name == imp.originName);
        if (sensor == null) {
            throw new TickError(TickErrorType.UNAVAILABLE_SENSOR, {mixId: mix.id as number, sensorName: imp.originName, import: imp});
        }
        if (sensorDataChange == null) {
            return false;
        } else {
            if (sensor.zigbeeAddress != sensorDataChange.zigbeeId) {
                return false;
            } else {
                return sensorDataChange.valueChange.old != null;
            }
        }
    }
    
    /**
     * Get the value required by a {@link Mix|`Mix`}'s {@link Mix#imports|import} when the {@link ExportedDatum#origin|`origin`} is {@link DatumOrigin.SYSTEM|`DatumOrigin.SYSTEM`}.
     *
     * @param {ExportedDatum} imp - The {@link Mix|`Mix`}'s {@link Mix#imports|import} that
     *                              contains information about the sensor to retrieve the value from.
     * @param {SystemParameter[]} parameters - The list of system parameters available.
     * @param {Mix} mix - The mix that requires the sensor data. Used for error handling.
     * @param {TimerDataChange} [timerChanged] - Information about the timer that triggered the tick, if any.
     * @param {DeviceMonitorDevice[]} [updateDeviceStatuses] - The list of monitored devices on the network that changed status.
     * @param {Date} [consistentDate] - A date object to use for all environment calculations in the current tick, to avoid inconsistencies in the same cycle tick.
     * @returns {unknown} The value for the required import.
     * @throws {TickError} - {@link TickError|`TickError`} if a requested parameter is not available.
     */
    private getSystemValueForImport(
        imp: ExportedDatum,
        parameters: SystemParameter[],
        mix: Mix,
        timerChanged?: TimerDataChange,
        updateDeviceStatuses: DeviceMonitorDevice[] = [],
        consistentDate: Date                        = new Date()): unknown {
        const originType = imp.originName as SystemOrigin;
        switch (originType) {
            case SystemOrigin.PARAMETER: {
                const parameter = parameters.find(otherParameter => otherParameter.name == imp.name);
                if (parameter == null) {
                    throw new TickError(TickErrorType.MISSING_PARAMETER, {mixId: mix.id as number, parameterName: imp.name, import: imp});
                }
                return parameter.value;
            }
            case SystemOrigin.TIMER: {
                return imp.name == timerChanged?.name;
            }
            case SystemOrigin.DEVICE_STATUS: {
                const device = updateDeviceStatuses.find(update => update.name == imp.name);
                if (device != null) {
                    return device.connected;
                } else {
                    return null;
                }
            }
            case SystemOrigin.ENVIRONMENT: {
                switch (imp.name as EnvironmentInput) {
                    case EnvironmentInput.TIME: {
                        return new Date(2000, 0, 1, consistentDate.getHours(), consistentDate.getMinutes(), consistentDate.getSeconds());
                    }
                    case EnvironmentInput.DATE: {
                        return new Date(consistentDate.getFullYear(), consistentDate.getMonth(), consistentDate.getDate());
                    }
                    case EnvironmentInput.DATE_TIME: {
                        return new Date(
                            consistentDate.getFullYear(),
                            consistentDate.getMonth(),
                            consistentDate.getDate(),
                            consistentDate.getHours(),
                            consistentDate.getMinutes(),
                            consistentDate.getSeconds()
                        );
                    }
                    case EnvironmentInput.INTERNET_ACCESS: {
                        return this.deviceMonitorService.internetAccess ?? false;
                    }
                }
            }
        }
    }
    
    /**
     * Get the value of an output of a {@link Sensor|`Sensor`}'s  {@link Mix|`Mix`} required by another {@link Mix|`Mix`}'s {@link Mix#imports|import}.
     *
     * @param {ExportedDatum} imp - The {@link Mix|`Mix`}'s {@link Mix#imports|import} that
     *                              contains information about the sensor to retrieve the value from.
     * @param {Sensor[]} sensors - The list of {@link Sensor|`Sensor`s} available in the system.
     * @param {ReadonlyMap<number, MixingCalculationResult>} availableResults - The map containing all the outputs of mixes already calculated,
     *                                                                          from which to find the required output.
     * @param {Mix} mix - The mix that requires the sensor data. Used for error handling.
     * @returns {unknown} The value of the required exported property.
     * @throws {TickError} - {@link TickError|`TickError`} if:
     *                       - the sensor is not available,
     *                       - the required sensor doesn't have a mix linked to it,
     *                       - the requested import is not found among the already calculated imports.
     */
    private getSensorExportForImport(
        imp: ExportedDatum,
        sensors: Sensor[],
        availableResults: Map<number, MixingCalculationResult>,
        mix: Mix
    ): unknown {
        const sensor = sensors.find(otherSensor => otherSensor.name == imp.originName);
        if (sensor == null) {
            throw new TickError(TickErrorType.UNAVAILABLE_SENSOR, {mixId: mix.id as number, sensorName: imp.originName, import: imp});
        }
        const mixId = sensor.mix;
        if (mixId == null) {
            throw new TickError(TickErrorType.NO_ASSIGNED_MIX, {mixId: mix.id as number, sensorName: imp.originName, import: imp});
        }
        const mixResult = availableResults.get(mixId);
        if (mixResult?.outputs.has(imp.name) != true) {
            throw new TickError(TickErrorType.UNAVAILABLE_IMPORT, {mixId: mix.id as number, sensorName: imp.originName, import: imp});
        }
        return mixResult.outputs.get(imp.name);
    }
    
    /**
     * Get the value of an output of a {@link Group|`Group`}'s {@link Mix|`Mix`} required by another {@link Mix|`Mix`}'s {@link Mix#imports|import}.
     *
     * @param {ExportedDatum} imp - The {@link Mix|`Mix`}'s {@link Mix#imports|import} that contains information about the group to retrieve the value from.
     * @param {boolean} sensorPhase - Whether to look for the sensor-side mix or the actuator-side mix of the group.
     * @param {Group[]} groups - The list of {@link Group|`Group`s} available in the system.
     * @param {Map<number, MixingCalculationResult>} availableResults - The map containing all the outputs of mixes already calculated.
     * @param {Mix} mix - The mix that requires the group data. Used for error handling.
     * @returns {unknown} The value of the required exported property.
     * @throws {TickError} - {@link TickError|`TickError`} if:
     *                       - the group is not available,
     *                       - the required group doesn't have a mix linked to it,
     *                       - the requested import is not found among the already calculated imports.
     */
    private getGroupExportForImport(
        imp: ExportedDatum,
        sensorPhase: boolean,
        groups: Group[],
        availableResults: Map<number, MixingCalculationResult>,
        mix: Mix
    ): unknown {
        const group = groups.find(otherGroup => otherGroup.name == imp.originName);
        if (group == null) {
            throw new TickError(TickErrorType.UNAVAILABLE_GROUP, {mixId: mix.id as number, groupName: imp.originName, import: imp});
        }
        const mixId = sensorPhase ? group.sensorMix : group.actuatorMix;
        if (mixId == null) {
            throw new TickError(TickErrorType.NO_ASSIGNED_MIX, {mixId: mix.id as number, groupName: imp.originName, import: imp});
        }
        const mixResult = availableResults.get(mixId);
        if (mixResult?.outputs.has(imp.name) != true) {
            throw new TickError(TickErrorType.UNAVAILABLE_IMPORT, {mixId: mix.id as number, groupName: imp.originName, import: imp});
        }
        return mixResult.outputs.get(imp.name);
    }
    
    /**
     * Get the value of an output of a {@link MixingGraphCenter|`MixingGraphCenter`}'s {@link Mix|`Mix`} required by another {@link Mix|`Mix`}'s {@link Mix#imports|import}.
     *
     * @param {ExportedDatum} imp - The {@link Mix|`Mix`}'s {@link Mix#imports|import} that contains information about the center to retrieve the value from.
     * @param {MixingGraphCenter[]} centers - The list of {@link MixingGraphCenter|`MixingGraphCenter`s} available in the system.
     * @param {Map<number, MixingCalculationResult>} availableResults - The map containing all the outputs of mixes already calculated.
     * @param {Mix} mix - The mix that requires the center data. Used for error handling.
     * @returns {unknown} The value of the required exported property.
     * @throws {TickError} - {@link TickError|`TickError`} if:
     *                       - the center is not available,
     *                       - the requested import is not found among the already calculated imports.
     * @private
     */
    private getCenterExportForImport(
        imp: ExportedDatum,
        centers: MixingGraphCenter[],
        availableResults: Map<number, MixingCalculationResult>,
        mix: Mix
    ): unknown {
        const center = centers.find(otherCenter => otherCenter.name == imp.originName);
        if (center == null) {
            throw new TickError(TickErrorType.UNAVAILABLE_CENTER, {mixId: mix.id as number, centerName: imp.originName, import: imp});
        }
        const mixResult = availableResults.get(center.mix);
        if (mixResult?.outputs.has(imp.name) != true) {
            throw new TickError(TickErrorType.UNAVAILABLE_IMPORT, {mixId: mix.id as number, centerName: imp.originName, import: imp});
        }
        return mixResult.outputs.get(imp.name);
    }
    
    /**
     * Request for a new tick of the main cycle to be recalculated.
     */
    public requestRecalculation(): void {
        this.tick();
    }
    
    /**
     * Unregister and register again the listeners of all {@link Sensor|`Sensor`s} in the system. To be called after some
     * changes on the {@link Sensor|`Sensor`}'s setup requires a total reset.
     */
    public async updateSensors(): Promise<void> {
        this.zigbeeService.unlistenDeviceStatus();
        for (const value of this.sensorSubscriptions.values()) {
            value.unsubscribe();
        }
        this.sensorSubscriptions.clear();
        this.sensorObservables.clear();
        this.sensorValues.clear();
        const sensors = await this.sensorService.getAllSensors();
        sensors.forEach(sensor => {
            const observable = this.zigbeeService.listenDeviceStatus(sensor.zigbeeAddress);
            const subscription = observable.subscribe(next => {
                this.sensorValues.set(sensor.name, next);
                this.tick({
                              zigbeeId:    sensor.zigbeeAddress,
                              valueChange: next
                          });
            });
            this.sensorSubscriptions.set(sensor.name, subscription);
            this.sensorObservables.set(sensor.name, observable);
        });
    }
    
    /**
     * {@link Schedule.Job|`Job`s} that handle the scheduling of {@link SystemTimer|`SystemTimer`s}.
     */
    private timerJobs: Schedule.Job[] = [];
    
    /**
     * Reschedules all the {@link Schedule.Job|`Job`s} that handle {@link SystemTimer|`SystemTimer`s}, cancelling the
     * already scheduled ones, in case the underlying timer definition changed.
     */
    public async updateTimers(): Promise<void> {
        
        this.timerJobs.forEach(job => job.cancel(false));
        
        const timers = await this.timersService.getAllTimers();
        
        const now = new Date();
        for (const timer of timers) {
            let nextOccurrence: Date = timer.getNextOccurrence(now);
            const scheduleNext       = (): void => {
                const scheduledJob = Schedule.scheduleJob(nextOccurrence, () => {
                    this.tick(undefined, {
                        time: nextOccurrence,
                        name: timer.name
                    });
                    nextOccurrence = timer.getNextOccurrence(nextOccurrence);
                    this.timerJobs = this.timerJobs.filter(a => a !== scheduledJob);
                    scheduleNext();
                });
                this.timerJobs.push(scheduledJob);
            };
            scheduleNext();
        }
    }
    
    /**
     * Triggers a recalculation of the system after a monitored device status changed.
     *
     * @param {DeviceMonitorDevice[]} updateDeviceStatuses - The new values of the changed device status.
     */
    public deviceStatusChanged(updateDeviceStatuses: DeviceMonitorDevice[]): void {
        this.tick(undefined, undefined, updateDeviceStatuses);
    }
}

/**
 * An update on the data coming from a {@link Sensor|`Sensor`} from zigbee2mqtt.
 */
export interface SensorDataChange {
    /**
     * The {@link Sensor#zigbeeAddress|`zigbeeAddress`} of the sensor this change is referencing.
     */
    zigbeeId: string,
    /**
     * The old and new values.
     */
    valueChange: StatusUpdate<unknown>
}

/**
 * An expiration of a {@link SystemTimer|`SystemTimer`}.
 */
export interface TimerDataChange {
    /**
     * The time at which the timer expired.
     */
    time: Date,
    /**
     * The unique name of the timer that expired.
     */
    name: string,
}

/**
 * The type of error raised during the calculation of a cycle of the system.
 */
export enum TickErrorType {
    /** A {@link Mix|`Mix`} required in the calculation is missing. */
    MISSING_MIX               = "MISSING_MIX",
    /** An import for a {@link Mix|`Mix`} is not available at the moment of calculation of a {@link Mix|`Mix`}. */
    UNAVAILABLE_IMPORT        = "UNAVAILABLE_IMPORT",
    /** A {@link Sensor|`Sensor`} is not available at the moment of calculation of a {@link Mix|`Mix`}. */
    UNAVAILABLE_SENSOR        = "UNAVAILABLE_SENSOR",
    /** A {@link SystemParameter|`SystemParameter`} is not available at the moment of calculation of a {@link Mix|`Mix`}. */
    MISSING_PARAMETER         = "MISSING_PARAMETER",
    /** An error occurred while calculating a {@link Mix|`Mix`}. */
    CALCULATION_ERROR         = "CALCULATION_ERROR",
    /** An unknown error occurred while calculating a tick of the system. */
    UNKNOWN_ELABORATION_ERROR = "UNKNOWN_ELABORATION_ERROR",
    /** A {@link Group|`Group`} is not available at the moment of calculation of a {@link Mix|`Mix`}. */
    UNAVAILABLE_GROUP         = "UNAVAILABLE_GROUP",
    /** A {@link Mix|`Mix`} is requiring a result from a {@link Mix|`Mix`} of an entity that doesn't have a mix assigned to it. */
    NO_ASSIGNED_MIX           = "NO_ASSIGNED_MIX",
    /** A {@link MixingGraphCenter|`MixingGraphCenter`} is not available at the moment of calculation of a {@link Mix|`Mix`}. */
    UNAVAILABLE_CENTER        = "UNAVAILABLE_CENTER",
    /** The cycle resulted in some data to be set for an {@link Actuator|`Actuator`}, but the actuator doesn't exist. */
    UNAVAILABLE_ACTUATOR      = "UNAVAILABLE_ACTUATOR",
    /** The cycle resulted in a property to be set for an {@link Actuator|`Actuator`}, but the actuator doesn't {@link Actuator#exposes|expose} the value. */
    UNKNOWN_EXPOSE            = "UNKNOWN_EXPOSE",
    /** The cycle resulted in a property to be set for an {@link Actuator|`Actuator`}, but the defined {@link Actuator#exposes|expose} in the actuator is of different type than the result. */
    WRONG_EXPOSED_VALUE       = "WRONG_EXPOSED_VALUE",
}

/**
 * The description of an error raised during the calculation of a cycle of the system.
 */
export
/**
 * The description of an error raised during the calculation of a cycle of the system.
 */
const TICK_ERROR_MESSAGES: Record<TickErrorType, string> = {
    MISSING_MIX:               "Cannot find a mix that is defined in the graph.",
    UNAVAILABLE_IMPORT:        "An import for a mix is not available at the moment of calculation of the mix.",
    UNAVAILABLE_SENSOR:        "A sensor is not available at the moment of calculation of the mix.",
    MISSING_PARAMETER:         "A system parameter is not available at the moment of calculation of the mix.",
    CALCULATION_ERROR:         "An error occurred while calculating the mix.",
    UNKNOWN_ELABORATION_ERROR: "An unknown error occurred while calculating the mix.",
    UNAVAILABLE_GROUP:         "A group is not available at the moment of calculation of the mix.",
    NO_ASSIGNED_MIX:           "The mix is requiring the result from a mix of an entity that doesn't have a mix assigned to it.",
    UNAVAILABLE_CENTER:        "A center is not available at the moment of calculation of the mix.",
    UNAVAILABLE_ACTUATOR:      "An actuator is not available to be set",
    UNKNOWN_EXPOSE:            "A result for an actuator contains an unknown exposed property",
    WRONG_EXPOSED_VALUE:       "A result for an actuator contains an exposed property value that is of the wrong type"
};

/**
 * The additional data about an error raised during the calculation of a cycle of the system.
 */
export interface TickErrorData {
    /** When the error regards the calculation of a {@link Mix|`Mix`}, the {@link Mix#id|`id`} of the mix that caused the error. */
    mixId?: number;
    /** When the error involves an import, the import that caused the error. */
    import?: ExportedDatum,
    /** When the error involves a sensor, the name of the sensor involved in the error. */
    sensorName?: string,
    /** When the error involves a system parameter, the name of the system parameter involved in the error. */
    parameterName?: string,
    /** When the error is a {@link MixCalculationError|`MixCalculationError`} error, the specific calculation error thrown by the mix. */
    calculationError?: MixCalculationError,
    /** When the error involves a group, the name of the group involved in the error. */
    groupName?: string,
    /** When the error involves a center, the name of the center involved in the error. */
    centerName?: string
    /** When the error involves an actuator, the name of the actuator involved in the error. */
    actuatorName?: string,
    /** When the error involves an exposed property, the name of the exposed property involved in the error. */
    expose?: string,
    /** When the error involves a specific value, the value that caused the error. */
    value?: unknown,
    /** When the error wraps another one, the original error object. */
    originalError?: unknown
}

/**
 * An error raised during the calculation of a cycle of the system.
 */
export class TickError extends Error {
    
    /**
     * Creates an instance of the class.
     *
     * @param {TickErrorType} errorType - The type of error.
     * @param {TickErrorData} data - The additional data about the error.
     */
    constructor(public readonly errorType: TickErrorType, public readonly data?: TickErrorData) {
        super(TICK_ERROR_MESSAGES[errorType]);
    }
    
}

/**
 * All the data involved in the execution of a single cycle of the system.
 */
export class EngineExecution {
    
    /**
     * The data stored by storage elaboration nodes at the beginning of the execution of the cycle tick.
     */
    public storage: MixingStorageJSON;
    
    /**
     * Create an instance of the class from the results of a cycle tick.
     *
     * @param {Date} date - The time and date of execution of the cycle tick.
     * @param {Map<number, MixingCalculationResult>} mixResults - All the results from all the calculated mixes.
     * @param {MixingStorage} storage - The data stored by storage elaboration nodes at the beginning of the execution of the cycle tick.
     * @returns {EngineExecution} The instance of the class.
     */
    public static create(
        date: Date,
        mixResults: Map<number, MixingCalculationResult>,
        storage: MixingStorage
    ): EngineExecution {
        return new EngineExecution(date, mixResults, storage);
    }
    
    /**
     * Creates an instance of the class.
     *
     * @param {Date} date - The time and date of execution of the cycle tick.
     * @param {Map<number, MixingCalculationResult>} mixResults - All the results from all the calculated mixes.
     * @param {MixingStorage} storage - The data stored by storage elaboration nodes at the beginning of the execution of the cycle tick.
     */
    private constructor(date: Date, mixResults: Map<number, MixingCalculationResult>, storage: MixingStorage);
    /**
     * Creates an instance of the class.
     *
     * @param {Date} date - The time and date of execution of the cycle tick.
     * @param {Map<number, MixingCalculationResult>} mixResults - All the results from all the calculated mixes.
     * @param {undefined} storage - The data stored by storage elaboration nodes at the beginning of the execution of the cycle tick.
     *                              `undefined` because its serialized version is provided as the next parameter.
     * @param {MixingStorageJSON} storageJSON - The data stored by storage elaboration nodes at the beginning of the execution of the cycle tick,
     *                                          in its serialized version.
     */
    private constructor(date: Date, mixResults: Map<number, MixingCalculationResult>, storage: undefined, storageJSON: MixingStorageJSON);
    
    /**
     * Creates an instance of the class.
     *
     * @param {Date} date - The time and date of execution of the cycle tick.
     * @param {Map<number, MixingCalculationResult>} mixResults - All the results from all the calculated mixes.
     * @param {undefined} storage - The data stored by storage elaboration nodes at the beginning of the execution of the cycle tick.
     *                              `undefined` if its serialized version is provided as the next parameter.
     * @param {MixingStorageJSON} storageJSON - The data stored by storage elaboration nodes at the beginning of the execution of the cycle tick,
     *                                          in its serialized version. Ignored if `storage` is provided.
     * @private
     */
    private constructor(public date: Date,
                        public mixResults: Map<number, MixingCalculationResult>,
                        storage?: MixingStorage, storageJSON?: MixingStorageJSON) {
        if (storage != null) {
            this.storage = mixingStorageToJSON(storage);
        } else if (storageJSON != null) {
            this.storage = storageJSON;
        } else {
            this.storage = {} as MixingStorageJSON;
        }
    }
    
    /**
     * Converts the engine execution data instance into its JSON representation.
     *
     * @returns {EngineExecutionJSON} The JSON representation of `this`.
     */
    public toJSON(): EngineExecutionJSON {
        return {
            dateStamp:  this.date.getTime(),
            mixResults: Object.fromEntries([...this.mixResults.entries()].map(entry => [entry[0], mixingCalculationResultToJSON(entry[1])])),
            storage:    this.storage
        };
    }
    
    /**
     * Constructs a new {@link EngineExecution|`EngineExecution`} instance from a given JSON representation.
     *
     * @param {EngineExecutionJSON} engineExecutionJSON - The JSON representation of the engine execution data.
     * @returns {EngineExecution} The engine execution data object constructed from the provided JSON.
     */
    public static fromJSON(engineExecutionJSON: EngineExecutionJSON): EngineExecution {
        const mixResults: Map<number, MixingCalculationResult> = new Map<number, MixingCalculationResult>();
        for (const [key, value] of Object.entries(engineExecutionJSON.mixResults)) {
            mixResults.set(parseInt(key), mixingCalculationResultFromJSON(value));
        }
        return new EngineExecution(new Date(engineExecutionJSON.dateStamp), mixResults, undefined, engineExecutionJSON.storage);
    }
    
}

/**
 * The serialization of the class {@link EngineExecution|`EngineExecution`}.
 */
export interface EngineExecutionJSON {
    /**
     * Serialization of the property {@link EngineExecution#date|`date`}.
     */
    dateStamp: number;
    /**
     * Serialization of the property {@link EngineExecution#mixResults|`mixResults`}.
     */
    mixResults: Record<number, MixingCalculationResultJSON>;
    /**
     * Serialization of the property {@link EngineExecution#storage|`storage`}.
     */
    storage: MixingStorageJSON;
}


/**
 * The persistent data structure used by {@link EngineService|`EngineService`}
 * for persisting data about its elaborations.
 */
export class EngineServiceData {
    
    /**
     * The data stored by storage elaboration nodes.
     */
    public storage: MixingStorage;
    
    /**
     * All the stored past execution of the main cycle.
     */
    public executions: EngineExecution[];
    
    /**
     * The location of the server, for sun phases calculations.
     */
    public location?: { latitude: number, longitude: number };
    
    /**
     * The pending timeouts set by {@link ElaborationNodeTimeout|`ElaborationNodeTimeout`s}.
     */
    public timeouts: MixNodeTimeout[];
    
    /**
     * Creates an instance of the class from its serialization.
     *
     * @param {EngineServiceDataJSON} engineServiceDataJSON - The serialization of the class to recreate into an instance of the class.
     */
    constructor(engineServiceDataJSON?: EngineServiceDataJSON) {
        this.storage    = {
            [DatumType.BOOLEAN]:    new Map<string, unknown>(),
            [DatumType.COLOR]:      new Map<string, unknown>(),
            [DatumType.COLOR_TEMP]: new Map<string, unknown>(),
            [DatumType.DATE]:       new Map<string, unknown>(),
            [DatumType.DATE_TIME]:  new Map<string, unknown>(),
            [DatumType.TIME]:       new Map<string, unknown>(),
            [DatumType.NUMBER]:     new Map<string, unknown>(),
            [DatumType.STRING]:     new Map<string, unknown>()
        };
        this.executions = [];
        this.timeouts = [];
        if (engineServiceDataJSON != null) {
            for (const type of Object.values(DatumType)) {
                if (engineServiceDataJSON.storage[type] != null) {
                    for (const [key, value] of Object.entries(engineServiceDataJSON.storage[type])) {
                        this.storage[type].set(key, value);
                    }
                }
            }
            this.executions   = engineServiceDataJSON.executions.map(execution => EngineExecution.fromJSON(execution));
            this.location     = engineServiceDataJSON.location;
            const now: number = Date.now();
            this.timeouts     = (engineServiceDataJSON.timeouts ?? [])
                .filter(e => e.expiration > now);
        }
    }
    /**
     * Converts the engine data instance into its JSON representation.
     *
     * @returns {EngineServiceDataJSON} The JSON representation of `this`.
     */
    public toJSON(): EngineServiceDataJSON {
        const result: Partial<Record<DatumType, Record<string, unknown>>> = {};
        for (const type of Object.values(DatumType)) {
            result[type] = Object.fromEntries<unknown>(this.storage[type].entries());
        }
        const now = Date.now();
        return {
            storage:    result,
            executions: this.executions.map(execution => execution.toJSON()),
            location: this.location,
            timeouts: this
                          .timeouts
                          .filter(e => e.expiration > now)
        };
    }
    
}

/**
 * The serialization of the class {@link EngineServiceData|`EngineServiceData`}.
 */
export interface EngineServiceDataJSON {
    /**
     * Serialization of the property {@link EngineServiceData#storage|`storage`}.
     */
    storage: Partial<Record<DatumType, Record<string, unknown>>>;
    /**
     * Serialization of the property {@link EngineServiceData#executions|`executions`}.
     */
    timeouts?: MixNodeTimeout[];
    /**
     * Serialization of the property {@link EngineServiceData#executions|`executions`}.
     */
    executions: EngineExecutionJSON[];
    /**
     * Serialization of the property {@link EngineServiceData#location|`location`}.
     */
    location?: {
        /** The latitude of the location. */
        latitude: number,
        /** The longitude of the location. */
        longitude: number
    };
}
