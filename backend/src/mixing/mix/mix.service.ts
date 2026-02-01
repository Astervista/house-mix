import {BadRequestException, ConflictException, forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException} from "@nestjs/common";
import {Connection, Mix, MixJSON} from "@common/mixing/mix/mix";
import {FileService} from "../../helpers/file/file.service";
import {PersistentDataService} from "../../helpers/file/persistent-data-service";
import {MixPhase, MixPositionInfo, MixTarget, PutMixShowableError, PutMixShowableErrorObject} from "@common/mixing/mix/rest-classes";
import {Datum, DatumOrigin, DatumType, ExportedDatum} from "@common/mixing/mix/datum";
import {ParametersService} from "../../system/parameters/parameters.service";
import {TimersService} from "src/system/timers/timers.service";
import {SystemOrigin} from "@common/system/constants";
import {SensorService} from "../../devices/sensor/sensor.service";
import {GroupService} from "../../devices/group/group.service";
import {ActuatorService} from "../../devices/actuator/actuator.service";
import {MixingGraph, MixingGraphActuator, MixingGraphCenter, MixingGraphDependency, MixingGraphGroup, MixingGraphSensor} from "@common/mixing/mixing-graph";
import {Group} from "@common/devices/group/group";
import {EntityType} from "@common/devices/constants";
import {Actuator} from "@common/devices/actuator/actuator";

const SAVE_FILE = "mixing/mix.json";

@Injectable()
class MixService extends PersistentDataService<MixData, MixDataJSON> {
    
