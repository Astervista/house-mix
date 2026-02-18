import {forwardRef, Inject, OnModuleInit} from "@nestjs/common";
import MixService from "../mixing/mix/mix.service";
import {SensorService} from "../devices/sensor/sensor.service";
import {Observable} from "rxjs";
import {StatusUpdate, ZigbeeService} from "../zigbee/zigbee.service";
import {ParametersService} from "../system/parameters/parameters.service";
import {TimersService} from "../system/timers/timers.service";
import {Datum, DatumOrigin, DatumType, DatumTypeColor, DatumTypeColorBase, ExportedDatum} from "@common/mixing/mix/datum";
import {EnvironmentInput, SystemOrigin} from "@common/system/constants";
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
    StorageUpdate
} from "@common/mixing/mix/mix";
import {Color} from "@common/utils/color-convert";
import {Sensor} from "@common/devices/sensor/sensor";
import {SystemParameter} from "@common/system/parameter/system-parameter";
import {GroupService} from "../devices/group/group.service";
import {Group} from "@common/devices/group/group";
import {MixingGraph, MixingGraphCenter} from "@common/mixing/mixing-graph";
import {PersistentDataService} from "../helpers/file/persistent-data-service";
import {FileService} from "../helpers/file/file.service";
import {ActuatorService} from "../devices/actuator/actuator.service";
import * as Schedule from "node-schedule";
import {DeviceMonitorDevice} from "@common/system/device-monitor/device-monitor-device";
import {DeviceMonitorService} from "../system/device-monitor/device-monitor.service";
import {Actuator} from "@common/devices/actuator/actuator";
import {ElaborationNodeSunEvents} from "@common/mixing/mix/elaboration-node";

const SAVE_FILE = "engine/engine.json";

export class EngineService extends PersistentDataService<EngineServiceData, EngineServiceDataJSON> implements OnModuleInit {
    
    private invalidated: boolean = false;
    
    private sensorObservables: Map<string, Observable<unknown>> = new Map<string, Observable<unknown>>;
    
