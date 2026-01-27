import {Component, ElementRef, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {LoadingStatus} from '../../../utils/enums';
import {Connection, ConnectionDrainToNode, ConnectionDrainToOutput, ConnectionDrainType, ConnectionSourceFromConstant, ConnectionSourceType, Mix} from '@common/mixing/mix/mix';
import {connectable, firstValueFrom} from 'rxjs';
import {MixingService} from '../mixing.service';
import {Datum, DatumType, ExportedDatum} from '@common/mixing/mix/datum';
import {InputLibraryDialogComponent} from './input-library-dialog/input-library-dialog.component';
import {ElaborationNode, ElaborationNodeNullGuard} from '@common/mixing/mix/elaboration-node';
import {DATUM_ORIGIN_DISPLAY, ELABORATION_NODE_DISPLAY_NAME, getColorVarNameForType, getExternalDatumOriginNameDisplay, graphConnectionSmoothPath, MEASURES} from '../constants';
import {MixUiManager} from './mix-ui-manager';
import {MatButton} from '@angular/material/button';
import {DatePipe, Location} from '@angular/common';
import {ConstantEditDialogComponent} from './constant-edit-dialog/constant-edit-dialog.component';
import {NodeLibraryDialogComponent} from './node-library-dialog/node-library-dialog.component';
import {DatumDefineDialogComponent} from '../../dialogs/datum-define-dialog/datum-define-dialog.component';
import {BetterMatDialog} from '../../../utils/better-mat-dialog';
import {createMixInfo, MixPositionInfo, MixPositionInfoJSON} from '@common/mixing/mix/rest-classes';
import {LoadingScrimComponent} from '../../auxiliary/loading-scrim/loading-scrim.component';
import {DynamicSvgComponent} from '../../auxiliary/dynamic-svg/dynamic-svg.component';
import {HttpErrorResponse} from '@angular/common/http';
import {ToolbarComponent, ToolbarElement, ToolBarElementType} from '../../auxiliary/toolbar/toolbar.component';

@Component({
               selector:    'house-mix-mix',
               imports:     [
                   DatePipe,
                   LoadingScrimComponent,
                   DynamicSvgComponent,
                   MatButton,
                   ToolbarComponent
               ],
               templateUrl: './mix.component.html',
               styleUrl:    './mix.component.scss'
           })
export class MixComponent implements OnInit {

    protected mix: Mix | null = null;

    protected availableImports: ExportedDatum[] = [];

    protected uiManager: MixUiManager = new MixUiManager();

    protected mixPosition?: MixPositionInfo;

    protected loadingStatus: LoadingStatus = LoadingStatus.LOADING;

    protected errorType: 'NOT_FOUND' | 'INTERNAL' = 'NOT_FOUND';

    protected selectedElements: SelectedElement[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        protected mixService: MixingService,
        private elementRef: ElementRef<HTMLElement>,
        private matDialog: BetterMatDialog,
        protected location: Location
    ) {
        let id: number | 'NEW' = 'NEW';
        firstValueFrom(this.route.params)
            .then(
                params => {
                    const idParam: string | null = typeof params['mixId'] == 'string' ? params['mixId'] : null;
                    if (idParam == null) {
                        const error = new Error('Missing id parameter');
                        error.cause = 'ID_PARAMETER_MISSING';
                        throw error;
                    }
                    if (idParam == 'new') {
                        id = 'NEW';
                    } else {
                        id = parseInt(idParam);
                        if (isNaN(id) || !isFinite(id)) {
                            const error = new Error('Invalid id parameter');
                            error.cause = 'ID_PARAMETER_INVALID';
                            throw error;
                        }
                    }
                })
            .then(
                () => firstValueFrom(this.route.queryParams)
            )
            .then(
                async (params: Record<string, string>) => {
                    if (id == 'NEW') {
                        const mixInfo = createMixInfo(params);
                        if (mixInfo == null) {
                            const error = new Error('Wrong mix position info');
                            error.cause = 'WRONG_MIX_POSITION';
                            throw error;
                        }
                        this.mixPosition = mixInfo;
                        return new Mix('NEW');
                    } else {
                        return mixService.getMix({id});
                    }
                })
            .then(
                async (mix) => {
                    // TODO: put this back after creating save states

                    /*                    await this.router.navigate(
                     [],
                     {
                     relativeTo:          this.route,
                     queryParams:         {},
                     queryParamsHandling: 'replace'
                     }
                     );*/
                    this.mix           = mix;
                    this.uiManager.mix = mix;
                    if (id == 'NEW') {
                        return this.mixPosition;
                    } else {
                        return mixService.getMixPositionInfo({id});
                    }
                })
            .then(
                (mixPosition) => {
                    this.mixPosition = mixPosition;
                })
            .then(
                () => {
                    if (this.mixPosition && this.mix) {
                        return this.mixService.getAvailableImports(MixPositionInfoJSON.toJSON(this.mixPosition))
                                   .then((imports) => {
                                       this.availableImports = imports;
                                   });
                    } else {
                        throw new Error();
                    }
                })
            .then(
                () => {
                    this.loadingStatus = LoadingStatus.LOADED;
                })
            .catch(
                (error: unknown) => {
                    this.loadingStatus = LoadingStatus.ERROR;
                    console.error(error);
                    if (error instanceof HttpErrorResponse) {
                        if (error.status == 404) {
                            this.errorType = 'NOT_FOUND';
                            return;
                        }
                    }
                    if (error instanceof Error) {
                        if (typeof error.cause == 'string'
                            && [
                                'ID_PARAMETER_MISSING',
                                'ID_PARAMETER_INVALID'
                            ].includes(error.cause)) {
                            this.errorType = 'NOT_FOUND';
                            return;
                        }
                    }
                    this.errorType = 'INTERNAL';
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
                          .availableImports
                          .filter(
                              exp => !mix.imports.some(imp => imp.equals(exp)));
            const dialogRef     = this.matDialog.open(InputLibraryDialogComponent, {data: unusedExports});
            dialogRef
                .afterClosed()
                .subscribe(selectedDatum => {
                    if (selectedDatum == null) {
                        return;
                    }
                    mix.addImport(selectedDatum);
                    this.uiManager.updateEdgeConnections(true);
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
                    this.mix.addNode(newNode);
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
                    mix.addOutput(selectedDatum);
                    this.uiManager.updateEdgeConnections(false);
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
                        this.mix.addConnection(
                            {
                                sourceType:         ConnectionSourceType.CONSTANT,
                                sourceValue:        true,
                                sourceValueType:    connector.datum.type,
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
                        this.mix.addConnection(
                            {
                                sourceType:      ConnectionSourceType.CONSTANT,
                                sourceValue:     true,
                                sourceValueType: connector.datum.type,
                                drainType:       ConnectionDrainType.OUTPUT,
                                outputName:      connector.datum.name
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
                                        this.mix?.addConnection(
                                            {
                                                sourceType:         ConnectionSourceType.CONSTANT,
                                                sourceValue:        value.value,
                                                sourceValueType:    connector.datum.type,
                                                drainType:          ConnectionDrainType.NODE,
                                                drainNodeId:        connector.node.id,
                                                drainNodeInputName: connector.datum.name
                                            }
                                        );
                                    } else {
                                        this.mix?.addConnection(
                                            {
                                                sourceType:      ConnectionSourceType.CONSTANT,
                                                sourceValue:     value.value,
                                                sourceValueType: connector.datum.type,
                                                drainType:       ConnectionDrainType.OUTPUT,
                                                outputName:      connector.datum.name
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
                this.mix.removeConnection(constantConnection);
            }
        }
    }

    private static areSameSelected(selectedA: SelectedElement, selectedB: SelectedElement): boolean {

        return (selectedA.type == SelectedElementType.NODE && selectedB.type == SelectedElementType.NODE && selectedA.node == selectedB.node)
               || (selectedA.type == SelectedElementType.INPUT && selectedB.type == SelectedElementType.INPUT && selectedA.exportedDatum == selectedB.exportedDatum)
               || (selectedA.type == SelectedElementType.OUTPUT && selectedB.type == SelectedElementType.OUTPUT && selectedA.datum == selectedB.datum)
               || (selectedA.type == SelectedElementType.CONNECTION && selectedB.type == SelectedElementType.CONNECTION && selectedA.connection == selectedB.connection);
    }

    protected isSelected(selectedElement: SelectedElement): boolean {
        return this.selectedElements.some(otherElement => {
            return MixComponent.areSameSelected(selectedElement, otherElement);
        });
    }

    protected selectElement(selectedElement: SelectedElement, event?: MouseEvent): void {
        if (event?.shiftKey == true) {
            if (!this.isSelected(selectedElement)) {
                this.selectedElements.push(selectedElement);
            } else {
                this.selectedElements = this.selectedElements.filter(otherElement => !MixComponent.areSameSelected(selectedElement, otherElement));
            }
        } else {
            this.selectedElements = [selectedElement];
        }
    }

    protected get toolbarElements(): ToolbarElement[] {
        return this.filterToolbar();
    }

    private filterToolbar(toFilter: ToolbarElement[] = ALL_TOOLBAR_ELEMENTS): ToolbarElement[] {
        return toFilter
            .filter(toolbarElement => this.isToolbarElementVisible(toolbarElement))
            .map((el) => {
                if ((el.type == ToolBarElementType.BUTTON) && (el.submenu != null)) {
                    return {
                        ...el,
                        submenu: this.filterToolbar(el.submenu)
                    };
                } else {
                    return el;
                }
            });
    }


    private isToolbarElementVisible(toolbarElement: ToolbarElement): boolean {
        switch (toolbarElement.id) {
            case ToolbarAction.BACK as string:
                return true;
            case ToolbarAction.SAVE as string:
            case ToolbarAction.ADD as string:
            case ToolbarAction.REARRANGE as string:
            default:
                // TODO: if a new status is created, use it here too
                return this.loadingStatus == LoadingStatus.LOADED;
            case ToolbarAction.DELETE as string:
                return this.selectedElements.length > 0;
        }
    }


    protected toolbarClick(id: ToolbarAction): void {
        switch (id) {
            case ToolbarAction.BACK:
                void this.router.navigate(['mixing']);
                break;
            case ToolbarAction.DELETE:
                for (const selectedElement of this.selectedElements) {
                    switch (selectedElement.type) {
                        case SelectedElementType.INPUT:
                            this.mix?.removeInput(selectedElement.exportedDatum);
                            this.uiManager.refreshMix();
                            break;
                        case SelectedElementType.NODE:
                            this.mix?.removeNode(selectedElement.node);
                            this.uiManager.refreshMix();
                            break;
                        case SelectedElementType.OUTPUT:
                            this.mix?.removeOutput(selectedElement.datum);
                            this.uiManager.refreshMix();
                            break;
                        case SelectedElementType.CONNECTION:
                            this.mix?.removeConnection(selectedElement.connection);
                            this.uiManager.removeConnection(selectedElement.connection);
                            break;
                    }
                }
                this.selectedElements = [];
                break;
            case ToolbarAction.REARRANGE:
                this.uiManager.rearrangeNodes();
                break;
            case ToolbarAction.SAVE: {
                // TODO: Block view and leave loading without removing the svg
                const mix      = this.mix;
                const position = this.mixPosition;
                if (mix != null && position != null) {
                    this
                        .mixService
                        .updateMix(mix, position)
                        .then((newId: number) => {
                            void this.router.navigate(['mixing', 'edit', newId]);
                            mix.id = newId;
                        })
                        .catch((error: unknown) => {
                            // TODO: Handle handleable errors
                            console.log(error);
                        });
                }
                break;
            }
            case ToolbarAction.ADD:
                this.addNode();
                break;
        }
    }

    protected asToolbarAction(val: string): ToolbarAction { return val as ToolbarAction; }

    protected readonly MEASURES: typeof MEASURES                           = MEASURES;
    protected readonly Math: Math                                          = Math;
    protected readonly getColorVarNameForType: (type: DatumType) => string = getColorVarNameForType;
    protected readonly ConnectionSourceType: typeof ConnectionSourceType   = ConnectionSourceType;
    protected readonly DatumType: typeof DatumType                         = DatumType;
    protected readonly Datum: typeof Datum                                 = Datum;
    protected readonly ELABORATION_NODE_DISPLAY_NAME                       = ELABORATION_NODE_DISPLAY_NAME;
    protected readonly LoadingStatus                                       = LoadingStatus;
    protected readonly DATUM_ORIGIN_DISPLAY                                = DATUM_ORIGIN_DISPLAY;
    protected readonly getExternalDatumOriginNameDisplay                   = getExternalDatumOriginNameDisplay;
    protected readonly SelectedElementType                                 = SelectedElementType;
    protected readonly connectable                                         = connectable;
    protected readonly graphConnectionSmoothPath                           = graphConnectionSmoothPath;
}

type SelectedElement = {
    type: SelectedElementType.INPUT,
    exportedDatum: ExportedDatum
} | {
    type: SelectedElementType.NODE,
    node: ElaborationNode
} | {
    type: SelectedElementType.OUTPUT,
    datum: Datum
} | {
    type: SelectedElementType.CONNECTION,
    connection: Connection
};

enum SelectedElementType {
    INPUT      = 'INPUT',
    OUTPUT     = 'OUTPUT',
    NODE       = 'NODE',
    CONNECTION = 'CONNECTION'
}


enum ToolbarAction {
    BACK      = 'back',
    SAVE      = 'save',
    ADD       = 'add',
    DELETE    = 'delete',
    REARRANGE = 'rearrange'
}


const ALL_TOOLBAR_ELEMENTS: ToolbarElement[] = [
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'arrow_back',
        id:    ToolbarAction.BACK,
        hint:  'Go back',
        order: 0
    },
    {
        type:  ToolBarElementType.SPACER,
        id:    'space',
        order: 1
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'delete',
        id:    ToolbarAction.DELETE,
        hint:  'Delete',
        order: 2
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'add',
        id:    ToolbarAction.ADD,
        hint:  'Add node',
        order: 2
    },
    {
        type:  ToolBarElementType.DIVIDER,
        id:    'divider-1',
        order: 3
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'graph_1',
        id:    ToolbarAction.REARRANGE,
        hint:  'Rearrange nodes in order',
        order: 4
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'save',
        id:    ToolbarAction.SAVE,
        hint:  'Save mix',
        order: 4
    }
];
