import {AfterViewInit, Component, ElementRef} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {LoadingStatus} from '../../../utils/enums';
import {Connection, ConnectionDrainToNode, ConnectionDrainToOutput, ConnectionDrainType, ConnectionSourceFromConstant, ConnectionSourceType, Mix, MixJSON} from '@common/mixing/mix/mix';
import {firstValueFrom} from 'rxjs';
import {MixingService} from '../mixing.service';
import {Datum, DatumType, DatumTypeColorBase, ExportedDatum} from '@common/mixing/mix/datum';
import {InputLibraryDialogComponent} from './input-library-dialog/input-library-dialog.component';
import {ArbitraryInputsElaborationNode, ElaborationNode} from '@common/mixing/mix/elaboration-node';
import {DATUM_ORIGIN_DISPLAY, ELABORATION_NODE_DISPLAY_NAME, getColorVarNameForType, getExternalDatumOriginNameDisplay, graphConnectionSmoothPath, MEASURES} from '../constants';
import {MixUiManager} from './mix-ui-manager';
import {MatButton} from '@angular/material/button';
import {DatePipe, Location} from '@angular/common';
import {ConstantEditDialogComponent} from './constant-edit-dialog/constant-edit-dialog.component';
import {NodeLibraryDialogComponent} from './node-library-dialog/node-library-dialog.component';
import {DatumDefineDialogComponent} from '../../dialogs/datum-define-dialog/datum-define-dialog.component';
import {BetterMatDialog} from '../../../utils/better-mat-dialog';
import {createMixInfo, mixInfoFromJSON, MixPhase, MixPositionInfo, MixPositionInfoJSON, MixTarget, PutMixShowableError, PutMixShowableErrorObject} from '@common/mixing/mix/rest-classes';
import {DynamicSvgComponent} from '../../auxiliary/dynamic-svg/dynamic-svg.component';
import {HttpErrorResponse} from '@angular/common/http';
import {ToolbarButton, ToolbarComponent, ToolbarElement, ToolBarElementType, ToolbarTitle} from '../../auxiliary/toolbar/toolbar.component';
import {DeviceService} from '../../../services/device.service';
import {ResizeEventDirective} from '../../../directives/resize-event/resize-event.directive';
import {getDateDisplayFormat, SNACKBAR_TIMEOUT} from '../../../utils/constants';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ConfirmDialogComponent} from '../../dialogs/confirm-dialog/confirm-dialog.component';
import {LocalStorageObject, LocalStorageService} from '../../../services/local-storage.service';
import {BackupDialogComponent} from './backup-dialog/backup-dialog.component';
import {MatProgressSpinner} from '@angular/material/progress-spinner';

@Component({
               selector:    'house-mix-mix',
               imports:     [
                   DatePipe,
                   DynamicSvgComponent,
                   MatButton,
                   ToolbarComponent,
                   ResizeEventDirective,
                   MatProgressSpinner
               ],
               templateUrl: './mix.component.html',
               styleUrl:    './mix.component.scss'
           })
export class MixComponent implements AfterViewInit {

    protected mix: Mix | null = null;

    protected availableImports: ExportedDatum[] = [];
    protected errorImports: string[]            = [];
    protected savedOutputs: Datum[]             = [];
    protected restoredOutputs: string[]         = [];

    protected uiManager: MixUiManager = new MixUiManager();

    protected mixPosition?: MixPositionInfo;
    protected mixBackups: MixBackups | null = null;

    protected loadingStatus: LoadingStatus = LoadingStatus.LOADING;

    protected errorType: 'NOT_FOUND' | 'INTERNAL' = 'NOT_FOUND';

    protected selectedElements: SelectedElement[] = [];

    protected exposes: Datum[] | null = null;

