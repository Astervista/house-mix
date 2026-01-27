import {BadRequestException, forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException} from "@nestjs/common";
import {Connection, Mix, MixJSON} from "@common/mixing/mix/mix";
import {FileService} from "../../helpers/file/file.service";
import {PersistentDataService} from "../../helpers/file/persistent-data-service";
import {MixPhase, MixPositionInfo, MixTarget, PutMixShowableError} from "@common/mixing/mix/rest-classes";
import {DatumOrigin, DatumType, ExportedDatum} from "@common/mixing/mix/datum";
import {ParametersService} from "../../system/parameters/parameters.service";
import {TimersService} from "src/system/timers/timers.service";
import {SystemOrigin} from "@common/system/constants";
import {SensorService} from "../../devices/sensor/sensor.service";
import {GroupService} from "../../devices/group/group.service";
import {ActuatorService} from "../../devices/actuator/actuator.service";
import {MixingGraph, MixingGraphActuator, MixingGraphDependency, MixingGraphGroup, MixingGraphSensor} from "@common/mixing/mixing-graph";

const SAVE_FILE = "mixing/mix.json";

@Injectable()
class MixService extends PersistentDataService<MixData, MixDataJSON> {
    
    constructor(
        fileService: FileService,
        private parameterService: ParametersService,
        private timersService: TimersService,
        @Inject(forwardRef(() => SensorService))
        private sensorService: SensorService,
        @Inject(forwardRef(() => ActuatorService))
        private actuatorService: ActuatorService,
        @Inject(forwardRef(() => GroupService))
        private groupService: GroupService
    ) {
        super(fileService, SAVE_FILE, MixData);
    }
    
    public async getAllMixes(): Promise<Mix[]> {
        return (await this.data).mixes.slice();
    }
    
    public async getMixById(id: number): Promise<Mix | null> {
        return (await this.data).mixes.find(a => a.id === id) ?? null;
    }
    
