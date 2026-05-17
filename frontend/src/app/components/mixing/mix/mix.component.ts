/**
 * This module contains the {@link MixComponent|mix editing view} component and related classes.
 *
 * @module
 */
import {AfterViewInit, Component, ElementRef, HostListener} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {LoadingStatus} from '../../../utils/enums';
import {
    Connection,
    ConnectionDrainToNode,
    ConnectionDrainToOutput,
    ConnectionDrainType,
    ConnectionJSON,
    ConnectionSourceFromConstant,
    ConnectionSourceType,
    Mix,
    MixJSON
} from '@common/mixing/mix/mix';
import {firstValueFrom, Subject} from 'rxjs';
import {MixingService} from '../../../services/mixing.service';
import {Datum, DatumType, DatumTypeColorBase, ExportedDatum} from '@common/mixing/mix/datum';
import {InputLibraryDialogComponent} from './input-library-dialog/input-library-dialog.component';
import {ArbitraryInputsElaborationNode, ElaborationNode, ElaborationNodeJSON} from '@common/mixing/mix/elaboration-node';
import {DATUM_ORIGIN_DISPLAY, ELABORATION_NODE_DISPLAY_NAME, getColorVarNameForType, getExternalDatumOriginNameDisplay, graphConnectionSmoothPath, MEASURES} from '../constants';
import {MixUiManager, NodeGroup, DatumNodeInfo} from './mix-ui-manager';
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
import {MixLayout} from '@common/mixing/mix/mix-layout';
import {StringInputDialogComponent} from '../../dialogs/string-input-dialog/string-input-dialog.component';
import {kelvinToColor} from '@common/utils/color-convert-table';
import {DEFAULT_TEMP} from '@common/utils/constants';
import {Point} from '@angular/cdk/drag-drop';

// noinspection ES6UnusedImports
import type {Actuator} from '@common/devices/actuator/actuator';
// noinspection ES6UnusedImports
import type {Device} from '@common/devices/device';