    private sensorValues: Map<string, unknown> = new Map<string, unknown>;
    
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
            if (data.location == null) {
                try {
                    const ipRes = await fetch("https://api.ipify.org?format=json");
                    const {ip}  = await ipRes.json() as { ip?: string };
                    
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
            ElaborationNodeSunEvents.coordinates = data.location;
        });
    }
    
    public onModuleInit(): void {
        this.updateSensors()
            .then(() => this.updateTimers())
            .then(() => {
                setInterval(this.loop.bind(this) as (() => void), 1000);
            })
            .catch((error: unknown) => {
                console.error(error);
            });
    }
    
    private loop(): void {
        if (this.invalidated) {
            this.invalidated = false;
            this.tick();
        }
    }
    
    private readonly elaborationQueue: Promise<void>[] = [];
    
    private tick(sensorDataChange?: SensorDataChange, timerDataChange?: TimerDataChange, updateDeviceStatuses: DeviceMonitorDevice[] = []): void {
        let promise: Promise<void>;
        const lastElement = this.elaborationQueue[this.elaborationQueue.length - 1];
        if (lastElement == undefined) {
            promise = this.asyncTick(sensorDataChange, timerDataChange, updateDeviceStatuses);
        } else {
            promise = lastElement.then(() => this.asyncTick(sensorDataChange));
        }
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
                const index = this.elaborationQueue.indexOf(promise);
                if (index != -1) {
                    void this.elaborationQueue.splice(index, 1);
                }
            });
    }
    
    private async asyncTick(sensorDataChange?: SensorDataChange, timerDataChange?: TimerDataChange, updateDeviceStatuses: DeviceMonitorDevice[] = []): Promise<void> {
        const data: EngineServiceData                         = await this.data;
        const storage: MixingStorage                          = data.storage;
        const mixingGraph: MixingGraph                        = await this.mixService.getGraph();
        const {sensorGroupLevels, actuatorGroupLevels}         = mixingGraph.generateGroupLevels();
        const mixes: Mix[]                                    = await this.mixService.getAllMixes();
        const parameters: SystemParameter[]                   = await this.parametersService.getAllParameters();
        const sensorStatusCache: ReadonlyMap<string, unknown> = this.zigbeeService.deviceStatusCache;
        const sensors: Sensor[]                               = await this.sensorService.getAllSensors();
        const groups: Group[]                                 = await this.groupService.getAllGroups();
        const actuators: Actuator[]                           = await this.actuatorService.getAllActuators();
        const mixResults: Map<number, MixingCalculationResult> = new Map<number, MixingCalculationResult>();
        const orderedStorageUpdate: StorageUpdate[]            = [];
        const now                                             = new Date();
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
                const mixResult = mix.calculate(inputs, storage);
                orderedStorageUpdate.push(...mixResult.storageUpdate);
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
                    const mixResult = mix.calculate(inputs, storage);
                    orderedStorageUpdate.push(...mixResult.storageUpdate);
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
                const mixResult = mix.calculate(inputs, storage);
                orderedStorageUpdate.push(...mixResult.storageUpdate);
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
                    const mixResult = mix.calculate(inputs, storage);
                    orderedStorageUpdate.push(...mixResult.storageUpdate);
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
                const actuatorResult = mix.calculate(inputs, storage);
                orderedStorageUpdate.push(...actuatorResult.storageUpdate);
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
    
    private getSensorUpdateForImport(
        imp: ExportedDatum,
        sensors: Sensor[],
        sensorDataChange: SensorDataChange | undefined,
        mix: Mix
    ): unknown {
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
        const mixId     = center.mix;
        const mixResult = availableResults.get(mixId);
        if (mixResult?.outputs.has(imp.name) != true) {
            throw new TickError(TickErrorType.UNAVAILABLE_IMPORT, {mixId: mix.id as number, centerName: imp.originName, import: imp});
        }
        return mixResult.outputs.get(imp.name);
    }
    
    public requestRecalculation(): void {
        this.tick();
    }
    
    public async updateSensors(): Promise<void> {
        this.zigbeeService.unlistenDeviceStatus();
        this.sensorObservables.clear();
        this.sensorValues.clear();
        const sensors = await this.sensorService.getAllSensors();
        sensors.forEach(sensor => {
            const observable = this.zigbeeService.listenDeviceStatus(sensor.zigbeeAddress);
            observable.subscribe(next => {
                this.sensorValues.set(sensor.name, next);
                this.tick({
                              zigbeeId:    sensor.zigbeeAddress,
                              valueChange: next
                          });
            });
            this.sensorObservables.set(sensor.name, observable);
        });
    }
    
    private timerJobs: Schedule.Job[] = [];
    
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
    
    public deviceStatusChanged(updateDeviceStatuses: DeviceMonitorDevice[]): void {
        this.tick(undefined, undefined, updateDeviceStatuses);
    }
}


interface SensorDataChange {
    zigbeeId: string,
    valueChange: StatusUpdate<unknown>
}

interface TimerDataChange {
    time: Date,
    name: string,
}

export enum TickErrorType {
    MISSING_MIX               = "MISSING_MIX",
    UNAVAILABLE_IMPORT        = "UNAVAILABLE_IMPORT",
    UNAVAILABLE_SENSOR        = "UNAVAILABLE_SENSOR",
    MISSING_PARAMETER         = "MISSING_PARAMETER",
    CALCULATION_ERROR         = "CALCULATION_ERROR",
    UNKNOWN_ELABORATION_ERROR = "UNKNOWN_ELABORATION_ERROR",
    UNKNOWN_ERROR             = "UNKNOWN_ERROR",
    UNAVAILABLE_GROUP         = "UNAVAILABLE_GROUP",
    NO_ASSIGNED_MIX           = "NO_ASSIGNED_MIX",
    UNAVAILABLE_CENTER        = "UNAVAILABLE_CENTER",
    UNAVAILABLE_ACTUATOR      = "UNAVAILABLE_ACTUATOR",
    UNKNOWN_EXPOSE            = "UNKNOWN_EXPOSE",
    WRONG_EXPOSED_VALUE       = "WRONG_EXPOSED_VALUE",
}