    protected randomIcon: string = Math.random() > 0.5 ? 'clock.svg' : 'hourglass.svg';

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        protected mixService: MixingService,
        protected deviceService: DeviceService,
        private elementRef: ElementRef<HTMLElement>,
        private matDialog: BetterMatDialog,
        protected location: Location,
        private snackBar: MatSnackBar,
        private localStorageService: LocalStorageService
    ) {
        this.reload();
    }

    protected reload(backup?: MixBackup): void {
        TOOLBAR_TITLE.text     = '';
        let id: number | 'NEW' = 'NEW';
        this.mix               = null;
        this.availableImports  = [];
        this.errorImports      = [];
        if (backup == null) {
            this.savedOutputs = [];
        }
        this.restoredOutputs = [];
        this.uiManager       = new MixUiManager();
        this.uiManager.addChangeCallback(this.doBackup.bind(this));
        this.mixPosition      = undefined;
        this.loadingStatus    = LoadingStatus.LOADING;
        this.errorType        = 'NOT_FOUND';
        this.selectedElements = [];
        this.exposes          = null;
        firstValueFrom(this.route.params)
            .then(
                params => {
                    if (backup != null) {
                        return;
                    }
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
                    if (backup != null) {
                        this.mixPosition = backup.position;
                        return backup.mix;
                    }
                    this.mixBackups = this
                        .localStorageService
                        .getItem(
                            new LocalStorageObject<MixBackups | null>(`mix-save.${id}`, null),
                            MixBackups.fromJSON
                        );
                    if (id == 'NEW') {
                        if (Object.keys(params).length == 0) {
                            // Somebody came back to the new page without passing through a new setup, we get the location from the backups
                            const latestBackup = this.mixBackups?.latestBackup;
                            if (latestBackup != null) {
                                this.mixPosition = latestBackup.position;
                                if (this.mixBackups != null) {
                                    this.mixBackups.editingBackup = latestBackup;
                                }
                                return latestBackup.mix;
                            } else {
                                const error = new Error('Wrong mix position info');
                                error.cause = 'WRONG_MIX_POSITION';
                                throw error;
                            }
                        }
                        const mixInfo = createMixInfo(params);
                        if (mixInfo == null) {
                            const error = new Error('Wrong mix position info');
                            error.cause = 'WRONG_MIX_POSITION';
                            throw error;
                        }
                        this.mixPosition = mixInfo;
                        const newMix     = new Mix('NEW');
                        if (this.mixBackups != null) {
                            this.mixBackups.addBackup(newMix, mixInfo, true);
                        } else {
                            this.mixBackups = new MixBackups(id);
                            this.mixBackups.addBackup(newMix, mixInfo, true);
                        }
                        this.localStorageService.setItem<MixBackups | null>(
                            new LocalStorageObject<MixBackups | null>(`mix-save.${id}`, null),
                            this.mixBackups,
                            MixBackups.toJSON
                        );
                        return newMix;
                    } else {
                        return this.mixService.getMix({id});
                    }
                })
            .then(
                async (mix) => {
                    await this.router.navigate(
                        [],
                        {
                            relativeTo:          this.route,
                            queryParams:         {},
                            queryParamsHandling: 'replace'
                        }
                    );
                    this.mix           = mix;
                    this.uiManager.mix = mix;
                    if (backup != null) {
                        return backup.position;
                    }
                    this.savedOutputs = mix.outputs.slice();
                    if (id == 'NEW') {
                        return this.mixPosition;
                    } else {
                        return this.mixService.getMixPositionInfo({id});
                    }
                })
            .then(
                async (mixPosition): Promise<Datum[] | null> => {
                    this.updateTitle(mixPosition, id);
                    this.mixPosition = mixPosition;
                    if ((mixPosition?.phase == MixPhase.ACTUATORS) && (mixPosition.target == MixTarget.DEVICE)) {
                        const actuator = await this.deviceService.getActuatorByName({name: mixPosition.actuatorName});
                        return actuator.exposes;
                    } else {
                        return null;
                    }
                })
            .then(
                async (exposes) => {
                    this.exposes = exposes;
                    if ((exposes != null) && (this.mix?.id == 'NEW')) {
                        exposes.forEach(output => this.mix?.addOutput(output));
                    }
                    this.uiManager.showOutputAdd = exposes == null;
                    if (this.mixPosition && this.mix) {
                        this.availableImports = await this.mixService.getAvailableImports(MixPositionInfoJSON.toJSON(this.mixPosition));
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

    private updateTitle(mixPosition: MixPositionInfo | undefined, id: number | 'NEW'): void {
        if (mixPosition != null) {
            if (id == 'NEW') {
                switch (mixPosition.target) {
                    case MixTarget.DEVICE:
                        if (mixPosition.phase == MixPhase.SENSORS) {
                            TOOLBAR_TITLE.text = `New mix for sensor — ${mixPosition.sensorDisplayName}`;
                        } else {
                            TOOLBAR_TITLE.text = `New mix for actuator — ${mixPosition.actuatorDisplayName}`;
                        }
                        break;
                    case MixTarget.GROUP:
                        if (mixPosition.phase == MixPhase.SENSORS) {
                            TOOLBAR_TITLE.text = `New sensor mix for group — ${mixPosition.groupDisplayName}`;
                        } else {
                            TOOLBAR_TITLE.text = `New actuator mix for group — ${mixPosition.groupDisplayName}`;
                        }
                        break;
                    case MixTarget.CENTER:
                        TOOLBAR_TITLE.text = `New central mix — ${mixPosition.mixDisplayName}`;
                        break;
                }
            } else {
                switch (mixPosition.target) {
                    case MixTarget.DEVICE:
                        if (mixPosition.phase == MixPhase.SENSORS) {
                            TOOLBAR_TITLE.text = `Edit mix for sensor — ${mixPosition.sensorDisplayName}`;
                        } else {
                            TOOLBAR_TITLE.text = `Edit mix for actuator — ${mixPosition.actuatorDisplayName}`;
                        }
                        break;
                    case MixTarget.GROUP:
                        if (mixPosition.phase == MixPhase.SENSORS) {
                            TOOLBAR_TITLE.text = `Edit sensor mix for group — ${mixPosition.groupDisplayName}`;
                        } else {
                            TOOLBAR_TITLE.text = `Edit actuator mix for group — ${mixPosition.groupDisplayName}`;
                        }
                        break;
                    case MixTarget.CENTER:
                        TOOLBAR_TITLE.text = `Edit central mix — ${mixPosition.mixDisplayName}`;
                        break;
                }
            }
        } else {
            TOOLBAR_TITLE.text = '';
        }
    }

    public ngAfterViewInit(): void {
        this.uiManager.viewSize = {
            width:  this.elementRef.nativeElement.offsetWidth,
            height: this.elementRef.nativeElement.offsetHeight - 62,
            target: this.elementRef.nativeElement
        };
        this.uiManager.rearrangeNodes();
    }

    protected addInput(): void {
        const mix = this.mix;
        if (mix != null) {
            const unusedExports =
                      this
                          .availableImports
                          .filter(
                              exp => !mix.imports.some(imp => imp.sameIdentification(exp)));
            if (unusedExports.length == 0) {
                return;
            }
            const dialogRef = this.matDialog.open(InputLibraryDialogComponent, {data: unusedExports});
            dialogRef
                .afterClosed()
                .subscribe(selectedDatum => {
                    if (selectedDatum == null) {
                        return;
                    }
                    mix.addImport(selectedDatum);
                    this.doBackup();
                    this.uiManager.updateEdgeConnections(true);
                });
        }
    }

    protected get inputsAvailable(): boolean {
        const mix = this.mix;
        if (mix != null) {
            const unusedExports =
                      this
                          .availableImports
                          .filter(
                              exp => !mix.imports.some(imp => imp.sameIdentification(exp)));
            return unusedExports.length > 0;
        }
        return false;
    }

    protected addNode(): void {
        if (this.mix) {
            const dialogRef = this.matDialog.open(NodeLibraryDialogComponent, {});
            dialogRef.afterClosed().subscribe(result => {
                if ((result != null) && (this.mix != null)) {
                    let newNode: ElaborationNode;
                    const nextId = this.mix.nodes.reduce((accum, node) => Math.max(accum, node.id), -1) + 1;
                    if (result.special) {
                        if (!result.nullMarked) {
                            newNode = new result.constructor(nextId, {dataType: result.datumType});
                        } else {
                            if (result.arbitraryNumber) {
                                newNode = new result.constructor(nextId, {dataType: result.datumType, nullable: result.nullableMark, inputNumber: 1});
                            } else {
                                newNode = new result.constructor(nextId, {dataType: result.datumType, nullable: result.nullableMark});
                            }
                        }
                    } else {
                        newNode = new result.constructor(nextId);
                    }
                    this.mix.addNode(newNode);
                    this.doBackup();
                    this.uiManager.addNode(newNode);
                }
            });
        }
    }

    protected addOutput(): void {
        if (this.exposes != null) {
            return;
        }
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
                    this.doBackup();
                    this.uiManager.updateEdgeConnections(false);
                });
        }
    }

    protected getAllNodeInputs(node: ElaborationNode): NodeInputInfo[] {
        const result = node.inputs.map(input => ({datum: input, specialInputAddMore: false}));
        if (node instanceof ArbitraryInputsElaborationNode) {
            result.push({datum: new Datum('Add a new input...', node.options.dataType, node.options.nullable), specialInputAddMore: true});
        }
        return result;
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
                        this.doBackup();
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
                        this.doBackup();
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
                        this.doBackup();
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
                        this.doBackup();
                    }
                }
                break;
            }
            case DatumType.NUMBER:
            case DatumType.STRING:
            case DatumType.COLOR:
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
                                      type:      connector.datum.type,
                                      value:     constantConnection?.sourceValue ?? Datum.getDefaultForType(connector.datum.type),
                                      datumName: connector.datum.name
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
                                    this.doBackup();
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
                                        this.doBackup();
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
                                        this.doBackup();
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
                this.doBackup();
            }
        }
    }

    protected addArbitraryNodeInput(node: ElaborationNode): void {
        if (node instanceof ArbitraryInputsElaborationNode) {
            node.addInput();
            if (!node.options.nullable) {
                const newConnection: Connection = {
                    sourceType:         ConnectionSourceType.CONSTANT,
                    sourceValue:        Datum.getDefaultForType(node.options.dataType),
                    sourceValueType:    node.options.dataType,
                    drainType:          ConnectionDrainType.NODE,
                    drainNodeId:        node.id,
                    drainNodeInputName: ArbitraryInputsElaborationNode.getInputName(node.options.inputNumber - 1)
                };
                this.mix?.addConnection(newConnection);
                this.uiManager.addConnection(newConnection);
            }
            this.uiManager.updateNode(node);
            this.doBackup();
        }
    }

    protected clearRestored(name: string): void {
        this.restoredOutputs = this.restoredOutputs.filter(otherOutput => otherOutput != name);
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
        if (this.loadingStatus !== LoadingStatus.LOADED) {
            return (toolbarElement.id as ToolbarAction) == ToolbarAction.BACK;
        }
        switch (toolbarElement.id as ToolbarAction) {
            case ToolbarAction.BACKUPS:
                return this.mixBackups?.hasUnopenedBackups ?? false;
            case ToolbarAction.BACK:
                return true;
            case ToolbarAction.SAVE:
            case ToolbarAction.ADD:
            case ToolbarAction.REARRANGE:
            default:
                return true;
            case ToolbarAction.DELETE:
                return this.selectedElements.length > 0
                       && (
                           this
                               .selectedElements
                               .every(element => element.type != SelectedElementType.OUTPUT)
                           || this.exposes == null);
        }
    }


    protected toolbarClick(id: ToolbarAction): void {
        switch (id) {
            case ToolbarAction.BACKUPS:
                if (this.mixBackups == null) {
                    return;
                }
                this.matDialog.open(BackupDialogComponent, {
                    data: this.mixBackups
                })
                    .afterClosed()
                    .subscribe(result => {
                        if (result != null) {
                            if (this.mixBackups) {
                                if (this.mixBackups.editingBackup != null) {
                                    this.doBackup();
                                }
                                this.mixBackups.editingBackup = result;
                            }
                            this.reload(result);
                        }
                    });
                break;
            case ToolbarAction.BACK:
                void this.router.navigate(['mixing']);
                break;
            case ToolbarAction.DELETE:
                for (const selectedElement of this.selectedElements) {
                    switch (selectedElement.type) {
                        case SelectedElementType.INPUT:
                            this.mix?.removeImport(selectedElement.exportedDatum);
                            this.doBackup();
                            this.uiManager.refreshMix();
                            this.errorImports = this.errorImports.filter(imp => imp != selectedElement.exportedDatum.uniqueName);
                            break;
                        case SelectedElementType.NODE:
                            this.mix?.removeNode(selectedElement.node);
                            this.doBackup();
                            this.uiManager.refreshMix();
                            break;
                        case SelectedElementType.OUTPUT:
                            if (this.exposes != null) {
                                return;
                            }
                            this.mix?.removeOutput(selectedElement.datum);
                            this.doBackup();
                            this.uiManager.refreshMix();
                            break;
                        case SelectedElementType.CONNECTION:
                            this.mix?.removeConnection(selectedElement.connection);
                            this.doBackup();
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
                const mix                             = this.mix;
                const position                        = this.mixPosition;
                let toBeSavedBackup: MixBackup | null = null;
                if (this.mixBackups != null) {
                    toBeSavedBackup               = this.mixBackups.editingBackup;
                    this.mixBackups.editingBackup = null;
                    SAVE_BUTTON.badge             = false;
                }
                SAVE_BUTTON.loading = true;
                if (mix != null && position != null) {
                    this
                        .mixService
                        .updateMix(mix, position)
                        .then((newId: number) => {
                            SAVE_BUTTON.loading = false;
                            if (this.mixBackups != null) {
                                this.mixBackups.removeBackup(toBeSavedBackup);
                                this.saveBackups();
                            }
                            void this.router.navigate(['mixing', 'edit', newId]);
                            this.savedOutputs    = mix.outputs.slice();
                            this.errorImports    = [];
                            this.restoredOutputs = [];
                            mix.id               = newId;
                        })
                        .catch((error: unknown) => {
                            SAVE_BUTTON.loading = false;
                            SAVE_BUTTON.badge   = true;
                            if (this.mixBackups != null) {
                                this.saveBackups();
                            }
                            if (error instanceof HttpErrorResponse) {
                                const showableError: PutMixShowableErrorObject = error.error as PutMixShowableErrorObject;
                                if (showableError.showable == true) {
                                    switch (showableError.errorType) {
                                        case PutMixShowableError.IMPORTS_UNAVAILABLE: {
                                            this.matDialog.open(ConfirmDialogComponent, {
                                                data: {
                                                    title:       'Error saving',
                                                    message:     'Some input used in the mix are no longer available or they have changed. ' +
                                                                 'They are outlined in red, please remove them and save again',
                                                    confirmText: 'OK',
                                                    cancelText:  null
                                                }
                                            });
                                            this.availableImports = [];
                                            this.errorImports     = showableError.unavailableImports.map(datum => datum.uniqueName);
                                            if (this.mixPosition != null) {
                                                void this
                                                    .mixService
                                                    .getAvailableImports(MixPositionInfoJSON.toJSON(this.mixPosition))
                                                    .then((availableImports) => {
                                                        this.availableImports = availableImports;
                                                        this.errorImports     =
                                                            this
                                                                .mix
                                                                ?.imports
                                                                .filter(
                                                                    imp =>
                                                                        !this
                                                                            .availableImports
                                                                            .some(otherImp =>
                                                                                      otherImp.uniqueName == imp.uniqueName
                                                                                      && otherImp.type == imp.type
                                                                                      && otherImp.nullable == imp.nullable
                                                                            ))
                                                                .map(imp => imp.uniqueName) ?? [];
                                                    });
                                            }
                                            return;
                                        }
                                        case PutMixShowableError.OUTPUTS_IN_USE: {
                                            this.matDialog.open(ConfirmDialogComponent, {
                                                data: {
                                                    title:       'Error saving',
                                                    message:     'Some outputs have been deleted but they are used in some other mix. ' +
                                                                 'They have been restored as constants, and outlined in green. The mix has not been saved, check and then save again',
                                                    confirmText: 'OK',
                                                    cancelText:  null
                                                }
                                            });
                                            showableError.dependingOutputs.forEach(outputName => {
                                                const output = this.savedOutputs.find(otherOutput => otherOutput.name == outputName);
                                                this.restoredOutputs.push(outputName);
                                                if (output != null) {
                                                    mix.addOutput(output);
                                                    this.doBackup();
                                                    this.uiManager.updateEdgeConnections(false);
                                                }
                                            });
                                            return;
                                        }
                                        case PutMixShowableError.INPUTS_WITHOUT_IMPORT:
                                        case PutMixShowableError.CYCLE:
                                        case PutMixShowableError.WRONG_CONNECTIONS: {
                                            break;
                                        }
                                    }
                                }
                            }
                            this.snackBar.open(
                                'There was an error while saving the mix, and the mix has not been saved. Check for errors and try again. ' +
                                'You can also reload the page, but you will lose your changes',
                                undefined,
                                {
                                    duration: SNACKBAR_TIMEOUT
                                }
                            );
                        });
                }
                break;
            }
            case ToolbarAction.ADD:
                this.addNode();
                break;
        }
    }

    protected doBackup(): void {
        if (this.mix != null && this.mixPosition != null) {
            this.mixBackups ??= new MixBackups(this.mix.id);
            if (this.mixBackups.editingBackup == null) {
                this.mixBackups.addBackup(this.mix, this.mixPosition, true);
            }
            SAVE_BUTTON.badge = true;
            this.saveBackups();
        }
    }

    protected saveBackups(): void {
        if (this.mixBackups != null && this.mix != null && this.mixPosition != null) {
            if (!this.mixBackups.hasBackups) {
                this.localStorageService.removeItem(`mix-save.${this.mix.id}`);
            } else {
                this.localStorageService.setItem(
                    new LocalStorageObject<MixBackups | null>(
                        `mix-save.${this.mix.id}`,
                        this.mixBackups
                    ),
                    this.mixBackups,
                    MixBackups.toJSON
                );
            }
        }
    }

    protected asToolbarAction(val: string): ToolbarAction { return val as ToolbarAction; }

    protected readonly MEASURES: typeof MEASURES                           = MEASURES;
    protected readonly Math: Math                                          = Math;
    protected readonly getColorVarNameForType: (type: DatumType) => string = getColorVarNameForType;
    protected readonly ConnectionSourceType: typeof ConnectionSourceType   = ConnectionSourceType;
    protected readonly DatumType: typeof DatumType                         = DatumType;
    protected readonly DatumTypeColorBase: typeof DatumTypeColorBase       = DatumTypeColorBase;
    protected readonly Datum: typeof Datum                                 = Datum;
    protected readonly ELABORATION_NODE_DISPLAY_NAME                       = ELABORATION_NODE_DISPLAY_NAME;
    protected readonly LoadingStatus                                       = LoadingStatus;
    protected readonly DATUM_ORIGIN_DISPLAY                                = DATUM_ORIGIN_DISPLAY;
    protected readonly getExternalDatumOriginNameDisplay                   = getExternalDatumOriginNameDisplay;
    protected readonly SelectedElementType                                 = SelectedElementType;
    protected readonly graphConnectionSmoothPath                           = graphConnectionSmoothPath;
    protected readonly getDateDisplayFormat                                = getDateDisplayFormat;

}