    public async putMix(mix: Mix, position: MixPositionInfo): Promise<number> {
        const data = await this.data;
        
        // We either put a new mix in an element that has a null mix or update only if the mix is not new but the id matches
        
        let oldMixId: number | null = null;
        if (position.phase == MixPhase.SENSORS) {
            if (position.target == MixTarget.DEVICE) {
                const sensor = await this.sensorService.getSensorByName(position.sensorName);
                if (sensor == null) {
                    throw new NotFoundException(`Cannot find sensor ${position.sensorName}`);
                }
                oldMixId = sensor.mix;
            } else { // MixTarget.GROUP
                const group = await this.groupService.getGroupByName(position.groupName);
                if (group == null) {
                    throw new NotFoundException(`Cannot find group ${position.groupName}`);
                }
                oldMixId = group.sensorMix;
            }
        } else if (position.phase == MixPhase.ACTUATORS) {
            if (position.target == MixTarget.DEVICE) {
                const actuator = await this.actuatorService.getActuatorByName(position.actuatorName);
                if (actuator == null) {
                    throw new NotFoundException(`Cannot find actuator ${position.actuatorName}`);
                }
                oldMixId = actuator.mix;
            } else { // MixTarget.GROUP
                const group = await this.groupService.getGroupByName(position.groupName);
                if (group == null) {
                    throw new NotFoundException(`Cannot find group ${position.groupName}`);
                }
                oldMixId = group.actuatorMix;
            }
        } else { // MixPhase.CENTER
            // TODO: write logic for checking if a mix at the center is already existing
            throw new InternalServerErrorException("Not yet implemented");
        }
        if (oldMixId == null) {
            if (mix.id != "NEW") {
                throw new BadRequestException("Cannot set an already created mix to an entity that doesn't have the mix assigned yet");
            }
        } else {
            if (mix.id != oldMixId) {
                if (mix.id == "NEW") {
                    throw new BadRequestException("Cannot set a new mix to an entity that already has a mix assigned to it");
                } else {
                    throw new BadRequestException("If an entity already has a mix assigned to it, only a mix with the same id can be used to update");
                }
            }
        }
        const isNew = mix.id == "NEW";
        if (isNew) {
            mix.id = data.nextId++;
        }
        
        // Checking the validity of the new mix
        
        // Checking if all the imports are actually correct
        const availableImports   = await this.getAvailableImports(position);
        const unavailableImports = mix.imports.filter(
            imp => (
                !availableImports.some(otherImport => (
                    imp.equals(otherImport)
                    && imp.type == otherImport.type
                    && imp.nullable == otherImport.nullable
                ))
            )
        );
        if (unavailableImports.length > 0) {
            throw new BadRequestException(
                {
                    showable:  true,
                    errorType: PutMixShowableError.IMPORTS_UNAVAILABLE,
                    unavailableImports,
                    message:   "The new mix requires imports that are either not existing anymore or outside the scope it is put into"
                });
        }
        const orphanInputs =
                  mix.inputs.filter(
                      input =>
                          !mix.imports.some(imp => imp.uniqueName == input.name)
                  );
        if (orphanInputs.length > 0) {
            throw new BadRequestException(
                {
                    showable:  true,
                    errorType: PutMixShowableError.INPUTS_WITHOUT_IMPORT,
                    orphanInputs,
                    message:   "The new mix has some inputs that are not corresponding to its imports"
                });
        }
        
        // Checking if some outputs that have been deleted/edited are still needed downstream
        
        // TODO: Implement
        
        // Checking if the connections are correct
        if (mix.containsCycles()) {
            throw new BadRequestException(
                {
                    showable:  true,
                    errorType: PutMixShowableError.CYCLE,
                    message:   "The new mix has cycles that are reachable from the inputs"
                });
        }
        const wrongConnections: Connection[] = mix.wrongConnections;
        if (wrongConnections.length > 0) {
            throw new BadRequestException(
                {
                    showable:  true,
                    errorType: PutMixShowableError.WRONG_CONNECTIONS,
                    wrongConnections,
                    message:   "Some connections are not correct"
                });
        }
        
        if (isNew) {
            data.mixes.push(mix);
            if (position.phase == MixPhase.SENSORS) {
                if (position.target == MixTarget.DEVICE) {
                    await this.sensorService.setMixForSensor(position.sensorName, mix.id);
                } else { // MixTarget.GROUP
                    await this.groupService.setMixForGroup(position.groupName, mix.id, position.phase);
                }
            } else if (position.phase == MixPhase.ACTUATORS) {
                if (position.target == MixTarget.DEVICE) {
                    await this.actuatorService.setMixForActuator(position.actuatorName, mix.id);
                } else { // MixTarget.GROUP
                    await this.groupService.setMixForGroup(position.groupName, mix.id, position.phase);
                }
            } else { // MixPhase.CENTER
                // TODO: write logic for adding a mix in the center
                throw new InternalServerErrorException("Not yet implemented");
            }
        } else {
            const oldPos = data.mixes.findIndex(otherMix => otherMix.id == mix.id);
            if (oldPos != -1) {
                data.mixes.splice(oldPos, 1);
            }
            data.mixes.push(mix);
        }
        this.saveData();
        const newId = mix.id;
        if (newId == "NEW") {
            throw new InternalServerErrorException();
        }
        return newId;
    }
    