export const TICK_ERROR_MESSAGES: Record<TickErrorType, string> = {
    MISSING_MIX:               "Cannot find a mix that is defined in the graph.",
    UNAVAILABLE_IMPORT:        "An import for a mix is not available at the moment of calculation of the mix.",
    UNAVAILABLE_SENSOR:        "A sensor is not available at the moment of calculation of the mix.",
    MISSING_PARAMETER:         "A system parameter is not available at the moment of calculation of the mix.",
    CALCULATION_ERROR:         "An error occurred while calculating the mix.",
    UNKNOWN_ELABORATION_ERROR: "An unknown error occurred while calculating the mix.",
    UNKNOWN_ERROR:             "An unknown error occurred",
    UNAVAILABLE_GROUP:         "A group is not available at the moment of calculation of the mix.",
    NO_ASSIGNED_MIX:           "The mix is requiring the result from a mix of an entity that doesn't have a mix assigned to it.",
    UNAVAILABLE_CENTER:        "A center is not available at the moment of calculation of the mix.",
    UNAVAILABLE_ACTUATOR:      "An actuator is not available to be set",
    UNKNOWN_EXPOSE:            "A result for an actuator contains an unknown exposed property",
    WRONG_EXPOSED_VALUE:       "A result for an actuator contains an exposed property value that is of the wrong type"
};

interface TickErrorData {
    mixId?: number,
    import?: ExportedDatum,
    sensorName?: string,
    parameterName?: string,
    calculationError?: MixCalculationError,
    groupName?: string,
    centerName?: string
    actuatorName?: string,
    expose?: string,
    value?: unknown,
    originalError?: unknown
}

export class TickError extends Error {
    
    constructor(public readonly errorType: TickErrorType, public readonly data?: TickErrorData) {
        super(TICK_ERROR_MESSAGES[errorType]);
    }
    
}

export class EngineExecution {
    
    public storage: MixingStorageJSON;
    
    public static create(
        date: Date,
        mixResults: Map<number, MixingCalculationResult>,
        storage: MixingStorage
    ): EngineExecution {
        return new EngineExecution(date, mixResults, storage);
    }
    
    private constructor(date: Date, mixResults: Map<number, MixingCalculationResult>, storage: MixingStorage);
    private constructor(date: Date, mixResults: Map<number, MixingCalculationResult>, storage: undefined, storageJSON: MixingStorageJSON);
    
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
    
    public toJSON(): EngineExecutionJSON {
        return {
            dateStamp:  this.date.getTime(),
            mixResults: Object.fromEntries([...this.mixResults.entries()].map(entry => [entry[0], mixingCalculationResultToJSON(entry[1])])),
            storage:    this.storage
        };
    }
    
    public static fromJSON(json: EngineExecutionJSON): EngineExecution {
        const mixResults: Map<number, MixingCalculationResult> = new Map<number, MixingCalculationResult>();
        for (const [key, value] of Object.entries(json.mixResults)) {
            mixResults.set(parseInt(key), mixingCalculationResultFromJSON(value));
        }
        return new EngineExecution(new Date(json.dateStamp), mixResults, undefined, json.storage);
    }
    
}

export interface EngineExecutionJSON {
    dateStamp: number;
    mixResults: Record<number, MixingCalculationResultJSON>;
    storage: MixingStorageJSON;
}


export class EngineServiceData {
    
    public storage: MixingStorage;
    
    public executions: EngineExecution[];
    
    public location?: { latitude: number, longitude: number };
    
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
        if (engineServiceDataJSON != null) {
            for (const type of Object.values(DatumType)) {
                if (engineServiceDataJSON.storage[type] != null) {
                    for (const [key, value] of Object.entries(engineServiceDataJSON.storage[type])) {
                        this.storage[type].set(key, value);
                    }
                }
            }
            this.executions = engineServiceDataJSON.executions.map(execution => EngineExecution.fromJSON(execution));
            this.location = engineServiceDataJSON.location;
        }
    }
    
    public toJSON(): EngineServiceDataJSON {
        const result: Partial<Record<DatumType, Record<string, unknown>>> = {};
        for (const type of Object.values(DatumType)) {
            result[type] = Object.fromEntries<unknown>(this.storage[type].entries());
        }
        return {
            storage:    result,
            executions: this.executions.map(execution => execution.toJSON()),
            location:   this.location
        };
    }
    
}

export interface EngineServiceDataJSON {
    storage: Partial<Record<DatumType, Record<string, unknown>>>;
    executions: EngineExecutionJSON[];
    location?: { latitude: number, longitude: number };
}