export interface NodeInputInfo {
    datum: Datum;
    specialInputAddMore: boolean;
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
    BACKUPS   = 'backups',
    ADD       = 'add',
    DELETE    = 'delete',
    REARRANGE = 'rearrange'
}


const TOOLBAR_TITLE: ToolbarTitle = {
    type:  ToolBarElementType.TITLE,
    id:    'title',
    text:  '',
    order: 1
};


const BACKUP_BUTTON: ToolbarButton = {
    type:  ToolBarElementType.BUTTON,
    icon:  'history',
    id:    ToolbarAction.BACKUPS,
    hint:  'Auto-saved versions',
    order: 5
};

const SAVE_BUTTON: ToolbarButton = {
    type:  ToolBarElementType.BUTTON,
    icon:  'save',
    id:    ToolbarAction.SAVE,
    hint:  'Save mix',
    order: 5,
    badge: false
};

const ALL_TOOLBAR_ELEMENTS: ToolbarElement[] = [
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'arrow_back',
        id:    ToolbarAction.BACK,
        hint:  'Go back',
        order: 0
    },
    TOOLBAR_TITLE,
    {
        type:  ToolBarElementType.SPACER,
        id:    'space',
        order: 2
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'delete',
        id:    ToolbarAction.DELETE,
        hint:  'Delete',
        order: 3
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'add',
        id:    ToolbarAction.ADD,
        hint:  'Add node',
        order: 3
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'graph_1',
        id:    ToolbarAction.REARRANGE,
        hint:  'Rearrange nodes in order',
        order: 3
    },
    {
        type:  ToolBarElementType.DIVIDER,
        id:    'divider-1',
        order: 4
    },
    BACKUP_BUTTON,
    SAVE_BUTTON
];