    public async getAvailableImports(position: MixPositionInfo): Promise<ExportedDatum[]> {
        
        const parameterData =
                  (await this.parameterService.getAllParameters())
                      .map((systemParameter): ExportedDatum => {
                          return new ExportedDatum(
                              systemParameter.name,
                              systemParameter.datum.type,
                              systemParameter.datum.nullable,
                              DatumOrigin.SYSTEM,
                              SystemOrigin.PARAMETER,
                              systemParameter.displayName
                          );
                      });
        const timerData     =
                  (await this.timersService.getAllTimers())
                      .map((timer): ExportedDatum => {
                          return new ExportedDatum(
                              timer.name,
                              DatumType.DATE_TIME,
                              false,
                              DatumOrigin.SYSTEM,
                              SystemOrigin.TIMER,
                              timer.displayName
                          );
                      });
        
        if (position.phase == MixPhase.SENSORS) {
            if (position.target == MixTarget.DEVICE) {
                const sensor = await this.sensorService.getSensorByName(position.sensorName);
                if (sensor == null) {
                    throw new NotFoundException(`Could not find sensor with name ${position.sensorName}`);
                }
                return [
                    ...parameterData,
                    ...timerData,
                    ...sensor
                        .exposes
                        .map(exposed =>
                                 new ExportedDatum(
                                     exposed.name,
                                     exposed.type,
                                     exposed.nullable,
                                     DatumOrigin.SENSOR_DATA,
                                     sensor.name,
                                     exposed.name,
                                     sensor.displayName
                                 ))
                ];
            } else { // MixTarget.GROUP
                const group = await this.groupService.getGroupByName(position.groupName);
                if (group == null) {
                    throw new NotFoundException(`Could not find group with name ${position.groupName}`);
                }
                const data        = await this.data;
                // It's a group in the sensor stage. We have to find all the outputs of the children's mixes and all the descending devices.
                const descendants = await this.groupService.getDescendingGroups(position.groupName);
                const sensorNames = descendants.flatMap(descendant => descendant.sensors);
                sensorNames.push(...group.sensors);
                const sensors                  = await this.sensorService.getSensorsByNames(sensorNames);
                const results: ExportedDatum[] = [];
                for (const descendant of descendants) {
                    if (descendant.sensorMix != null) {
                        const mix = data.mixes.find(otherMix => otherMix.id == descendant.sensorMix);
                        if (mix != null) {
                            results.push(...mix.outputs.map(
                                output =>
                                    new ExportedDatum(
                                        output.name,
                                        output.type,
                                        output.nullable,
                                        DatumOrigin.GROUP,
                                        descendant.name,
                                        output.name,
                                        descendant.displayName
                                    )
                            ));
                        }
                    }
                }
                for (const sensor of sensors) {
                    if (sensor.mix != null) {
                        results.push(
                            ...sensor
                                .exposes
                                .map(exposed =>
                                         new ExportedDatum(
                                             exposed.name,
                                             exposed.type,
                                             exposed.nullable,
                                             DatumOrigin.SENSOR_DATA,
                                             sensor.name,
                                             exposed.name,
                                             sensor.displayName
                                         )
                                )
                        )
                        const mix = data.mixes.find(otherMix => otherMix.id == sensor.mix);
                        if (mix != null) {
                            results.push(...mix.outputs.map(
                                output =>
                                    new ExportedDatum(
                                        output.name,
                                        output.type,
                                        output.nullable,
                                        DatumOrigin.SENSOR,
                                        sensor.name,
                                        output.name,
                                        sensor.displayName
                                    )
                            ));
                        }
                    }
                }
                return [
                    ...parameterData,
                    ...timerData,
                    ...results
                ];
            }
        }
        return [];
    }
    
    public async getMixPosition(id: number): Promise<MixPositionInfo> {
        const data = await this.data;
        if (data.mixes.every(mix => mix.id != id)) {
            throw new NotFoundException("Mix not found");
        }
        const sensor        = (await this.sensorService.getAllSensors({mix: id}))[0];
        const actuator      = (await this.actuatorService.getAllActuators({mix: id}))[0];
        const sensorGroup   = (await this.groupService.getAllGroups({sensorMix: id}))[0];
        const actuatorGroup = (await this.groupService.getAllGroups({actuatorMix: id}))[0];
        if (sensor != null) {
            return {
                phase:      MixPhase.SENSORS,
                target:     MixTarget.DEVICE,
                sensorName: sensor.name
            };
        }
        if (actuator != null) {
            return {
                phase:        MixPhase.ACTUATORS,
                target:       MixTarget.DEVICE,
                actuatorName: actuator.name
            };
        }
        if (sensorGroup != null) {
            return {
                phase:     MixPhase.SENSORS,
                target:    MixTarget.GROUP,
                groupName: sensorGroup.name
            };
        }
        if (actuatorGroup != null) {
            return {
                phase:     MixPhase.ACTUATORS,
                target:    MixTarget.GROUP,
                groupName: actuatorGroup.name
            };
        }
        // TODO: Check if it's not at the center, otherwise throw
        throw new NotFoundException("Mix not found");
    }
    
