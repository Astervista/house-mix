import {Component, ElementRef, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {LoadingStatus} from '../../../utils/enums';
import {ConnectionDrainToNode, ConnectionDrainToOutput, ConnectionDrainType, ConnectionSourceFromConstant, ConnectionSourceType, Mix} from '@common/mixing/mix/mix';
import {firstValueFrom} from 'rxjs';
import {MixingService} from '../mixing.service';
import {Datum, DatumOrigin, DatumType, ExportedDatum} from '@common/mixing/mix/datum';
import {InputLibraryDialogComponent} from './input-library-dialog/input-library-dialog.component';
import {ElaborationNode, ElaborationNodeNullGuard} from '@common/mixing/mix/elaboration-node';
import {MEASURES, MixUiManager} from './mix-ui-manager';
import {MatFabButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {DatePipe} from '@angular/common';
import {ConstantEditDialogComponent} from './constant-edit-dialog/constant-edit-dialog.component';
import {ELABORATION_NODE_DISPLAY_NAME, getColorVarNameForType} from '../constants';
import {NodeLibraryDialogComponent} from './node-library-dialog/node-library-dialog.component';
import {DatumDefineDialogComponent} from '../../dialogs/datum-define-dialog/datum-define-dialog.component';
import {BetterMatDialog} from '../../../utils/better-mat-dialog';


@Component({
               selector:    'house-mix-mix',
               imports:     [
                   MatFabButton,
                   MatIcon,
                   DatePipe
               ],
               templateUrl: './mix.component.html',
               styleUrl:    './mix.component.scss'
           })
export class MixComponent implements OnInit {

    protected mixLoadingStatus: LoadingStatus = LoadingStatus.LOADING;
    protected mix: Mix | null                 = null;

    protected availableExports: ExportedDatum[] = [];

    protected inputLoadingStatus: LoadingStatus = LoadingStatus.LOADING;

    protected uiManager: MixUiManager = new MixUiManager();

    constructor(
        private route: ActivatedRoute,
        protected mixService: MixingService,
        private elementRef: ElementRef<HTMLElement>,
        private matDialog: BetterMatDialog
    ) {
        let id: number;
        firstValueFrom(this.route.queryParams)
            .then((params: Record<string, string>) => {
                const idParam = params['id'];
                if (idParam == null) {
                    throw new Error('Missing id parameter');
                }
                id = parseInt(idParam);
                if (isNaN(id) || !isFinite(id)) {
                    throw new Error('Invalid id parameter');
                }
                return mixService.getMix({id});
            })
            .then((mix) => {
                this.mix           = mix;
                this.uiManager.mix = mix;
            })
            .catch(
                () => {
                    this.mixLoadingStatus = LoadingStatus.ERROR;
                }
            )
            .then(() => {
                this.availableExports   = [
                    new ExportedDatum('Scene', DatumType.BOOLEAN, false, DatumOrigin.GROUP, 1),
                    new ExportedDatum('Scene', DatumType.TIME, false, DatumOrigin.GROUP, 2)
                ];
                this.inputLoadingStatus = LoadingStatus.LOADED;
            })
            .catch(() => {
                this.inputLoadingStatus = LoadingStatus.ERROR;
            });
    }

    public ngOnInit(): void {
        this.uiManager.translation.y = this.elementRef.nativeElement.offsetHeight / 2;
    }

    protected addInput(): void {
        const mix = this.mix;
        if (mix != null) {
            const unusedExports =
                      this
                          .availableExports
                          .filter(
                              exp => !mix.imports.some(imp => imp.equals(exp)));
            const dialogRef     = this.matDialog.open(InputLibraryDialogComponent, {data: unusedExports});
            dialogRef
                .afterClosed()
                .subscribe(selectedDatum => {
                    if (selectedDatum == null) {
                        return;
                    }
                    mix.imports.push(selectedDatum);
                    mix.inputs.push(new Datum(selectedDatum.uniqueName, selectedDatum.type, selectedDatum.nullable));
                });
        }
    }

    protected addNode(): void {
        if (this.mix) {
            const dialogRef = this.matDialog.open(NodeLibraryDialogComponent, {});
            dialogRef.afterClosed().subscribe(result => {
                if ((result != null) && (this.mix != null)) {
                    let newNode: ElaborationNode;
                    if (!result.special) {
                        newNode = new result.constructor(this.mix.nodes.length);
                    } else {
                        newNode = new ElaborationNodeNullGuard(this.mix.nodes.length, {dataType: result.datumType});
                    }
                    for (const input of newNode.inputs) {
                        if (!input.nullable) {
                            this.mix.connections.push(
                                {
                                    sourceType:         ConnectionSourceType.CONSTANT,
                                    sourceValue:        Datum.getDefaultForType(input.type),
                                    drainType:          ConnectionDrainType.NODE,
                                    drainNodeId:        newNode.id,
                                    drainNodeInputName: input.name
                                }
                            );
                        }
                    }
                    this.mix.nodes.push(newNode);
                    this.uiManager.addNode(newNode);
                }
            });
        }
    }

    protected addOutput(): void {
        const mix = this.mix;
        if (mix != null) {
            const dialogRef =
                      this
                          .matDialog
                          .open(
                              DatumDefineDialogComponent,
                              {
                                  data: {
                                      forbiddenNames: mix.outputs.map(input => input.name)
                                  }
                              }
                          );
            dialogRef
                .afterClosed()
                .subscribe(selectedDatum => {
                    if (selectedDatum == null) {
                        return;
                    }
                    mix.outputs.push(selectedDatum);
                });
        }
    }

    protected getConstantSourceForInput(node: ElaborationNode, input: Datum): (ConnectionSourceFromConstant & ConnectionDrainToNode) | null {
        if (this.mix != null) {
            return this.mix.connections.find(connection =>
                                                 connection.sourceType == ConnectionSourceType.CONSTANT
                                                 && connection.drainType == ConnectionDrainType.NODE
                                                 && connection.drainNodeId == node.id
                                                 && connection.drainNodeInputName == input.name
            ) as (ConnectionSourceFromConstant & ConnectionDrainToNode) | undefined ?? null;
        }
        return null;
    }


    protected getConstantSourceForExternalOutput(output: Datum): (ConnectionSourceFromConstant & ConnectionDrainToOutput) | null {
        if (this.mix != null) {
            return this.mix.connections.find(connection =>
                                                 connection.sourceType == ConnectionSourceType.CONSTANT
                                                 && connection.drainType == ConnectionDrainType.OUTPUT
                                                 && connection.outputName == output.name
            ) as (ConnectionSourceFromConstant & ConnectionDrainToOutput) | undefined ?? null;
        }
        return null;
    }

    protected inputCanBeChanged(node: ElaborationNode, input: Datum): boolean {
        if (this.mix == null) {
            return false;
        }
        return this
                   .mix
                   .connections
                   .find(a =>
                             a.sourceType != ConnectionSourceType.CONSTANT
                             && a.drainType == ConnectionDrainType.NODE
                             && a.drainNodeId == node.id
                             && a.drainNodeInputName == input.name
                   ) == null;
    }

    protected externalOutputCanBeChanged(output: Datum): boolean {
        if (this.mix == null) {
            return false;
        }
        return this
                   .mix
                   .connections
                   .find(a =>
                             a.sourceType != ConnectionSourceType.CONSTANT
                             && a.drainType == ConnectionDrainType.OUTPUT
                             && a.outputName == output.name
                   ) == null;
    }

    protected editNodeInputConstant(node: ElaborationNode, input: Datum): void {
        this.editConstant({external: false, node, datum: input});
    }

    protected clearNodeInputConstant(node: ElaborationNode, input: Datum): void {
        this.clearConstant({external: false, node, datum: input});
    }

    protected editExternalOutputConstant(output: Datum): void {
        this.editConstant({external: true, datum: output});
    }

    protected clearExternalOutputConstant(output: Datum): void {
        this.clearConstant({external: true, datum: output});
    }

    private editConstant(connector: { external: true, datum: Datum } | { external: false, node: ElaborationNode, datum: Datum }): void {
        if (this.mix == null) {
            return;
        }
        switch (connector.datum.type) {
            case DatumType.BOOLEAN: {
                if (!connector.external) {
                    const constantConnection: (ConnectionSourceFromConstant & ConnectionDrainToNode) | undefined =
                              this
                                  .mix
                                  .connections
                                  .find(a =>
                                            a.sourceType == ConnectionSourceType.CONSTANT
                                            && a.drainType == ConnectionDrainType.NODE
                                            && a.drainNodeId == connector.node.id
                                            && a.drainNodeInputName == connector.datum.name
                                  ) as (ConnectionSourceFromConstant & ConnectionDrainToNode) | undefined;
                    if (constantConnection != null) {
                        constantConnection.sourceValue = !(constantConnection.sourceValue as boolean);
                    } else {
                        this.mix.connections.push(
                            {
                                sourceType:         ConnectionSourceType.CONSTANT,
                                sourceValue:        true,
                                drainType:          ConnectionDrainType.NODE,
                                drainNodeId:        connector.node.id,
                                drainNodeInputName: connector.datum.name
                            }
                        );
                    }
                } else {
                    const constantConnection: (ConnectionSourceFromConstant & ConnectionDrainToOutput) | undefined =
                              this
                                  .mix
                                  .connections
                                  .find(a =>
                                            a.sourceType == ConnectionSourceType.CONSTANT
                                            && a.drainType == ConnectionDrainType.OUTPUT
                                            && a.outputName == connector.datum.name
                                  ) as (ConnectionSourceFromConstant & ConnectionDrainToOutput) | undefined;
                    if (constantConnection != null) {
                        constantConnection.sourceValue = !(constantConnection.sourceValue as boolean);
                    } else {
                        this.mix.connections.push(
                            {
                                sourceType:  ConnectionSourceType.CONSTANT,
                                sourceValue: true,
                                drainType:   ConnectionDrainType.OUTPUT,
                                outputName:  connector.datum.name
                            }
                        );
                    }
                }
                break;
            }
            case DatumType.NUMBER:
            case DatumType.TIME:
            case DatumType.DATE:
            case DatumType.DATE_TIME: {
                let constantConnection: (ConnectionSourceFromConstant & (ConnectionDrainToNode | ConnectionDrainToOutput)) | undefined;
                if (!connector.external) {
                    constantConnection = this
                        .mix
                        .connections
                        .find(a =>
                                  a.sourceType == ConnectionSourceType.CONSTANT
                                  && a.drainType == ConnectionDrainType.NODE
                                  && a.drainNodeId == connector.node.id
                                  && a.drainNodeInputName == connector.datum.name
                        ) as (ConnectionSourceFromConstant & ConnectionDrainToNode) | undefined;
                } else {
                    constantConnection = this
                        .mix
                        .connections
                        .find(a =>
                                  a.sourceType == ConnectionSourceType.CONSTANT
                                  && a.drainType == ConnectionDrainType.OUTPUT
                                  && a.outputName == connector.datum.name
                        ) as (ConnectionSourceFromConstant & ConnectionDrainToOutput) | undefined;
                }
                const dialogRef =
                          this.matDialog.open(
                              ConstantEditDialogComponent,
                              {
                                  data: {
                                      type:  connector.datum.type,
                                      value: constantConnection?.sourceValue ?? Datum.getDefaultForType(connector.datum.type)
                                  }
                              }
                          );
                dialogRef
                    .afterClosed()
                    .subscribe(
                        value => {
                            if (value?.successful == true) {
                                if (constantConnection != null) {
                                    constantConnection.sourceValue = value.value;
                                } else {
                                    if (!connector.external) {
                                        this.mix?.connections.push(
                                            {
                                                sourceType:         ConnectionSourceType.CONSTANT,
                                                sourceValue:        value.value,
                                                drainType:          ConnectionDrainType.NODE,
                                                drainNodeId:        connector.node.id,
                                                drainNodeInputName: connector.datum.name
                                            }
                                        );
                                    } else {
                                        this.mix?.connections.push(
                                            {
                                                sourceType:  ConnectionSourceType.CONSTANT,
                                                sourceValue: value.value,
                                                drainType:   ConnectionDrainType.OUTPUT,
                                                outputName:  connector.datum.name
                                            }
                                        );
                                    }
                                }
                            }
                        }
                    );
                break;
            }
        }
    }

    private clearConstant(connector: { external: true, datum: Datum } | { external: false, node: ElaborationNode, datum: Datum }): void {

        if (this.mix == null) {
            return;
        }
        if (connector.datum.nullable) {
            let constantConnection: (ConnectionSourceFromConstant & ConnectionDrainToNode) | undefined;
            if (!connector.external) {
                constantConnection =
                    this
                        .mix
                        .connections
                        .find(a =>
                                  a.sourceType == ConnectionSourceType.CONSTANT
                                  && a.drainType == ConnectionDrainType.NODE
                                  && a.drainNodeId == connector.node.id
                                  && a.drainNodeInputName == connector.datum.name
                        ) as (ConnectionSourceFromConstant & ConnectionDrainToNode) | undefined;
            } else {
                constantConnection =
                    this
                        .mix
                        .connections
                        .find(a =>
                                  a.sourceType == ConnectionSourceType.CONSTANT
                                  && a.drainType == ConnectionDrainType.OUTPUT
                                  && a.outputName == connector.datum.name
                        ) as (ConnectionSourceFromConstant & ConnectionDrainToNode) | undefined;
            }
            if (constantConnection != null) {
                this.mix.connections.splice(this.mix.connections.indexOf(constantConnection), 1);
            }
        }
    }

    protected readonly MEASURES: typeof MEASURES                           = MEASURES;
    protected readonly Math: Math                                          = Math;
    protected readonly getColorVarNameForType: (type: DatumType) => string = getColorVarNameForType;
    protected readonly ConnectionSourceType: typeof ConnectionSourceType   = ConnectionSourceType;
    protected readonly DatumType: typeof DatumType                         = DatumType;
    protected readonly Datum: typeof Datum                                 = Datum;
    protected readonly ELABORATION_NODE_DISPLAY_NAME                       = ELABORATION_NODE_DISPLAY_NAME;
}