/**
 * The component for the "mix editing" view, that shows the structure of a {@link Mix|`Mix`},
 * with the possibility to add, remove, edit, connect {@link ElaborationNode|`ElaborationNode`s},
 * {@link Mix#inputs|`inputs`} and {@link Mix#outputs|`outputs`}.
 *
 * @component
 * @componentSelector `<house-mix-mix>`
 */
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

    /** The {@link Mix|`Mix`} that is currently being edited. */
    protected mix: Mix | null = null;

    /** All the {@link ExportedDatum|`ExportedDatum`s} that can be used by the current {@link MixComponent#mix|`mix`} as {@link Mix#imports|`imports`}. */
    protected availableImports: ExportedDatum[] = [];
    /** The {@link ExportedDatum#name|`name`s} of the {@link Mix#imports|`imports`} that caused an error when saving. */
    protected errorImports: string[]            = [];
    /** A backup of the outputs, to be used when restoring outputs after a save operation ended in an error. */
    protected savedOutputs: Datum[]             = [];
    /** The {@link ExportedDatum#name|`name`s} of the {@link Mix#outputs|`outputs`} that were restored after an error when saving. */
    protected restoredOutputs: string[]         = [];

    /** The {@link MixUiManager|`MixUiManager`} that handles the UI operations on the main canvas. */
    protected uiManager: MixUiManager = new MixUiManager();

    /** The current {@link MixComponent#mix|`mix`}'s position in the system, defining what it's linked to. */
    protected mixPosition?: MixPositionInfo;
    /** The past {@link MixBackups|`MixBackups`} for the {@link Mix|`Mix`} currently being edited. */
    protected mixBackups: MixBackups | null = null;

    /** The status of the request for loading {@link MixComponent#mix|`mix`}. */
    protected loadingStatus: LoadingStatus = LoadingStatus.LOADING;

    /** When {@link MixComponent#loadingStatus|`loadingStatus`} is {@link LoadingStatus.ERROR|`ERROR`}, this is the error that should be displayed. */
    protected errorType: 'NOT_FOUND' | 'INTERNAL' = 'NOT_FOUND';

    /** The elements currently being selected. */
    protected selectedElements: SelectedElement[] = [];

    /** If the {@link MixComponent#mix|`mix`} is linked to an {@link Actuator|`Actuator`}, this value contains the fixed outputs corresponding to {@link Actuator#exposes|`exposes`}. */
    protected exposes: Datum[] | null = null;

    /** The url in the assets folder of a random time-related icon for the loading screen. */
    protected randomIcon: string = Math.random() > 0.5 ? 'clock.svg' : 'hourglass.svg';

    /** The copied elements in the clipboard.  */
    protected copiedElements: MixCopy | null;

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {ActivatedRoute} route - The Angular route service. Instantiated by dependency injection.
     * @param {Router} router - The Angular router. Instantiated by dependency injection.
     * @param {MixingService} mixService - The mixing service. Instantiated by dependency injection.
     * @param {DeviceService} deviceService - The {@link Device|`Device`} service. Instantiated by dependency injection.
     * @param {ElementRef<HTMLElement>} elementRef - The reference to the element in the DOM.
     * @param {BetterMatDialog} matDialog - The dialog service. Instantiated by dependency injection.
     * @param {Location} location - The location service. Instantiated by dependency injection.
     * @param {MatSnackBar} snackBar - The snackbar service. Instantiated by dependency injection.
     * @param {LocalStorageService} localStorageService - The local storage service. Instantiated by dependency injection.
     */
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
        this.copiedElements = localStorageService.getItem(COPY_STORAGE_KEY);
        SAVE_BUTTON.badge   = false;
        this.reload();
    }

    /**
     * Implementation of {@link AfterViewInit#ngAfterViewInit| `AfterViewInit.ngAfterViewInit()`}.
     */
    public ngAfterViewInit(): void {
        this.uiManager.viewSize = {
            width:  this.elementRef.nativeElement.offsetWidth,
            height: this.elementRef.nativeElement.offsetHeight - 62,
            target: this.elementRef.nativeElement
        };
    }

    /**
     * Reload the currently displayed {@link Mix|`Mix`} and all related data.
     *
     * @param {MixBackup} backup - The backup to load. If omitted, the {@link Mix|`Mix`} to open is deduced from the URL.
     */
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
                async (params: Record<string, string>): Promise<[Mix, MixLayout]> => {
                    if (backup != null) {
                        this.mixPosition = backup.position;
                        return [backup.mix, backup.layout];
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
                                return [latestBackup.mix, latestBackup.layout];
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
                            this.mixBackups.addBackup(newMix, mixInfo, new MixLayout({}, []), true);
                        } else {
                            this.mixBackups = new MixBackups(id);
                            this.mixBackups.addBackup(newMix, mixInfo, new MixLayout({}, []), true);
                        }
                        this.localStorageService.setItem<MixBackups | null>(
                            new LocalStorageObject<MixBackups | null>(`mix-save.${id}`, null),
                            this.mixBackups,
                            MixBackups.toJSON
                        );
                        return [newMix, new MixLayout({}, [])];
                    } else {
                        return Promise.all(
                            [
                                this.mixService.getMix({id}),
                                this.mixService.getMixLayout({id})
                            ]
                        );
                    }
                })
            .then(
                async ([mix, mixLayout]) => {
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
                        this.uiManager.importLayout(backup.layout);
                        return backup.position;
                    } else {
                        this.uiManager.importLayout(mixLayout);
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
                    this.uiManager.updateEdgeConnections(false);
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

    /**
     * Update the title shown in the {@link ToolbarComponent|`ToolbarComponent`} according to a
     * {@link MixPositionInfo|`MixPositionInfo`} and the {@link Mix#id|`Mix.id`}.
     *
     * @param {MixPositionInfo | undefined} mixPosition - The {@link MixPositionInfo|`MixPositionInfo`} of the {@link Mix|`Mix`} the title will refer to.
     * @param {number | 'NEW'} id - The {@link Mix#id|`id`} of the {@link Mix|`Mix`} the title will refer to.
     */
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

    /** Open a dialog to request an input to add to the {@link MixComponent#mix|`mix`}, and adds it if successful. */
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

    /** Whether there are inputs still available to be added to the {@link MixComponent#mix|`mix`}. */
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

    /** Open a dialog to request a type of {@link ElaborationNode|`ElaborationNode`} to add to the {@link MixComponent#mix|`mix`}, and adds it if successful. */
    protected addNode(): void {
        if (this.mix) {
            const dialogRef = this.matDialog.open(NodeLibraryDialogComponent, {});
            dialogRef.afterClosed().subscribe(result => {
                if ((result != null) && (this.mix != null)) {
                    let newNode: ElaborationNode;
                    const nextId = this.nextId;
                    if (result.special) {
                        if (!result.nullMarked) {
                            if (result.isTimeout) {
                                newNode = new result.constructor(nextId, {creationTimestamp: Date.now()});
                            } else {
                                newNode = new result.constructor(nextId, {dataType: result.datumType});
                            }
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

    /** The next free {@link Mix#id|`id`} to use for a new {@link Mix|`Mix`}. */
    private get nextId(): number {
        return (this.mix?.nodes.reduce((accum, node) => Math.max(accum, node.id), -1) ?? -1) + 1;
    }

    /** Open a dialog to define an output to add to the {@link MixComponent#mix|`mix`}, and adds it if successful. Will not do anything if the outputs are locked because {@link MixComponent#exposes|`exposes`} is defined. */
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

    /**
     * Gets all the {@link ElaborationNode#inputs|`inputs`} from an {@link ElaborationNode|`ElaborationNode`} as
     * {@link NodeInputInfo|`NodeInputInfo`}.
     *
     * @param {ElaborationNode} node - The {@link ElaborationNode|`ElaborationNode`} to get the {@link ElaborationNode#inputs|`inputs`} from.
     * @returns {NodeInputInfo[]} - The {@link NodeInputInfo|`NodeInputInfo`} list corresponding to the {@link ElaborationNode#inputs|`inputs`}.
     */
    protected getAllNodeInputs(node: ElaborationNode): NodeInputInfo[] {
        const result = node.inputs.map(input => ({datum: input, specialInputAddMore: false}));
        if (node instanceof ArbitraryInputsElaborationNode) {
            result.push({datum: new Datum('Add a new input...', node.options.dataType, node.options.nullable), specialInputAddMore: true});
        }
        return result;
    }

    /**
     * Returns the connection of an {@link ElaborationNode|`ElaborationNode`}'s {@link ElaborationNode#inputs|`input`} that's connected to a constant
     * in the {@link MixComponent#mix|`mix`}.
     *
     * @param {ElaborationNode} node - The {@link ElaborationNode|`ElaborationNode`} containing the {@link ElaborationNode#inputs|`input`}.
     * @param {Datum} input - The {@link ElaborationNode#inputs|`input`}.
     * @returns {(ConnectionSourceFromConstant & ConnectionDrainToNode) | null} - The connection feeding the constant to the
     *                          {@link ElaborationNode#inputs|`input`}, or null if the input is not connected to a constant.
     */
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


    /**
     * Returns the connection of a {@link Mix|`Mix`}'s {@link Mix#outputs|`output`} that's connected to a constant.
     *
     * @param {Datum} output - The {@link ElaborationNode#outputs|`output`}.
     * @returns {(ConnectionSourceFromConstant & ConnectionDrainToNode) | null} - The connection feeding the constant to the
     *                          {@link Mix#outputs|`output`}, or null if the output is not connected to a constant.
     */
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

    /**
     * Checks whether an {@link ElaborationNode|`ElaborationNode`}'s {@link ElaborationNode#inputs|`input`}
     * can be attached to a {@link Connection|`Connection`}, or if it's already linked to some other non-constant
     * {@link Connection|`Connection`}.
     *
     * @param {ElaborationNode} node - The {@link ElaborationNode|`ElaborationNode`} containing the {@link ElaborationNode#inputs|`input`}.
     * @param {Datum} input - The {@link ElaborationNode#inputs|`input`} to check.
     * @returns {boolean} - `true` if a connection is found with the input as a drain and a non-constant as a source.
     * @protected
     */
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

    /**
     * Checks whether an {@link Mix|`Mix`}'s {@link Mix#outputs|`output`} can be attached to
     * a {@link Connection|`Connection`}, or if it's already linked to some other non-constant
     * {@link Connection|`Connection`}.
     *
     * @param {Datum} output - The {@link ElaborationNode#outputs|`output`} to check.
     * @returns {boolean} - `true` if a connection is found with the input as a drain and a non-constant as a source.
     * @protected
     */
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

    /**
     * Open a dialog to edit a constant connected to an {@link ElaborationNode|`ElaborationNode`}'s {@link ElaborationNode#inputs|`input`}.
     *
     * @param {ElaborationNode} node - The {@link ElaborationNode|`ElaborationNode`} containing the {@link ElaborationNode#inputs|`input`}.
     * @param {Datum} input - The {@link ElaborationNode#inputs|`input`}.
     */
    protected editNodeInputConstant(node: ElaborationNode, input: Datum): void {
        this.editConstant({external: false, node, datum: input});
    }

    /**
     * Clear the constant connected to an {@link ElaborationNode|`ElaborationNode`}'s {@link ElaborationNode#inputs|`input`} by deleting the constant connection.
     *
     * @param {ElaborationNode} node - The {@link ElaborationNode|`ElaborationNode`} containing the {@link ElaborationNode#inputs|`input`}.
     * @param {Datum} input - The {@link ElaborationNode#inputs|`input`}.
     */
    protected clearNodeInputConstant(node: ElaborationNode, input: Datum): void {
        this.clearConstant({external: false, node, datum: input});
    }

    /**
     * Open a dialog to edit a constant connected to an {@link Mix|`Mix`}'s {@link Mix#outputs|`output`}.
     *
     * @param {Datum} output - The {@link ElaborationNode#outputs|`output`}.
     */
    protected editExternalOutputConstant(output: Datum): void {
        this.editConstant({external: true, datum: output});
    }

    /**
     * Clear the constant connected to an {@link Mix|`Mix`}'s {@link Mix#outputs|`output`} by deleting the constant connection.
     *
     * @param {Datum} output - The {@link ElaborationNode#outputs|`output`}.
     */
    protected clearExternalOutputConstant(output: Datum): void {
        this.clearConstant({external: true, datum: output});
    }

    /**
     * Open a dialog to edit a constant connection to a left-facing connector.
     *
     * @param {{external: true, datum: Datum} | {external: false, node: ElaborationNode, datum: Datum}} connector - The connector the constant connection is connected to.
     */
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
            case DatumType.COLOR_TEMP:
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


    /**
     * Clear the constant connected to a left-facing connector.
     *
     * @param {{external: true, datum: Datum} | {external: false, node: ElaborationNode, datum: Datum}} connector - The connector the constant connection is connected to.
     */
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

    /**
     * Add an additional input to an {@link ArbitraryInputsElaborationNode|`ArbitraryInputsElaborationNode`}.
     * Does nothing if the {@link ElaborationNode|`ElaborationNode`} is not an instance of {@link ArbitraryInputsElaborationNode|`ArbitraryInputsElaborationNode`}.
     *
     * @param {ElaborationNode} node - The {@link ElaborationNode|`ElaborationNode`} to add the input to.
     */
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

    /**
     * Remove an {@link Mix#outputs|`output`} from the {@link MixComponent#restoredOutputs|`restoredOutputs`} list.
     *
     * @param {string} name - The {@link Datum#name|`name`} of the {@link Mix#outputs|`output`} to clear.
     */
    protected clearRestored(name: string): void {
        this.restoredOutputs = this.restoredOutputs.filter(otherOutput => otherOutput != name);
    }

    /**
     * Check whether two {@link SelectedElement|`SelectedElement`s} refer to the same effective entity.
     *
     * @param {SelectedElement} selectedA - The first {@link SelectedElement|`SelectedElement`s} to check.
     * @param {SelectedElement} selectedB - The second {@link SelectedElement|`SelectedElement`s} to check.
     * @returns {boolean} - `true` if the two {@link SelectedElement|`SelectedElement`s} match, `false` otherwise.
     */
    private static areSameSelected(selectedA: SelectedElement, selectedB: SelectedElement): boolean {

        return (selectedA.type == SelectedElementType.NODE && selectedB.type == SelectedElementType.NODE && selectedA.node == selectedB.node)
               || (selectedA.type == SelectedElementType.INPUT && selectedB.type == SelectedElementType.INPUT && selectedA.exportedDatum == selectedB.exportedDatum)
               || (selectedA.type == SelectedElementType.OUTPUT && selectedB.type == SelectedElementType.OUTPUT && selectedA.datum == selectedB.datum)
               || (selectedA.type == SelectedElementType.CONNECTION && selectedB.type == SelectedElementType.CONNECTION && selectedA.connection == selectedB.connection)
               || (selectedA.type == SelectedElementType.NODE_GROUP && selectedB.type == SelectedElementType.NODE_GROUP && selectedA.group == selectedB.group);
    }

    /**
     * Check whether a {@link SelectedElement|`SelectedElement`} is already in {@link MixComponent#selectedElements|`selectedElements`}.
     *
     * @param {SelectedElement} selectedElement - The {@link SelectedElement|`SelectedElement`} to check.
     * @returns {boolean} - `true` if {@link MixComponent#selectedElements|`selectedElements`} already contains a
     *                       {@link SelectedElement|`SelectedElement`} equivalent to `selectedElement`, `false` otherwise.
     */
    protected isSelected(selectedElement: SelectedElement): boolean {
        return this.selectedElements.some(otherElement => {
            return MixComponent.areSameSelected(selectedElement, otherElement);
        });
    }

    /**
     * Select an {@link SelectedElement|element} after it's been clicked.
     *
     * @param {SelectedElement} selectedElement - The  {@link SelectedElement|`SelectedElement`} to select.
     * @param {MouseEvent} event - The {@link MouseEvent|`MouseEvent`} that triggered the selection.
     */
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

    /**
     * Open a dialog to ask for a new alias for a connector in a {@link NodeGroup|`NodeGroup`}, and set it if successful.
     *
     * @param {NodeGroup} group - The group the connector is attached to.
     * @param {DatumNodeInfo} datum - The datum linked to the connector to alias.
     * @param {boolean} isInput - Whether the connector is an {@link NodeGroup#inputs|`input`} or {@link NodeGroup#outputs|`output`} connector.
     */
    protected changeConnectorName(
        group: NodeGroup,
        datum: DatumNodeInfo,
        isInput: boolean
    ): void {
        this.matDialog.open(StringInputDialogComponent, {
            data: {
                confirmText:  'Edit',
                title:        'Edit group input name',
                defaultValue: group.getAlias(datum, isInput) ?? datum.datum.name,
                hint:         'Select a name for the input',
                inputLabel:   'New name'
            }
        })
            .afterClosed()
            .subscribe((result) => {
                if (result != null) {
                    group.changeAlias(datum, result, isInput);
                    this.doBackup();
                }
            });
    }

    /**
     * Open a dialog to ask for a new {@link NodeGroup#name|`NodeGroup.name`}, and set it if successful.
     *
     * @param {NodeGroup} group - The {@link NodeGroup|`NodeGroup`} to rename.
     */
    protected changeGroupName(
        group: NodeGroup
    ): void {
        this.matDialog.open(StringInputDialogComponent, {
            data: {
                confirmText:  'Edit',
                title:        'Edit group name',
                defaultValue: group.name,
                hint:         'Select a name for the group',
                inputLabel:   'New name'
            }
        })
            .afterClosed()
            .subscribe((result) => {
                if (result != null) {
                    group.name = result;
                    this.doBackup();
                }
            });
    }

    /** The elements to show in the toolbar. */
    protected get toolbarElements(): ToolbarElement[] {
        return this.filterToolbar();
    }

    /**
     * Filters a list of {@link ToolbarElement|`ToolbarElement`s} returning only the elements that
     * should be shown given the current state of the component.
     *
     * @param {ToolbarElement[]} toFilter - The list of {@link ToolbarElement|`ToolbarElement`s} to filter. Defaults to {@link ALL_TOOLBAR_ELEMENTS|`ALL_TOOLBAR_ELEMENTS`}.
     * @returns {ToolbarElement[]} The filtered list of {@link ToolbarElement|`ToolbarElement`s}.
     */
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
            })
            .filter(element => {
                if (element.type == ToolBarElementType.BUTTON && element.submenu != null) {
                    return element.submenu.length > 0;
                } else {
                    return true;
                }
            });
    }

    /**
     * Checks whether a {@link ToolbarElement|`ToolbarElement`s} should be shown given the current state of the component.
     *
     * @param {ToolbarElement} elementOrAction - The {@link ToolbarElement|`ToolbarElement`} to check.
     * @returns {boolean} Whether the element should be shown.
     */
    private isToolbarElementVisible(elementOrAction: ToolbarElement): boolean {
        const action = elementOrAction.id as ToolbarAction;
        if (this.loadingStatus !== LoadingStatus.LOADED) {
            return action == ToolbarAction.BACK;
        }
        switch (action) {
            case ToolbarAction.CUT:
            case ToolbarAction.COPY:
                return this.selectedElements
                           .every(
                               selectedElement =>
                                   selectedElement.type == SelectedElementType.NODE
                                   || selectedElement.type == SelectedElementType.NODE_GROUP
                           )
                       && (this.selectedElements.length != 0);
            case ToolbarAction.PASTE:
                return this.copiedElements != null;
            case ToolbarAction.UNGROUP:
                return this.selectedElements.length == 1
                       && this.selectedElements
                              .every(
                                  selectedElement =>
                                      selectedElement.type == SelectedElementType.NODE_GROUP
                              );
            case ToolbarAction.REMOVE_FROM_GROUP:
                return this.selectedElements.length > 0
                       && this.selectedElements
                              .every(
                                  selectedElement =>
                                      selectedElement.type == SelectedElementType.NODE
                                      || selectedElement.type == SelectedElementType.NODE_GROUP
                              );
            case ToolbarAction.GROUP: {
                return this.selectedElements
                           .every(
                               selectedElement =>
                                   selectedElement.type == SelectedElementType.NODE
                                   || selectedElement.type == SelectedElementType.NODE_GROUP
                           )
                       && (this.selectedElements.length > 1)
                       && this.uiManager.canFormGroup(
                        this
                            .selectedElements
                            .map(element => {
                                     if (element.type == SelectedElementType.NODE) {
                                         return element.node;
                                     } else {
                                         return element.group;
                                     }
                                 }
                            )
                    );
            }
            case ToolbarAction.BACKUPS:
                return this.mixBackups?.hasUnopenedBackups ?? false;
            case ToolbarAction.BACK:
                return true;
            case ToolbarAction.SAVE:
            case ToolbarAction.ADD:
            case ToolbarAction.REARRANGE:
            default:
                return true;
            case ToolbarAction.RENAME:
                if (this.selectedElements.length == 1) {
                    const selectedElement = this.selectedElements[0];
                    if (selectedElement?.type == SelectedElementType.NODE_GROUP) {
                        return true;
                    }
                }
                return false;
            case ToolbarAction.DELETE:
                return this.selectedElements.length > 0
                       &&
                       (
                           this
                               .selectedElements
                               .every(
                                   element => {
                                       return (
                                           (element.type != SelectedElementType.OUTPUT || this.exposes == null)
                                           && element.type != SelectedElementType.NODE_GROUP
                                       );
                                   })
                       );
        }
    }

    /**
     * Performs the action linked to a {@link ToolbarButton|`ToolbarButton`}'s click.
     *
     * @param {ToolbarAction} id - The {@link ToolbarButton#id|`id`} of the {@link ToolbarButton|`ToolbarButton`} that was clicked.
     */
    protected toolbarClick(id: ToolbarAction): void {
        switch (id) {
            case ToolbarAction.UNGROUP: {
                const firstElement = this.selectedElements[0];
                if (firstElement?.type == SelectedElementType.NODE_GROUP) {
                    this.uiManager.deleteGroup(firstElement.group);
                }
                break;
            }
            case ToolbarAction.REMOVE_FROM_GROUP: {
                this.degroupSelected();
                break;
            }
            case ToolbarAction.GROUP: {
                this.groupSelected();
                break;
            }
            case ToolbarAction.BACKUPS:
                if (this.mixBackups == null) {
                    return;
                }
                this.openBackupDialog();
                break;
            case ToolbarAction.BACK:
                this.back();
                break;
            case ToolbarAction.DELETE:
                this.deleteSelected();
                break;
            case ToolbarAction.CUT: {
                this.toolbarClick(ToolbarAction.COPY);
                this.toolbarClick(ToolbarAction.DELETE);
                break;
            }
            case ToolbarAction.COPY: {
                this.copySelected();
                break;
            }
            case ToolbarAction.PASTE: {
                this.paste();
                break;
            }
            case ToolbarAction.REARRANGE:
                this.matDialog
                    .open(ConfirmDialogComponent, {
                        data: {
                            title:       'Rearrange nodes',
                            message:     'By rearranging the mix, you will lose all the current placement of nodes. Do you want to proceed?',
                            confirmText: 'Rearrange'
                        }
                    })
                    .afterClosed()
                    .subscribe(result => {
                        if (result === true) {
                            this.uiManager.rearrangeNodes();
                        }
                    });
                break;
            case ToolbarAction.RENAME:
                if (this.selectedElements.length == 1) {
                    const selectedElement = this.selectedElements[0];
                    if (selectedElement?.type == SelectedElementType.NODE_GROUP) {
                        this.changeGroupName(selectedElement.group);
                    }
                }
                break;
            case ToolbarAction.SAVE: {
                this.saveMix();
                break;
            }
            case ToolbarAction.ADD:
                this.addNode();
                break;
        }
    }

    /** Remove the selected elements from their containing group. */
    private degroupSelected(): void {
        const toDegroup =
                  this
                      .selectedElements
                      .filter(
                          (selectedElement): selectedElement is (SelectedElementNode | SelectedElementNodeGroup) =>
                              selectedElement.type == SelectedElementType.NODE
                              || selectedElement.type == SelectedElementType.NODE_GROUP
                      )
                      .map(element => {
                               if (element.type == SelectedElementType.NODE) {
                                   return element.node;
                               } else {
                                   return element.group;
                               }
                           }
                      );
        this.uiManager.degroup(toDegroup);
    }

    /** Create a new group containing the selected elements, if possible. */
    private groupSelected(): void {
        const newGroupNodes =
                  this
                      .selectedElements
                      .filter(
                          (selectedElement): selectedElement is (SelectedElementNode | SelectedElementNodeGroup) =>
                              selectedElement.type == SelectedElementType.NODE
                              || selectedElement.type == SelectedElementType.NODE_GROUP
                      )
                      .map(element => {
                               if (element.type == SelectedElementType.NODE) {
                                   return element.node;
                               } else {
                                   return element.group;
                               }
                           }
                      );
        this.uiManager.createGroup(newGroupNodes);
    }

    /** Open a dialog showing the saved backups for this {@link MixComponent#mix|`mix`}. */
    private openBackupDialog(): void {
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
    }

    /** Confirm exit and go back to the mixing screen.  */
    private back(): void {
        if (SAVE_BUTTON.badge == true) {
            this.matDialog.open(ConfirmDialogComponent, {
                data: {
                    title:       'Confirm exit',
                    message:     'There are unsaved changes. Do you want to leave? A backup of the unsaved changes will be kept.',
                    confirmText: 'Leave',
                    cancelText:  'Stay'
                }
            })
                .afterClosed()
                .subscribe(result => {
                    if (result === true) {
                        void this.router.navigate(['mixing']);
                    }
                });
        } else {
            void this.router.navigate(['mixing']);
        }
    }

    /** Delete the selected elements. */
    private deleteSelected(): void {
        for (const selectedElement of this.selectedElements) {
            switch (selectedElement.type) {
                case SelectedElementType.INPUT:
                    this.mix?.removeImport(selectedElement.exportedDatum);
                    this.doBackup();
                    this.uiManager.refreshMix();
                    this.errorImports = this.errorImports.filter(imp => imp != selectedElement.exportedDatum.uniqueName);
                    return;
                case SelectedElementType.NODE:
                    this.mix?.removeNode(selectedElement.node);
                    this.doBackup();
                    this.uiManager.refreshMix();
                    this.uiManager.nodeDeleted(selectedElement.node);
                    return;
                case SelectedElementType.OUTPUT:
                    if (this.exposes != null) {
                        return;
                    }
                    this.mix?.removeOutput(selectedElement.datum);
                    this.doBackup();
                    this.uiManager.refreshMix();
                    return;
                case SelectedElementType.CONNECTION:
                    this.mix?.removeConnection(selectedElement.connection);
                    this.doBackup();
                    this.uiManager.removeConnection(selectedElement.connection);
                    return;
                case SelectedElementType.NODE_GROUP:
                    return;
            }
        }
        this.selectedElements = [];
    }

    /** Copy the selected elements to the clipboard. */
    private copySelected(): void {
        if (this.mix != null) {
            const nodesToCopy   = [
                ...(
                    new Set<ElaborationNode>(
                        this
                            .selectedElements
                            .flatMap(
                                element => {
                                    if (element.type == SelectedElementType.NODE) {
                                        return [element.node];
                                    } else if (element.type == SelectedElementType.NODE_GROUP) {
                                        return element.group.allNodes;
                                    } else {
                                        return [];
                                    }
                                }
                            )
                    )
                ).values()
            ];
            const nodeReference = nodesToCopy[0];
            if (nodeReference == null) {
                return;
            }
            const connectionsToCopy     = this.mix.connections.filter(connection => {
                let sourceOk = false;
                if (connection.sourceType == ConnectionSourceType.CONSTANT) {
                    sourceOk = true;
                }
                if (connection.sourceType == ConnectionSourceType.NODE) {
                    sourceOk = nodesToCopy.some(node => node.id == connection.sourceNodeId);
                }
                if (!sourceOk) {
                    return false;
                }
                if (connection.drainType == ConnectionDrainType.NODE) {
                    return nodesToCopy.some(node => node.id == connection.drainNodeId);
                } else {
                    return false;
                }
            });
            const nodeReferencePosition = this.uiManager.getNodePosition(nodeReference);
            this.copiedElements         = {
                nodes:        nodesToCopy.map(node => node.toJSON()),
                connections:  connectionsToCopy.map(connection => ConnectionJSON.fromConnection(connection)),
                translations: nodesToCopy.map(node => {
                    const position = this.uiManager.getNodePosition(node);
                    return {
                        id:          node.id,
                        translation: {
                            x: position.x - nodeReferencePosition.x,
                            y: position.y - nodeReferencePosition.y
                        }
                    };
                })
            };
            this.localStorageService.setItem(COPY_STORAGE_KEY, this.copiedElements);
        }
    }

    /** Paste the elements in the clipboard into the {@link MixComponent#mix|`mix`}. */
    private paste(): void {
        const mix = this.mix;
        if (mix != null) {
            const copiedElements = this.copiedElements;
            if (copiedElements == null) {
                return;
            }
            const idMaps: Map<number, number> = new Map<number, number>();
            const baseId                      = this.nextId;
            copiedElements.nodes.sort((a, b) => a.id - b.id);
            copiedElements.nodes.forEach((node, index) => idMaps.set(node.id, baseId + index));
            const minX =
                      copiedElements
                          .translations
                          .reduce<number | null>
                          (
                              (accum, translation) =>
                                  accum == null
                                      ? translation.translation.x
                                      : Math.min(accum, translation.translation.x),
                              null
                          );
            const minY =
                      copiedElements
                          .translations
                          .reduce<number | null>
                          (
                              (accum, translation) =>
                                  accum == null
                                      ? translation.translation.y
                                      : Math.min(accum, translation.translation.y),
                              null
                          );
            const maxX =
                      copiedElements
                          .translations
                          .reduce<number | null>
                          (
                              (accum, translation) =>
                                  accum == null
                                      ? translation.translation.x
                                      : Math.max(accum, translation.translation.x + MEASURES.NODE_WIDTH),
                              null
                          );
            const maxY =
                      copiedElements
                          .translations
                          .reduce<number | null>
                          (
                              (accum, translation) =>
                                  accum == null
                                      ? translation.translation.y
                                      : Math.min(
                                          accum,
                                          translation.translation.y + MEASURES.NODE_HEADING_HEIGHT + MEASURES.NODE_CONNECTION_HEIGHT + MEASURES.NODE_INTERNAL_SPACING * 2
                                      ),
                              null
                          );
            if (minX == null || minY == null || maxX == null || maxY == null) {
                return;
            }
            const center = this.uiManager.screenCenter;
            const baseX  = Math.max(0, center.x - (maxX - minX) / 2);
            const baseY  = center.y - (maxY - minY) / 2;
            copiedElements.nodes.forEach(nodeJSON => {
                const oldId = nodeJSON.id;
                const newId = idMaps.get(nodeJSON.id);
                if (newId != null) {
                    nodeJSON.id = newId;
                    const node  = ElaborationNode.fromJSON(nodeJSON);
                    mix.addNode(node);
                    this.uiManager.addNode(node);
                    const translation =
                              copiedElements
                                  .translations
                                  .find(
                                      otherTranslation =>
                                          otherTranslation.id == oldId)
                                  ?.translation ?? {x: 0, y: 0};
                    this.uiManager.setNodePosition(
                        node,
                        {
                            x: baseX + translation.x,
                            y: baseY + translation.y
                        }
                    );
                }
            });
            copiedElements.connections.forEach(connectionJSON => {
                const connection = ConnectionJSON.toConnection(connectionJSON);
                if (connection.sourceType == ConnectionSourceType.NODE) {
                    const nodeId = idMaps.get(connection.sourceNodeId);
                    if (nodeId == null) {
                        return;
                    }
                    connection.sourceNodeId = nodeId;
                }
                if (connection.drainType == ConnectionDrainType.NODE) {
                    const nodeId = idMaps.get(connection.drainNodeId);
                    if (nodeId == null) {
                        return;
                    }
                    connection.drainNodeId = nodeId;
                }
                mix.addConnection(connection);
                this.uiManager.addConnection(connection);
            });
            this.doBackup();
        }
    }

    /** Push the new state of the {@link MixComponent#mix|`mix`} to the server. */
    private saveMix(): void {
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
                .then(() =>
                          this
                              .mixService
                              .updateMixLayout(this.uiManager.exportLayout(), {id: mix.id as number})
                )
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
    }

    /**
     * The subject publishing {@link KeyboardEvent|`KeyboardEvent`s} in the component
     * to pass to {@link ToolbarComponent#keyObservable|`ToolbarComponent.keyObservable`}.
     */
    protected keySubject: Subject<KeyboardEvent> = new Subject<KeyboardEvent>();

    /**
     * Key up event listener on the component.
     *
     * @param {KeyboardEvent} event - The DOM event.
     */
    @HostListener('keydown', ['$event'])
    public onKeyDown(event: KeyboardEvent): void {
        this.keySubject.next(event);
    }

    /** Save the current state of the {@link MixComponent#mix|`mix`} to local storage as a backup, overwriting the current one if it exists. */
    protected doBackup(): void {
        if (this.mix != null && this.mixPosition != null) {
            this.mixBackups ??= new MixBackups(this.mix.id);
            if (this.mixBackups.editingBackup == null) {
                this.mixBackups.addBackup(this.mix, this.mixPosition, this.uiManager.exportLayout(), true);
            } else {
                this.mixBackups.editingBackup.layout = this.uiManager.exportLayout();
            }
            SAVE_BUTTON.badge = true;
            this.saveBackups();
        }
    }

    /** Persist this.{@link MixComponent#mixBackups|`mixBackups`} to the local storage. */
    protected saveBackups(): void {
        if (this.mixBackups != null && this.mix != null && this.mixPosition != null) {
            if (!this.mixBackups.hasBackups) {
                this.localStorageService.removeItem(
                    new LocalStorageObject<MixBackups | null>(
                        `mix-save.${this.mix.id}`,
                        null
                    ));
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

    /**
     * Casts a `string` to a {@link ToolbarAction|`ToolbarAction`}.
     * Does not check for the real existence of an action with such name.
     *
     * @param {string} val - The string representation of a {@link ToolbarAction|`ToolbarAction`}.
     * @returns {ToolbarAction} `val` cast as {@link ToolbarAction|`ToolbarAction`}.
     */
    protected asToolbarAction(val: string): ToolbarAction { return val as ToolbarAction; }

    /** @ignore */
    protected readonly MEASURES: typeof MEASURES                           = MEASURES;
    /** @ignore */
    protected readonly Math: Math                                          = Math;
    /** @ignore */
    protected readonly getColorVarNameForType: (type: DatumType) => string = getColorVarNameForType;
    /** @ignore */
    protected readonly ConnectionSourceType: typeof ConnectionSourceType   = ConnectionSourceType;
    /** @ignore */
    protected readonly DatumType: typeof DatumType                         = DatumType;
    /** @ignore */
    protected readonly DatumTypeColorBase: typeof DatumTypeColorBase       = DatumTypeColorBase;
    /** @ignore */
    protected readonly Datum: typeof Datum                                 = Datum;
    /** @ignore */
    protected readonly ELABORATION_NODE_DISPLAY_NAME                       = ELABORATION_NODE_DISPLAY_NAME;
    /** @ignore */
    protected readonly LoadingStatus                                       = LoadingStatus;
    /** @ignore */
    protected readonly DATUM_ORIGIN_DISPLAY                                = DATUM_ORIGIN_DISPLAY;
    /** @ignore */
    protected readonly getExternalDatumOriginNameDisplay                   = getExternalDatumOriginNameDisplay;
    /** @ignore */
    protected readonly SelectedElementType                                 = SelectedElementType;
    /** @ignore */
    protected readonly graphConnectionSmoothPath                           = graphConnectionSmoothPath;
    /** @ignore */
    protected readonly getDateDisplayFormat                                = getDateDisplayFormat;
    /** @ignore */
    protected readonly kelvinToColor                                       = kelvinToColor;
    /** @ignore */
    protected readonly DEFAULT_TEMP                                        = DEFAULT_TEMP;
}

/**
 * Additional information to a {@link Datum|`Datum`} containing information about its special status of additional input.
 */
export interface NodeInputInfo {
    /** The referenced {@link Datum|`Datum`}. */
    datum: Datum;
    /** Whether this datum is the "Add input" input to a {@link ArbitraryInputsElaborationNode|`ArbitraryInputsElaborationNode`}. */
    specialInputAddMore: boolean;
}

/**
 * A {@link SelectedElement|`SelectedElement`} when the underlying entity being selected is a {@link Mix#imports|`import`}.
 *
 * @notExported
 */
interface SelectedElementInput {
    /** The selected entity is a {@link Mix#imports|`import`}. */
    type: SelectedElementType.INPUT,
    /** The {@link Mix#imports|`import`} being selected. */
    exportedDatum: ExportedDatum
}

/**
 * A {@link SelectedElement|`SelectedElement`} when the underlying entity being selected is an {@link ElaborationNode|`ElaborationNode`}.
 *
 * @notExported
 */
interface SelectedElementNode {
    /** The selected entity is an {@link ElaborationNode|`ElaborationNode`}. */
    type: SelectedElementType.NODE,
    /** The {@link ElaborationNode|`ElaborationNode`} being selected. */
    node: ElaborationNode
}

/**
 * A {@link SelectedElement|`SelectedElement`} when the underlying entity being selected is a {@link Mix#imports|`import`}.
 *
 * @notExported
 */
interface SelectedElementOutput {
    /** The selected entity is a {@link Mix#outputs|`output`}. */
    type: SelectedElementType.OUTPUT,
    /** The {@link Mix#outputs|`output`} being selected. */
    datum: Datum
}

/**
 * A {@link SelectedElement|`SelectedElement`} when the underlying entity being selected is a {@link Connection|`Connection`}.
 *
 * @notExported
 */
interface SelectedElementConnection {
    /** The selected entity is a {@link Connection|`Connection`}. */
    type: SelectedElementType.CONNECTION,
    /** The {@link Connection|`Connection`} being selected. */
    connection: Connection
}

/**
 * A {@link SelectedElement|`SelectedElement`} when the underlying entity being selected is an {@link NodeGroup|`NodeGroup`}.
 *
 * @notExported
 */
interface SelectedElementNodeGroup {
    /** The selected entity is an {@link NodeGroup|`NodeGroup`}. */
    type: SelectedElementType.NODE_GROUP,
    /** The {@link NodeGroup|`NodeGroup`} being selected. */
    group: NodeGroup
}

/**
 * Information about an entity selected in the {@link MixComponent|`MixComponent`}.
 *
 * @notExported
 */
type SelectedElement = SelectedElementInput | SelectedElementNode | SelectedElementOutput | SelectedElementConnection | SelectedElementNodeGroup;

/**
 * The entity type being selected in {@link SelectedElement|`SelectedElement`}.
 *
 * @notExported
 */
enum SelectedElementType {
    /** The entity is an {@link Mix#imports|`import`}. */
    INPUT      = 'INPUT',
    /** The entity is an {@link ElaborationNode|`ElaborationNode`}. */
    OUTPUT     = 'OUTPUT',
    /** The entity is a {@link Mix#outputs|`output`}. */
    NODE       = 'NODE',
    /** The entity is a {@link Connection|`Connection`}. */
    CONNECTION = 'CONNECTION',
    /** The entity is a {@link NodeGroup|`NodeGroup`}. */
    NODE_GROUP = 'NODE_GROUP'
}

/**
 * All the actions {@link MixComponent|`MixComponent`}'s {@link ToolbarComponent|`ToolbarComponent`} can offer.
 * Used as {@link ToolbarButton#id|`id`} for the {@link ALL_TOOLBAR_ELEMENTS|toolbar buttons}.
 *
 * @notExported
 */
enum ToolbarAction {
    /** Back button. */
    BACK              = 'back',
    /** Button to save the current state of the {@link MixComponent#mix|`mix`} to server. */
    SAVE              = 'save',
    /** Button to open the dialog with the {@link MixComponent#mix|`mix`} backups. */
    BACKUPS           = 'backups',
    /** Button to add an {@link ElaborationNode|`ElaborationNode`} to the {@link MixComponent#mix|`mix`}. */
    ADD               = 'add',
    /** Button to delete the {@link MixComponent#selectedElements|`selectedElements`}. */
    DELETE            = 'delete',
    /** Button to cut the {@link MixComponent#selectedElements|`selectedElements`} to clipboard. */
    CUT               = 'cut',
    /** Button to copy the {@link MixComponent#selectedElements|`selectedElements`} to clipboard. */
    COPY              = 'copy',
    /** Button to past the contents of the clipboard to the {@link MixComponent#mix|`mix`}. */
    PASTE             = 'paste',
    /** Button rearrange the {@link ElaborationNode|`ElaborationNode`s} in the {@link MixComponent#mix|`mix`}. */
    REARRANGE         = 'rearrange',
    /** Button to group the {@link MixComponent#selectedElements|`selectedElements`} in a {@link NodeGroup|`NodeGroup`}. */
    GROUP             = 'group',
    /** Button to delete the selected {@link NodeGroup|`NodeGroup`} and free its children. */
    UNGROUP           = 'ungroup',
    /** Button to remove the {@link MixComponent#selectedElements|`selectedElements`} from the containing {@link NodeGroup|`NodeGroup`}. */
    REMOVE_FROM_GROUP = 'remove-from-group',
    /** Button to rename the selected {@link NodeGroup|`NodeGroup`}. */
    RENAME            = 'rename'
}

/**
 * The title for {@link MixComponent|`MixComponent`}'s {@link ToolbarComponent|`ToolbarComponent`}.
 *
 * @notExported
 */
const TOOLBAR_TITLE: ToolbarTitle = {
    type:  ToolBarElementType.TITLE,
    id:    'title',
    text:  '',
    order: 1
};

/**
 * The backup button for {@link MixComponent|`MixComponent`}'s {@link ToolbarComponent|`ToolbarComponent`}.
 *
 * @notExported
 */
const BACKUP_BUTTON: ToolbarButton = {
    type:     ToolBarElementType.BUTTON,
    icon:     'history',
    id:       ToolbarAction.BACKUPS,
    hint:     'Auto-saved versions',
    shortcut: {
        codes:      ['KeyB'],
        osModifier: true,
        shift:      false,
        alt:        false
    },
    order:    7
};

/**
 * The save button for {@link MixComponent|`MixComponent`}'s {@link ToolbarComponent|`ToolbarComponent`}.
 *
 * @notExported
 */
const SAVE_BUTTON: ToolbarButton = {
    type:     ToolBarElementType.BUTTON,
    icon:     'save',
    id:       ToolbarAction.SAVE,
    hint:     'Save mix',
    order:    7,
    shortcut: {
        codes:      ['KeyS'],
        osModifier: true,
        shift:      false,
        alt:        false
    },
    badge:    false
};

/**
 * All the {@link ToolbarElement|`ToolbarElement`s} in {@link MixComponent|`MixComponent`}'s {@link ToolbarComponent|`ToolbarComponent`}.
 *
 * @notExported
 */
const ALL_TOOLBAR_ELEMENTS: ToolbarElement[] = [
    {
        type:     ToolBarElementType.BUTTON,
        icon:     'arrow_back',
        id:       ToolbarAction.BACK,
        hint:     'Go back',
        shortcut: {
            codes:      ['Escape'],
            osModifier: false,
            shift:      false,
            alt:        false
        },
        order:    0
    },
    TOOLBAR_TITLE,
    {
        type:  ToolBarElementType.SPACER,
        id:    'space',
        order: 2
    },
    {
        type:     ToolBarElementType.BUTTON,
        icon:     'add',
        id:       ToolbarAction.ADD,
        hint:     'Add node',
        shortcut: {
            codes:      ['KeyI'],
            osModifier: true,
            shift:      false,
            alt:        false
        },
        order:    3
    },
    {
        type:     ToolBarElementType.BUTTON,
        icon:     'delete',
        id:       ToolbarAction.DELETE,
        hint:     'Delete',
        shortcut: {
            codes:      ['Delete', 'Backspace'],
            osModifier: false,
            shift:      false,
            alt:        false
        },
        order:    3
    },
    {
        type:     ToolBarElementType.BUTTON,
        icon:     'content_cut',
        id:       ToolbarAction.CUT,
        hint:     'Cut',
        shortcut: {
            codes:      ['KeyX'],
            osModifier: true,
            shift:      false,
            alt:        false
        },
        order:    3
    },
    {
        type:     ToolBarElementType.BUTTON,
        icon:     'content_copy',
        id:       ToolbarAction.COPY,
        hint:     'Copy',
        shortcut: {
            codes:      ['KeyC'],
            osModifier: true,
            shift:      false,
            alt:        false
        },
        order:    3
    },
    {
        type:     ToolBarElementType.BUTTON,
        icon:     'content_paste',
        id:       ToolbarAction.PASTE,
        hint:     'Paste',
        shortcut: {
            codes:      ['KeyV'],
            osModifier: true,
            shift:      false,
            alt:        false
        },
        order:    3
    },
    {
        type:  ToolBarElementType.DIVIDER,
        id:    'divider-1',
        order: 4
    },
    {
        type:    ToolBarElementType.BUTTON,
        icon:    'cards',
        order:   5,
        id:      'group-menu',
        hint:    'Grouping',
        submenu: [
            {
                type:     ToolBarElementType.BUTTON,
                icon:     'add',
                id:       ToolbarAction.GROUP,
                hint:     'Group nodes',
                shortcut: {
                    codes:      ['KeyG', 'KeyU'],
                    osModifier: true,
                    shift:      false,
                    alt:        false
                },
                order:    1
            },
            {
                type:     ToolBarElementType.BUTTON,
                icon:     'remove_selection',
                id:       ToolbarAction.UNGROUP,
                hint:     'Dissolve group',
                shortcut: {
                    codes:      ['KeyG', 'KeyU'],
                    osModifier: true,
                    shift:      false,
                    alt:        false
                },
                order:    1
            },
            {
                type:     ToolBarElementType.BUTTON,
                icon:     'output',
                id:       ToolbarAction.REMOVE_FROM_GROUP,
                hint:     'Remove from containing group',
                shortcut: {
                    codes:      ['KeyU'],
                    osModifier: true,
                    shift:      true,
                    alt:        false
                },
                order:    1
            }
        ]
    },
    {
        type:     ToolBarElementType.BUTTON,
        icon:     'graph_1',
        id:       ToolbarAction.REARRANGE,
        hint:     'Rearrange nodes in order',
        shortcut: {
            codes:      ['KeyD'],
            osModifier: true,
            shift:      false,
            alt:        false
        },
        order:    5
    },
    {
        type:         ToolBarElementType.BUTTON,
        icon:         '',
        id:           ToolbarAction.RENAME,
        shortcut:     {
            codes:      ['KeyR'],
            osModifier: true,
            shift:      false,
            alt:        false
        },
        shortcutOnly: true,
        order:        5
    },
    {
        type:  ToolBarElementType.DIVIDER,
        id:    'divider-2',
        order: 6
    },
    BACKUP_BUTTON,
    SAVE_BUTTON
];


/** All the {@link MixBackup|`MixBackup`s} relative a single {@link Mix|`Mix`}. */
export class MixBackups {

    /** All the backups saved for the {@link Mix|`Mix`}. */
    private _backups: MixBackup[] = [];

    /** The backup currently being edited in the {@link MixComponent|`MixComponent`}. */
    private _editingBackup: MixBackup | null = null;

    /**
     * Creates an instance of the class.
     *
     * @param {number | 'NEW'} mixId - The {@link Mix#id|`id`} of the {@link Mix|`Mix`} the {@link MixBackups#backups|`backups`} are of.
     */
    constructor(
        public mixId: number | 'NEW'
    ) {

    }

    /** All the backups saved for the {@link Mix|`Mix`}. */
    public get backups(): MixBackup[] {
        return this._backups.slice();
    }

    /** The newest backup saved for the {@link Mix|`Mix`}. */
    public get latestBackup(): MixBackup | null {
        return this._backups[this._backups.length - 1] ?? null;
    }

    /** The backup currently being edited in the {@link MixComponent|`MixComponent`}. */
    public get editingBackup(): MixBackup | null {
        return this._editingBackup;
    }

    /** Change the backup currently being edited in the {@link MixComponent|`MixComponent`}, and add it if not already registered in {@link MixBackups#backups|`backups`}. */
    public set editingBackup(editingBackup: MixBackup | null) {
        this._editingBackup = editingBackup;
        if (editingBackup != null) {
            if (!this._backups.includes(editingBackup)) {
                this.addBackup(editingBackup.mix, editingBackup.position, editingBackup.layout);
            }
        }
    }

    /** Whether the tracked {@link Mix|`Mix`} has saved backups. */
    public get hasBackups(): boolean {
        return this._backups.length > 0;
    }

    /** Whether the tracked {@link Mix|`Mix`} has saved backups other than the one that's {@link MixBackups#editingBackup|being edited}. */
    public get hasUnopenedBackups(): boolean {
        if (!this.hasBackups) {
            return false;
        }
        return this._backups.some(backup => backup != this._editingBackup);
    }

    /** Sort the {@link MixBackups#backups|`backups`} in ascending {@link MixBackup#date|`date`}. */
    private sortBackups(): void {
        this._backups.sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    /**
     * Add a new backup to the tracked {@link MixBackups#backups|`backups`}.
     *
     * @param {Mix} newMix - The status of the {@link Mix|`Mix`} to dave.
     * @param {MixPositionInfo} mixInfo - The {@link MixPositionInfo|`MixPositionInfo`} of the {@link Mix|`Mix`} to save.
     * @param {MixLayout} layout - The {@link MixLayout|`MixLayout`} of the {@link Mix|`Mix`} to save.
     * @param {boolean} setEditing - Whether the new backup should be set as the one that's {@link MixBackups#editingBackup|being edited}.
     * @returns {MixBackup} The newly created {@link MixBackup|`MixBackup`}.
     */
    public addBackup(newMix: Mix, mixInfo: MixPositionInfo, layout: MixLayout, setEditing: boolean = false): MixBackup {
        const backup = {
            date:     new Date(),
            mix:      newMix,
            position: mixInfo,
            layout
        };
        this._backups.push(backup);
        this.sortBackups();
        if (setEditing) {
            this._editingBackup = backup;
        }
        return backup;
    }

    /**
     * Remove a {@link MixBackup|`MixBackup`} from the registered {@link MixBackups#backups|`backups`}.
     *
     * @param {MixBackup | null} backup - The backup to remove.
     */
    public removeBackup(backup: MixBackup | null): void {
        if (backup == null) {
            return;
        }
        this._backups = this._backups.filter(otherBackup => otherBackup != backup);
        if (this._editingBackup == backup) {
            this._editingBackup = null;
        }
    }

    /**
     * Constructs a new {@link MixBackups|`MixBackups`} instance from a given JSON representation.
     *
     * @param {unknown} mixBackupsJSON - The JSON representation of the mix backups.
     * @returns {MixBackups} The mix backups object constructed from the provided JSON.
     * @throws {Error} If `mixBackupsJSON` is not a well formed {@link MixBackupsJSON|`MixBackupsJSON`}.
     */
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
                position: position,
                layout:   backup.layout
            };
        });
        mixBackups.sortBackups();
        return mixBackups;
    }

    /**
     * Converts a mix backups instance into its JSON representation.
     *
     * @param {MixBackups | null} mixBackups - The {@link MixBackups|`MixBackups`} to serialize.
     * @returns {MixBackupsJSON | null} The JSON representation of the passed instance.
     */
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
                                       position: MixPositionInfoJSON.toJSON(backup.position),
                                       layout:   backup.layout
                                   };
                               })
        };
    }
}