    public async getGraph(): Promise<MixingGraph> {
        const data = await this.data;
        const graph = new MixingGraph();
        
        const mixedGroups = await this.groupService.getAllGroups({ anyMixed: true });
        const mixedSensors = await this.sensorService.getAllSensors({ anyMixed: true});
        const mixedActuators = await this.actuatorService.getAllActuators({ anyMixed: true});
        
        //TODO we still need the mix in the middle
        
        for (const group of mixedGroups) {
            if (group.sensorMix != null) {
                const mix = data.mixes.find(otherMix => otherMix.id == group.sensorMix);
                if (mix != null) {
                    const graphGroup: MixingGraphGroup = new MixingGraphGroup(
                        group.name,
                        group.displayName,
                        true,
                        group.sensorMix
                    );
                    graph.sensorGroups.push(graphGroup);
                    this.extractMixingDependencies(mix, graph, graphGroup);
                }
            }
        }
        for (const sensor of mixedSensors) {
            if (sensor.mix != null) {
                const mix = data.mixes.find(otherMix => otherMix.id == sensor.mix);
                if (mix != null) {
                    const graphSensor: MixingGraphSensor = new MixingGraphSensor(
                        sensor.name,
                        sensor.displayName,
                        sensor.type,
                        sensor.mix
                    );
                    graph.sensors.push(graphSensor);
                    this.extractMixingDependencies(mix, graph, graphSensor);
                }
            }
            for (const actuator of mixedActuators) {
                if (actuator.mix != null) {
                    const mix = data.mixes.find(otherMix => otherMix.id == actuator.mix);
                    if (mix != null) {
                        const graphActuator: MixingGraphActuator = new MixingGraphActuator(
                            actuator.name,
                            actuator.displayName,
                            actuator.type,
                            actuator.mix
                        );
                        graph.actuators.push(graphActuator);
                        this.extractMixingDependencies(mix, graph, graphActuator);
                    }
                }
            }
        }
        return graph;
    }
    
    private extractMixingDependencies(mix: Mix, graph: MixingGraph, dependencyObject: {dependingOn: MixingGraphDependency[]}): void {
        for (const imp of mix.imports) {
            if (imp.origin == DatumOrigin.SYSTEM) {
                graph.addOrigin(DatumOrigin.SYSTEM);
                dependencyObject.dependingOn.push(new MixingGraphDependency(DatumOrigin.SYSTEM));
            } else if (imp.origin == DatumOrigin.SENSOR_DATA) {
                graph.addOrigin(DatumOrigin.SENSOR_DATA);
                dependencyObject.dependingOn.push(new MixingGraphDependency(DatumOrigin.SENSOR_DATA));
            } else if (imp.origin == DatumOrigin.GROUP) {
                graph.addOrigin(DatumOrigin.GROUP);
                dependencyObject.dependingOn.push(new MixingGraphDependency(DatumOrigin.GROUP, imp.originName));
            } else {
                graph.addOrigin(imp.origin);
                dependencyObject.dependingOn.push(new MixingGraphDependency(DatumOrigin.SENSOR, imp.originName));
            }
        }
    }
}

export default MixService;


class MixData {
    
    public mixes: Mix[];
    
    public nextId: number = 0;
    
    constructor(mixDataJSON?: MixDataJSON) {
        if (mixDataJSON) {
            this.mixes  = mixDataJSON.mixes.map((mixJSON: MixJSON) => Mix.fromJSON(mixJSON));
            this.nextId = mixDataJSON.nextId;
        } else {
            this.mixes  = [];
            this.nextId = 0;
        }
    }
    
    public toJSON(): MixDataJSON {
        return {
            mixes:  this.mixes.map((mix: Mix) => mix.toJSON()),
            nextId: this.nextId
        };
    }
    
}

interface MixDataJSON {
    mixes: MixJSON[];
    nextId: number;
}