    constructor(
        fileService: FileService,
        @Inject(forwardRef(() => ParametersService))
        private parameterService: ParametersService,
        @Inject(forwardRef(() => TimersService))
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
        
        if (mix.id != "NEW") {
            const oldPosition = await this.getMixPosition(mix.id);
            let notMatching   = false;
            if (oldPosition.phase != position.phase || oldPosition.target != position.target) {
                notMatching = true;
            } else if (oldPosition.phase == MixPhase.SENSORS && position.phase == MixPhase.SENSORS) {
                if (oldPosition.target == MixTarget.DEVICE && position.target == MixTarget.DEVICE) {
                    if (oldPosition.sensorName != position.sensorName) {
                        notMatching = true;
                    }
                }
                if (oldPosition.target == MixTarget.GROUP && position.target == MixTarget.GROUP) {
                    if (oldPosition.groupName != position.groupName) {
                        notMatching = true;
                    }
                }
            } else if (oldPosition.phase == MixPhase.ACTUATORS && position.phase == MixPhase.ACTUATORS) {
                if (oldPosition.target == MixTarget.DEVICE && position.target == MixTarget.DEVICE) {
                    if (oldPosition.actuatorName != position.actuatorName) {
                        notMatching = true;
                    }
                }
                if (oldPosition.target == MixTarget.GROUP && position.target == MixTarget.GROUP) {
                    if (oldPosition.groupName != position.groupName) {
                        notMatching = true;
                    }
                }
            } else if (oldPosition.phase == MixPhase.CENTER && position.phase == MixPhase.CENTER) {
                if (oldPosition.mixName != position.mixName) {
                    notMatching = true;
                }
            }
            if (notMatching) {
                throw new BadRequestException("Cannot set mix in a position different than its current one");
            }
        }
        
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
                actuator.exposes.forEach((output) => {
                    const correspondingOutput = mix.outputs.find(mixOutput => mixOutput.name == output.name);
                    if (correspondingOutput == null) {
                        mix.addOutput(Datum.fromJSON(output.toJSON()));
                    } else if (correspondingOutput.type != output.type || correspondingOutput.nullable != output.nullable) {
                        throw new BadRequestException("The mix's outputs don't correspond to the actuator's export");
                    }
                });
                if (
                    mix.outputs.some(
                        (output) => {
                            return actuator.exposes.every(exposed => exposed.name != output.name);
                        })
                ) {
                    throw new BadRequestException("The mix contains outputs that are not defined to the actuator's exports");
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
            const centerMix = data.centerMixes.find(otherMix => otherMix.name == position.mixName);
            oldMixId        = centerMix?.mixId ?? null;
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
        // Checking if inputs have unique names and imports are not doubled
        if (
            mix.inputs.some((input, index) => mix.inputs.findIndex(otherInput => otherInput.name == input.name) != index)
            || mix.imports.some((imp, index) => mix.imports.findIndex(otherImp => otherImp.sameIdentification(imp)) != index)
        ) {
            throw new BadRequestException("Some inputs or imports are duplicated");
        }
        // Checking if imports are part of the available imports for the position
        const availableImports   = await this.getAvailableImports(position);
        const unavailableImports = mix.imports.filter(
            imp => (
                !availableImports.some(otherImport => (
                    imp.sameIdentification(otherImport)
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
                } as PutMixShowableErrorObject);
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
                } as PutMixShowableErrorObject);
        }
        
        // Checking outputs
        // Checking if outputs are unique
        if (mix.outputs.some((output, index) =>
                                 mix.outputs.findIndex(otherOutput => otherOutput.name == output.name) != index)) {
            throw new BadRequestException("Some outputs are duplicated");
        }
        // Checking if some outputs that have been deleted/edited are still needed downstream
        const mixId = mix.id;
        if (!isNew && mixId != "NEW") {
            const oldMix = data.mixes.find(otherMix => otherMix.id == mixId);
            if (oldMix == null) {
                throw new BadRequestException("Cannot put a mix with an id that doesn't exist");
            }
            const deletedOrChanged: string[] = [];
            for (const output of oldMix.outputs) {
                const newVersion = mix.outputs.find(newOutput => newOutput.name == output.name);
                if ((newVersion == null) || (newVersion.type != output.type || newVersion.nullable != output.nullable)) {
                    deletedOrChanged.push(output.name);
                }
            }
            const dependingOutputs: Set<string> = new Set<string>;
            const centerMix                     = data.centerMixes.find(centerMixInfo => centerMixInfo.mixId == mixId);
            if (centerMix != null) {
                const undeletable = data
                    .mixes
                    .flatMap(otherMix =>
                                 otherMix
                                     .imports
                                     .filter(imp =>
                                                 this.importDependsOnCenter(imp, centerMix.name, deletedOrChanged)));
                undeletable.forEach((imp) => {
                    dependingOutputs.add(imp.name);
                });
            }
            const sensor = (await this.sensorService.getAllSensors({mix: mixId})).at(0);
            if (sensor != null) {
                const undeletable = data
                    .mixes
                    .filter(otherMix => otherMix.id != mixId)
                    .flatMap(otherMix =>
                                 otherMix
                                     .imports
                                     .filter(imp =>
                                                 this.importDependsOn(imp, [sensor.name], [], deletedOrChanged)));
                undeletable.forEach((imp) => {
                    dependingOutputs.add(imp.name);
                });
            }
            const sensorGroup = (await this.groupService.getAllGroups({sensorMix: mixId})).at(0);
            if (sensorGroup != null) {
                const mixedGroups    = await this.groupService.getAllGroups({anyMixed: true});
                const mixesToSkip    =
                          mixedGroups
                              .map(group => group.actuatorMix)
                              .filter(otherMixId => otherMixId != null);
                const mixedActuators = await this.actuatorService.getAllActuators({anyMixed: true});
                mixesToSkip.push(mixId);
                // If we want to check if a mix for a group in the sensor phase can be deleted,
                // we don't care if the group is imported by an actuator, because that must import
                // from the group in the actuator phase. So we ignore the actuator mixes altogether
                mixesToSkip.push(...mixedActuators.map(actuator => actuator.mix).filter(otherMixId => otherMixId != null));
                const undeletable = data
                    .mixes
                    .filter(otherMix =>
                                !mixesToSkip.includes(otherMix.id as number))
                    .flatMap(otherMix =>
                                 otherMix
                                     .imports
                                     .filter(imp =>
                                                 this.importDependsOn(imp, [], [sensorGroup.name], deletedOrChanged)));
                undeletable.forEach((imp) => {
                    dependingOutputs.add(imp.name);
                });
            }
            const actuatorGroup = (await this.groupService.getAllGroups({actuatorMix: mixId})).at(0);
            if (actuatorGroup != null) {
                const mixedGroups = await this.groupService.getAllGroups({anyMixed: true});
                const mixesToSkip =
                          mixedGroups
                              .map(group => group.sensorMix)
                              .filter(otherMixId => otherMixId != null);
                mixesToSkip.push(mixId);
                // If we want to check if a mix for a group in the actuator phase can be deleted,
                // we don't care if the group is imported by a center mix, because that must import
                // from the group in the sensor phase. So we ignore the central mixes altogether
                mixesToSkip.push(...data.centerMixes.map(centerMixInfo => centerMixInfo.mixId));
                const undeletable = data
                    .mixes
                    .filter(otherMix =>
                                !mixesToSkip.includes(otherMix.id as number))
                    .flatMap(otherMix =>
                                 otherMix
                                     .imports
                                     .filter(imp =>
                                                 this.importDependsOn(imp, [], [actuatorGroup.name], deletedOrChanged)));
                undeletable.forEach((imp) => {
                    dependingOutputs.add(imp.name);
                });
            }
            if (dependingOutputs.size > 0) {
                throw new ConflictException(
                    {
                        showable:         true,
                        errorType:        PutMixShowableError.OUTPUTS_IN_USE,
                        dependingOutputs: [...dependingOutputs],
                        message:          "Some outputs are used downstream by other mixes"
                    } as PutMixShowableErrorObject);
            }
        }
        
        // Checking if the connections are correct
        if (mix.containsCycles) {
            throw new BadRequestException(
                {
                    showable:  true,
                    errorType: PutMixShowableError.CYCLE,
                    message:   "The new mix has cycles that are reachable from the inputs"
                } as PutMixShowableErrorObject);
        }
        const wrongConnections: Connection[] = mix.wrongConnections;
        if (wrongConnections.length > 0) {
            throw new BadRequestException(
                {
                    showable:  true,
                    errorType: PutMixShowableError.WRONG_CONNECTIONS,
                    wrongConnections,
                    message:   "Some connections are not correct"
                } as PutMixShowableErrorObject);
        }
        if (mix.hasFreeNonNull) {
            throw new BadRequestException("The new mix has non-null inputs that are free-floating");
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
                if (mix.id == "NEW") {
                    throw new InternalServerErrorException();
                }
                data.centerMixes.push({
                                          name:        position.mixName,
                                          displayName: position.mixDisplayName,
                                          mixId:       mix.id
                                      });
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
                // It's a group in the sensor stage. We have to find all the outputs of the children's mixes and all the descending devices.
                return [
                    ...parameterData,
                    ...timerData,
                    ...await this.getGroupImportsInSensorPhase(group)
                ];
            }
        } else if (position.phase == MixPhase.CENTER) {
            return [
                ...parameterData,
                ...timerData,
                ...await this.getGroupImportsInSensorPhase(null)
            ];
        } else { // MixPhase.ACTUATORS
            const data             = await this.data;
            const centerMixOutputs = data.centerMixes
                                         .flatMap(centerMixInfo => {
                                             const mix = data.mixes.find(otherMix => otherMix.id == centerMixInfo.mixId);
                                             if (mix == null) {
                                                 return [];
                                             } else {
                                                 return mix.outputs.map((output): ExportedDatum => new ExportedDatum(
                                                     output.name,
                                                     output.type,
                                                     output.nullable,
                                                     DatumOrigin.CENTER,
                                                     centerMixInfo.name,
                                                     output.name,
                                                     centerMixInfo.name
                                                 ));
                                             }
                                         });
            if (position.target == MixTarget.GROUP) {
                const group = await this.groupService.getGroupByName(position.groupName);
                if (group == null) {
                    throw new NotFoundException(`Could not find group with name ${position.groupName}`);
                }
                // It's a group in the actuator stage. We have to find all the outputs of the parent's mixes
                return [
                    ...parameterData,
                    ...timerData,
                    ...centerMixOutputs,
                    ...await this.getGroupImportsInActuatorPhase(group)
                ];
            } else { // MixTarget.DEVICE
                const actuator = await this.actuatorService.getActuatorByName(position.actuatorName);
                if (actuator == null) {
                    throw new NotFoundException(`Could not find actuator with name ${position.actuatorName}`);
                }
                const group = await this.groupService.getActuatorGroup(actuator.name);
                return [
                    ...parameterData,
                    ...timerData,
                    ...centerMixOutputs,
                    ...(group != null ? await this.getGroupImportsInActuatorPhase(group, true) : [])
                ];
            }
        }
    }
    
    private async getGroupImportsInSensorPhase(restrictToGroup: Group | null): Promise<ExportedDatum[]> {
        const data = await this.data;
        let descendants: Group[];
        let sensorNames: string[];
        if (restrictToGroup != null) {
            descendants = await this.groupService.getDescendingGroups(restrictToGroup.name);
            sensorNames = descendants.flatMap(descendant => descendant.sensors);
            sensorNames.push(...restrictToGroup.sensors);
        } else {
            descendants = await this.groupService.getAllGroups();
            sensorNames = (await this.sensorService.getAllSensors()).map(sensor => sensor.name);
        }
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
            );
            if (sensor.mix != null) {
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
        return results;
    }
    
    private async getGroupImportsInActuatorPhase(group: Group, includeGroup: boolean = false): Promise<ExportedDatum[]> {
        const data      = await this.data;
        const ancestors = await this.groupService.getAncestorGroups(group.name);
        if (includeGroup) {
            ancestors.push(group);
        }
        const results: ExportedDatum[] = [];
        for (const ancestor of ancestors) {
            if (ancestor.actuatorMix != null) {
                const mix = data.mixes.find(otherMix => otherMix.id == ancestor.actuatorMix);
                if (mix != null) {
                    results.push(...mix.outputs.map(
                        output =>
                            new ExportedDatum(
                                output.name,
                                output.type,
                                output.nullable,
                                DatumOrigin.GROUP,
                                ancestor.name,
                                output.name,
                                ancestor.displayName
                            )
                    ));
                }
            }
        }
        return results;
    }
    
    public async getMixPosition(id: number): Promise<MixPositionInfo> {
        const data = await this.data;
        if (data.mixes.every(mix => mix.id != id)) {
            throw new NotFoundException("Mix not found");
        }
        const sensor = (await this.sensorService.getAllSensors({mix: id}))[0];
        if (sensor != null) {
            return {
                phase:             MixPhase.SENSORS,
                target:            MixTarget.DEVICE,
                sensorName:        sensor.name,
                sensorDisplayName: sensor.displayName
            };
        }
        const sensorGroup = (await this.groupService.getAllGroups({sensorMix: id}))[0];
        if (sensorGroup != null) {
            return {
                phase:            MixPhase.SENSORS,
                target:           MixTarget.GROUP,
                groupName:        sensorGroup.name,
                groupDisplayName: sensorGroup.displayName
            };
        }
        const center = data.centerMixes.find(mixInfo => mixInfo.mixId == id);
        if (center != null) {
            return {
                phase:          MixPhase.CENTER,
                target:         MixTarget.CENTER,
                mixName:        center.name,
                mixDisplayName: center.displayName
            };
        }
        const actuatorGroup = (await this.groupService.getAllGroups({actuatorMix: id}))[0];
        if (actuatorGroup != null) {
            return {
                phase:            MixPhase.ACTUATORS,
                target:           MixTarget.GROUP,
                groupName:        actuatorGroup.name,
                groupDisplayName: actuatorGroup.displayName
            };
        }
        const actuator = (await this.actuatorService.getAllActuators({mix: id}))[0];
        if (actuator != null) {
            return {
                phase:               MixPhase.ACTUATORS,
                target:              MixTarget.DEVICE,
                actuatorName:        actuator.name,
                actuatorDisplayName: actuator.displayName
            };
        }
        throw new NotFoundException("Mix not found");
    }
    
    public async getGraph(): Promise<MixingGraph> {
        const data  = await this.data;
        const graph = new MixingGraph();
        
        const mixedGroups    = await this.groupService.getAllGroups({anyMixed: true});
        const mixedSensors   = await this.sensorService.getAllSensors({anyMixed: true});
        const mixedActuators = await this.actuatorService.getAllActuators({anyMixed: true});
        const centerMixes    = data.centerMixes;
        
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
            if (group.actuatorMix != null) {
                const mix = data.mixes.find(otherMix => otherMix.id == group.actuatorMix);
                if (mix != null) {
                    const graphGroup: MixingGraphGroup = new MixingGraphGroup(
                        group.name,
                        group.displayName,
                        false,
                        group.actuatorMix
                    );
                    graph.actuatorGroups.push(graphGroup);
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
        for (const centerMix of centerMixes) {
            const mix = data.mixes.find(otherMix => otherMix.id == centerMix.mixId);
            if (mix != null) {
                const graphCenter: MixingGraphCenter = new MixingGraphCenter(
                    centerMix.name,
                    centerMix.displayName,
                    centerMix.mixId
                );
                graph.centers.push(graphCenter);
                this.extractMixingDependencies(mix, graph, graphCenter);
            }
        }
        return graph;
    }
    
    private extractMixingDependencies(mix: Mix, graph: MixingGraph, dependencyObject: { dependingOn: MixingGraphDependency[] }): void {
        for (const imp of mix.imports) {
            switch (imp.origin) {
                case DatumOrigin.SYSTEM:
                    graph.addOrigin(DatumOrigin.SYSTEM);
                    dependencyObject.dependingOn.push(new MixingGraphDependency(DatumOrigin.SYSTEM));
                    break;
                case DatumOrigin.CENTER:
                    graph.addOrigin(DatumOrigin.CENTER);
                    dependencyObject.dependingOn.push(new MixingGraphDependency(DatumOrigin.CENTER, imp.originName));
                    break;
                case DatumOrigin.SENSOR_DATA:
                    graph.addOrigin(DatumOrigin.SENSOR_DATA);
                    dependencyObject.dependingOn.push(new MixingGraphDependency(DatumOrigin.SENSOR_DATA, imp.originName));
                    break;
                case DatumOrigin.GROUP:
                    graph.addOrigin(DatumOrigin.GROUP);
                    dependencyObject.dependingOn.push(new MixingGraphDependency(DatumOrigin.GROUP, imp.originName));
                    break;
                case DatumOrigin.SENSOR:
                    graph.addOrigin(DatumOrigin.SENSOR);
                    dependencyObject.dependingOn.push(new MixingGraphDependency(DatumOrigin.SENSOR, imp.originName));
                    break;
            }
        }
    }
    
    public async getCenterMixes(): Promise<{ name: string, mixId: number }[]> {
        return (await this.data).centerMixes;
    }
    
    /**
     * Checks if a mix has an import depending on a specific external datum
     *
     * @param {DatumOrigin} origin - The origin type of the dependency to check.
     * @param {string} originName - The name of the origin associated with the dependency.
     * @param {string} name - The single input name to check.
     * @return {Promise<boolean>} Whether the dependency exists.
     */
    public async dependencyExists(origin: DatumOrigin, originName: string, name: string): Promise<boolean> {
        const data = await this.data;
        for (const mix of data.mixes) {
            for (const imp of mix.imports) {
                if (imp.origin == origin && imp.originName == originName && imp.name == name) {
                    return true;
                }
            }
        }
        return false;
    }
    
    /**
     * Returns all the mixes that have an import depending on a specific external datum
     *
     * @param {DatumOrigin} origin - The origin type of the dependency to check.
     * @param {string} originName - The name of the origin associated with the dependency.
     * @param {string} name - The single input name to check.
     * @return {Promise<Mix[]>} The depending mixes.
     */
    public async getDependingMixes(origin: DatumOrigin, originName: string, name: string): Promise<Mix[]> {
        const data = await this.data;
        return data.mixes.filter(mix =>
                                     mix.imports.some(imp => imp.origin == origin && imp.originName == originName && imp.name == name)
        );
    }
    
    public async removeOutputFromMix(mixId: number, outputName: string): Promise<void> {
        const data = await this.data;
        const mix  = data.mixes.find(otherMix => otherMix.id == mixId);
        if (mix == null) {
            throw new NotFoundException();
        }
        const datum = mix.outputs.find(otherDatum => otherDatum.name == outputName);
        if (datum != null) {
            mix.removeOutput(datum);
        }
        this.saveData();
    }
    
    public async sensorRenamed(oldName: string, newName: string, newDisplayName: string): Promise<void> {
        const data = await this.data;
        for (const mix of data.mixes) {
            mix.renameImportOriginName(DatumOrigin.SENSOR, oldName, newName, newDisplayName);
            mix.renameImportOriginName(DatumOrigin.SENSOR_DATA, oldName, newName, newDisplayName);
        }
        this.saveData();
    }
    
    public async groupRenamed(oldName: string, newName: string, newDisplayName: string): Promise<void> {
        const data = await this.data;
        for (const mix of data.mixes) {
            mix.renameImportOriginName(DatumOrigin.GROUP, oldName, newName, newDisplayName);
        }
        this.saveData();
    }
    
    /**
     * Determines the groups available for a given group/sensor to be moved in, taking into account dependencies
     * and restrictions from the parent chain of the group, and from the descending group and sensors. This only returns the groups
     * restricted by the status of mixes on the sensor side
     *
     * @param {string} entityType - Whether the entity is a sensor or a group.
     * @param {string} entityName - The name of the group for which to fetch available groups.
     * @return {Promise<{available: (Group | null)[], blocking: Group | null, unreachableMix: Mix | null, dependingMix: Mix | null}>} A promise that resolves to an object containing:
     * - `available`: An array of groups that the sensor/group can be a part of. If no restrictions are found, all groups are returned.
     *                `null` means it can be put in the system's root
     * - `blocking`: The group that is currently blocking further participation, if any. Otherwise, it's null.
     * - `unreachableMix`: The mix on the blocking group that would become unreachable, if any.
     * - `dependingMix`: The mix within the moving entity (or its descendants) that depends on the blocking group, if any.
     */
    public async sensorMixAvailableGroups(
        entityType: EntityType.SENSOR | EntityType.GROUP, entityName: string
    ): Promise<{
        available: (Group | null)[],
        blocking: Group | null,
        unreachableMix: Mix | null,
        dependingMix: Mix | null
    }> {
        const data                          = await this.data;
        const parentChain: (Group | null)[] = [...await this.groupService.getParentChain(entityType, entityName), null];
        let descendingGroupNames: string[]  = [];
        let descendingSensorNames: string[] = [];
        if (entityType == EntityType.SENSOR) {
            descendingSensorNames.push(entityName);
        } else {
            const descendingGroups  = await this.groupService.getDescendingGroups(entityName);
            const descendingSensors = await this.sensorService.getSensorsByNames(descendingGroups.flatMap(group => group.sensors));
            descendingGroupNames    = descendingGroups.map(g => g.name);
            descendingSensorNames   = descendingSensors.map(s => s.name);
            descendingGroupNames.push(entityName);
        }
        let nearestDepending: Group | null          = null;
        let nearestDependingMixUpstream: Mix | null = null;
        
        for (const ancestor of parentChain) {
            if (ancestor == null) {
                // We have reached the root node: it means we have finished
                break;
            }
            if (ancestor.sensorMix != null) {
                const mixToCheck = data.mixes.find(otherMix => otherMix.id == ancestor.sensorMix);
                if (mixToCheck != null) {
                    // We check if the parent is referencing in its input any sensor data from the sensor/descending sensors or the outputs of its mix (the imports are from SENSOR or
                    // SENSOR_DATA with originName as the name of the sensor), or referencing any output of the mix from the group/descending groups
                    if (mixToCheck
                        .imports
                        .some((imp) => this.importDependsOn(imp, descendingSensorNames, descendingGroupNames)
                        )
                    ) {
                        nearestDepending            = ancestor;
                        nearestDependingMixUpstream = mixToCheck;
                        
                        break;
                    }
                }
            }
        }
        if (nearestDepending == null) {
            return {available: [null, ...(await this.groupService.getAllGroups())], blocking: null, unreachableMix: null, dependingMix: null};
        } else {
            return {
                available:      [nearestDepending, ...(await this.groupService.getDescendingGroups(nearestDepending.name))],
                blocking:       nearestDepending,
                unreachableMix: nearestDependingMixUpstream,
                dependingMix:   null
            };
        }
    }
    
    
    private importDependsOn(imp: ExportedDatum, sensorNames: string[], groupNames: string[], outputsToCheck?: string[]): boolean {
        if (outputsToCheck == null) {
            return (
                       (
                           imp.origin == DatumOrigin.SENSOR_DATA
                           || imp.origin == DatumOrigin.SENSOR
                       )
                       && sensorNames.includes(imp.originName)
                   ) || (
                       imp.origin == DatumOrigin.GROUP
                       && groupNames.includes(imp.originName)
                   );
        } else {
            return (
                       (
                           imp.origin == DatumOrigin.SENSOR_DATA
                           || imp.origin == DatumOrigin.SENSOR
                       )
                       && sensorNames.includes(imp.originName)
                       && outputsToCheck.includes(imp.name)
                   ) || (
                       imp.origin == DatumOrigin.GROUP
                       && groupNames.includes(imp.originName)
                       && outputsToCheck.includes(imp.name)
                   );
        }
    }
    
    private importDependsOnCenter(imp: ExportedDatum, centerName: string, outputsToCheck?: string[]): boolean {
        if (outputsToCheck == null) {
            return (
                imp.origin == DatumOrigin.CENTER
                && imp.originName == centerName
            );
        } else {
            return (
                imp.origin == DatumOrigin.CENTER
                && imp.originName == centerName
                && outputsToCheck.includes(imp.name)
            );
        }
    }
    
    /**
     * Determines the groups available for a given group/actuator to be moved in, taking into account dependencies
     * and restrictions from the parent chain of the group, and from the descending group and actuators. This only returns the groups
     * restricted by the status of mixes on the actuator side
     *
     * @param {string} entityType - Whether the entity is an actuator or a group.
     * @param {string} entityName - The name of the actuator or group for which to fetch available groups.
     * @return {Promise<{available: (Group | null)[], blocking: Group | null, unreachableMix: Mix | null, dependingMix: Mix | null}>} A promise that resolves to an object containing:
     * - `available`: An array of groups that the actuator/group can be a part of. If no restrictions are found, all groups are returned.
     *                `null` means it can be put in the system's root
     * - `blocking`: The group that is currently blocking further participation, if any. Otherwise, it's null.
     * - `unreachableMix`: The mix on the blocking group that would become unreachable, if any.
     * - `dependingMix`: The mix within the moving entity (or its descendants) that depends on the blocking group, if any.
     */
    public async actuatorMixAvailableGroups(
        entityType: EntityType.ACTUATOR | EntityType.GROUP,
        entityName: string
    ): Promise<{
        available: (Group | null)[],
        blocking: Group | null,
        unreachableMix: Mix | null,
        dependingMix: Mix | null
    }> {
        const data                          = await this.data;
        const parentChain: Group[]          = await this.groupService.getParentChain(entityType, entityName);
        let descendingGroups: Group[]       = [];
        let descendingActuators: Actuator[] = [];
        if (entityType == EntityType.ACTUATOR) {
            const actuator = await this.actuatorService.getActuatorByName(entityName);
            if (actuator == null) {
                throw new NotFoundException();
            }
            descendingActuators.push(actuator);
        } else {
            descendingGroups = await this.groupService.getDescendingGroups(entityName);
            const group      = await this.groupService.getGroupByName(entityName);
            if (group == null) {
                throw new NotFoundException();
            }
            descendingGroups.push(group);
            descendingActuators = await this
                .actuatorService
                .getActuatorsByName(
                    descendingGroups
                        .flatMap(otherGroup => otherGroup.actuators)
                );
        }
        const mixesToCheck: { mix: Mix, entity: Group | Actuator }[] = [];
        for (const group of descendingGroups) {
            if (group.actuatorMix != null) {
                const mixToCheck = data.mixes.find(otherMix => otherMix.id == group.actuatorMix);
                if (mixToCheck != null) {
                    mixesToCheck.push({mix: mixToCheck, entity: group});
                }
            }
        }
        for (const actuator of descendingActuators) {
            const mixToCheck = data.mixes.find(otherMix => otherMix.id == actuator.mix);
            if (mixToCheck != null) {
                mixesToCheck.push({mix: mixToCheck, entity: actuator});
            }
        }
        let lowerDepending: number | null             = null;
        let nearestDepending: Group | null            = null;
        let nearestDependingMixDownstream: Mix | null = null;
        let nearestDependingMixUpstream: Mix | null   = null;
        for (const mixToCheck of mixesToCheck) {
            const collisions = mixToCheck
                .mix
                .imports
                .filter(
                    imp =>
                        (
                            imp.origin == DatumOrigin.GROUP
                            &&
                            parentChain.some(parent => parent.name == imp.originName)
                        )
                );
            for (const collision of collisions) {
                const dependingIndex  = parentChain.findIndex(parent => parent.name == collision.originName);
                const dependingParent = parentChain[dependingIndex];
                if ((dependingIndex == -1) || (dependingParent == null)) {
                    continue;
                }
                if (lowerDepending == null || dependingIndex < lowerDepending) {
                    lowerDepending                = dependingIndex;
                    nearestDepending              = dependingParent;
                    nearestDependingMixDownstream = mixToCheck.mix;
                    nearestDependingMixUpstream   = data.mixes.find(otherMix => otherMix.id == dependingParent.actuatorMix) ?? null;
                }
            }
        }
        if (nearestDepending == null) {
            return {
                available:      [null, ...(await this.groupService.getAllGroups())],
                blocking:       null,
                dependingMix:   null,
                unreachableMix: null
            };
        } else {
            return {
                available:      [nearestDepending, ...(await this.groupService.getDescendingGroups(nearestDepending.name))],
                blocking:       nearestDepending,
                dependingMix:   nearestDependingMixDownstream,
                unreachableMix: nearestDependingMixUpstream
            };
        }
    }
    
    public async canDelete(entityType: EntityType, name: string, excludeMixes: (number | "NEW")[] = []): Promise<boolean> {
        const data = await this.data;
        switch (entityType) {
            case EntityType.GROUP: {
                const groupArray = [name];
                return !data.mixes.some(
                    mix => !excludeMixes.includes(mix.id) && mix.imports.some(
                        imp => this.importDependsOn(imp, [], groupArray)
                    )
                );
            }
            case EntityType.ACTUATOR:
                return true;
            case EntityType.SENSOR: {
                const sensorArray = [name];
                return !data.mixes.some(
                    mix => !excludeMixes.includes(mix.id) && mix.imports.some(
                        imp => this.importDependsOn(imp, sensorArray, [])
                    )
                );
            }
        }
    }
    
    public async deleteLocks(entityType: EntityType, name: string, excludeMixes: (number | "NEW")[] = []): Promise<MixPositionInfo[]> {
        const data = await this.data;
        let mixes: Mix[];
        switch (entityType) {
            case EntityType.GROUP: {
                const group = await this.groupService.getGroupByName(name);
                if (group == null) {
                    throw new NotFoundException();
                }
                const groupArray = [name];
                mixes            = data.mixes.filter(
                    mix => !excludeMixes.includes(mix.id) && mix.imports.some(
                        imp => this.importDependsOn(imp, [], groupArray)
                    )
                );
                if (group.actuatorMix != null) {
                    const mix = data.mixes.find(otherMix => otherMix.id == group.actuatorMix);
                    if (mix != null) {
                        mixes.push(mix);
                    }
                }
                if (group.sensorMix != null) {
                    const mix = data.mixes.find(otherMix => otherMix.id == group.sensorMix);
                    if (mix != null) {
                        mixes.push(mix);
                    }
                }
                break;
            }
            case EntityType.ACTUATOR: {
                const actuator = await this.actuatorService.getActuatorByName(name);
                if (actuator == null) {
                    throw new NotFoundException();
                }
                if (actuator.mix != null) {
                    const mix = data.mixes.find(otherMix => otherMix.id == actuator.mix);
                    if (mix != null) {
                        mixes = [mix];
                        break;
                    }
                }
                mixes = [];
                break;
            }
            case EntityType.SENSOR: {
                const sensor = await this.sensorService.getSensorByName(name);
                if (sensor == null) {
                    throw new NotFoundException();
                }
                const sensorArray = [name];
                mixes             = data.mixes.filter(
                    mix => !excludeMixes.includes(mix.id) && mix.imports.some(
                        imp => this.importDependsOn(imp, sensorArray, [])
                    )
                );
                if (sensor.mix != null) {
                    const mix = data.mixes.find(otherMix => otherMix.id == sensor.mix);
                    if (mix != null) {
                        mixes.push(mix);
                        break;
                    }
                }
                break;
            }
        }
        const result: MixPositionInfo[] = [];
        for (const mix of mixes) {
            if (mix.id != "NEW") {
                result.push(await this.getMixPosition(mix.id));
            }
        }
        return result;
    }
    
    public async deleteMix(mixId: number, avoidCorrectnessCheck: boolean = false): Promise<void> {
        const data  = await this.data;
        const index = data.mixes.findIndex(otherMix => otherMix.id == mixId);
        if (index == -1) {
            throw new NotFoundException();
        }
        if (!avoidCorrectnessCheck) {
            const centerMix = data.centerMixes.find(centerMixInfo => centerMixInfo.mixId == mixId);
            if (centerMix != null) {
                if (data
                    .mixes
                    .some(mix =>
                              mix
                                  .imports
                                  .some(imp =>
                                            this.importDependsOnCenter(imp, centerMix.name)))) {
                    throw new ConflictException(`Cannot delete the mix, something depends on it`);
                }
                data.centerMixes.splice(data.centerMixes.indexOf(centerMix), 1);
            }
            const sensor = (await this.sensorService.getAllSensors({mix: mixId})).at(0);
            if (sensor != null) {
                if (data
                    .mixes
                    .some(mix =>
                              mix.id != mixId
                              && mix
                                  .imports
                                  .some(imp =>
                                            this.importDependsOn(imp, [sensor.name], [])))) {
                    throw new ConflictException(`Cannot delete the mix, something depends on it`);
                }
                await this.sensorService.removeMixFromSensor(sensor.name);
            }
            const sensorGroup = (await this.groupService.getAllGroups({sensorMix: mixId})).at(0);
            if (sensorGroup != null) {
                const mixedGroups    = await this.groupService.getAllGroups({anyMixed: true});
                const mixesToSkip    =
                          mixedGroups
                              .map(group => group.actuatorMix)
                              .filter(otherMixId => otherMixId != null);
                const mixedActuators = await this.actuatorService.getAllActuators({anyMixed: true});
                mixesToSkip.push(mixId);
                // If we want to check if a mix for a group in the sensor phase can be deleted,
                // we don't care if the group is imported by an actuator, because that must import
                // from the group in the actuator phase. So we ignore the actuator mixes altogether
                mixesToSkip.push(...mixedActuators.map(actuator => actuator.mix).filter(otherMixId => otherMixId != null));
                if (data
                    .mixes
                    .some(mix =>
                              !mixesToSkip.includes(mix.id as number)
                              && mix
                                  .imports
                                  .some(imp =>
                                            this.importDependsOn(imp, [], [sensorGroup.name])))) {
                    throw new ConflictException(`Cannot delete the mix, something depends on it`);
                }
                await this.groupService.removeSensorMixFromGroup(sensorGroup.name);
            }
            const actuatorGroup = (await this.groupService.getAllGroups({actuatorMix: mixId})).at(0);
            if (actuatorGroup != null) {
                const mixedGroups = await this.groupService.getAllGroups({anyMixed: true});
                const mixesToSkip =
                          mixedGroups
                              .map(group => group.sensorMix)
                              .filter(otherMixId => otherMixId != null);
                mixesToSkip.push(mixId);
                // If we want to check if a mix for a group in the actuator phase can be deleted,
                // we don't care if the group is imported by a center mix, because that must import
                // from the group in the sensor phase. So we ignore the central mixes altogether
                mixesToSkip.push(...data.centerMixes.map(centerMixInfo => centerMixInfo.mixId));
                if (data
                    .mixes
                    .some(mix =>
                              !mixesToSkip.includes(mix.id as number)
                              && mix
                                  .imports
                                  .some(imp =>
                                            this.importDependsOn(imp, [], [actuatorGroup.name])))) {
                    throw new ConflictException(`Cannot delete the mix, something depends on it`);
                }
                await this.groupService.removeActuatorMixFromGroup(actuatorGroup.name);
            }
            const actuator = (await this.actuatorService.getAllActuators({mix: mixId})).at(0);
            if (actuator != null) {
                // Don't need to check for dependencies, actuators cannot have any
                await this.actuatorService.removeMixFromActuator(actuator.name);
            }
        }
        data.mixes.splice(index, 1);
        this.saveData();
    }
    
}

export default MixService;


class MixData {
    
    public mixes: Mix[];
    
    public nextId: number = 0;
    
    public centerMixes: { name: string, displayName: string, mixId: number }[] = [];
    
    constructor(mixDataJSON?: MixDataJSON) {
        if (mixDataJSON) {
            this.mixes  = mixDataJSON.mixes.map((mixJSON: MixJSON) => Mix.fromJSON(mixJSON));
            this.nextId = mixDataJSON.nextId;
        } else {
            this.mixes  = [];
            this.nextId = 0;
        }
        this.centerMixes = mixDataJSON?.centerMixes ?? [];
    }
    
    public toJSON(): MixDataJSON {
        return {
            mixes:       this.mixes.map((mix: Mix) => mix.toJSON()),
            nextId:      this.nextId,
            centerMixes: this.centerMixes
        };
    }
    
}

interface MixDataJSON {
    mixes: MixJSON[];
    nextId: number;
    centerMixes?: { name: string, displayName: string, mixId: number }[];
}