export class MixBackups {

    private _backups: MixBackup[] = [];

    private _editingBackup: MixBackup | null = null;

    constructor(
        public mixId: number | 'NEW'
    ) {

    }

    public get backups(): MixBackup[] {
        return this._backups.slice();
    }

    public get latestBackup(): MixBackup | null {
        return this._backups[this._backups.length - 1] ?? null;
    }

    public get editingBackup(): MixBackup | null {
        return this._editingBackup;
    }

    public set editingBackup(editingBackup: MixBackup | null) {
        this._editingBackup = editingBackup;
        if (editingBackup != null) {
            if (!this._backups.includes(editingBackup)) {
                this.addBackup(editingBackup.mix, editingBackup.position);
            }
        }
    }

    public get hasBackups(): boolean {
        return this._backups.length > 0;
    }

    public get hasUnopenedBackups(): boolean {
        if (!this.hasBackups) {
            return false;
        }
        return this._backups.some(backup => backup != this._editingBackup);
    }

    private sortBackups(): void {
        this._backups.sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    public addBackup(newMix: Mix, mixInfo: MixPositionInfo, setEditing: boolean = false): MixBackup {
        const backup = {
            date:     new Date(),
            mix:      newMix,
            position: mixInfo
        };
        this._backups.push(backup);
        this.sortBackups();
        if (setEditing) {
            this._editingBackup = backup;
        }
        return backup;
    }

    public removeBackup(backup: MixBackup | null): void {
        if (backup == null) {
            return;
        }
        this._backups = this._backups.filter(otherBackup => otherBackup != backup);
        if (this._editingBackup == backup) {
            this._editingBackup = null;
        }
    }

    public static fromJSON(mixBackupsJSON: unknown): MixBackups | null {
        if (mixBackupsJSON == null) {
            return null;
        }
        const actualJSON    = mixBackupsJSON as MixBackupsJSON;
        const mixBackups    = new MixBackups(actualJSON.mixId);
        mixBackups._backups = actualJSON.backups.map(backup => {
            const position = mixInfoFromJSON(backup.position);
            if (position == null) {
                throw new Error('Wrong position data');
            }
            return {
                date:     new Date(backup.date),
                mix:      Mix.fromJSON(backup.mix),
                position: position
            };
        });
        mixBackups.sortBackups();
        return mixBackups;
    }

    public static toJSON(mixBackups: MixBackups | null): MixBackupsJSON | null {
        if (mixBackups == null) {
            return null;
        }
        return {
            mixId:   mixBackups.mixId,
            backups: mixBackups._backups
                               .map(backup => {
                                   return {
                                       date:     backup.date.getTime(),
                                       mix:      backup.mix.toJSON(),
                                       position: MixPositionInfoJSON.toJSON(backup.position)
                                   };
                               })
        };
    }
}

export interface MixBackupsJSON {
    mixId: number | 'NEW';
    backups: MixBackupJSON[];
}

export interface MixBackup {
    date: Date,
    position: MixPositionInfo,
    mix: Mix
}

export interface MixBackupJSON {
    date: number,
    position: MixPositionInfoJSON,
    mix: MixJSON
}