/**
 * The serialization of the class {@link MixBackup|`MixBackup`}.
 */
export interface MixBackupsJSON {
    /** Serialization of the property {@link MixBackups#mixId|`mixId`}. */
    mixId: number | 'NEW';
    /** Serialization of the property {@link MixBackups#backups|`backups`}. */
    backups: MixBackupJSON[];
}

/**
 * A single backup of a {@link Mix|`Mix`}.
 */
export interface MixBackup {
    /** The backup date. */
    date: Date,
    /** The {@link MixPositionInfo|`MixPositionInfo`} of the {@link Mix|`Mix`}. */
    position: MixPositionInfo,
    /** The {@link Mix|`Mix`}. */
    mix: Mix,
    /** The {@link MixLayout|`MixLayout`} of the {@link Mix|`Mix`}. */
    layout: MixLayout
}

/**
 * The serialization of the class {@link MixBackup|`MixBackup`}.
 */
export interface MixBackupJSON {
    /** Serialization of the property {@link MixBackup#date|`date`}.  */
    date: number,
    /** Serialization of the property {@link MixBackup#position|`position`}.  */
    position: MixPositionInfoJSON,
    /** Serialization of the property {@link MixBackup#mix|`mix`}.  */
    mix: MixJSON,
    /** Serialization of the property {@link MixBackup#layout|`layout`}.  */
    layout: MixLayout
}

/**
 * Copied {@link Mix|`Mix`} elements.
 */
export interface MixCopy {
    /** The copied {@link ElaborationNode|`ElaborationNode`s}. */
    nodes: ElaborationNodeJSON[],
    /** The copied {@link Connection|`Connection`s}. */
    connections: ConnectionJSON[],
    /** The position of every copied {@link MixCopy#nodes|`node`} from the origin. */
    translations: {
        /** The position coordinates. */
        translation: Point,
        /** The id of the referenced {@link ElaborationNode|`ElaborationNode`}. */
        id: number
    }[]
}

/** The storage key for saving the copied elements in a {@link MixComponent|`MixComponent`}. */
export
/** The storage key for saving the copied elements in a {@link MixComponent|`MixComponent`}. */
const COPY_STORAGE_KEY: LocalStorageObject<MixCopy | null> = new LocalStorageObject<MixCopy | null>('mix-copied-elements', null);
