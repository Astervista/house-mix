/**
 * This module contains the {@link MixingComponent|mixing view} component and related classes.
 *
 * @module
 */
import {AfterViewInit, Component, Directive, ElementRef, HostListener, Input, OnDestroy, QueryList, ViewChildren} from '@angular/core';
import {ToolbarComponent, ToolbarElement, ToolBarElementType} from '../auxiliary/toolbar/toolbar.component';
import {Router} from '@angular/router';
import {BetterMatDialog} from '../../utils/better-mat-dialog';
import {AddMixDialogComponent} from '../dialogs/add-mix-dialog/add-mix-dialog.component';
import {MixingService} from '../../services/mixing.service';
import {MixGraphElement, MixingGraph, MixingGraphActuator, MixingGraphCenter, MixingGraphDependency, MixingGraphGroup, MixingGraphSensor} from '@common/mixing/mixing-graph';
import {DatumOrigin} from '@common/mixing/mix/datum';
import {DATUM_ORIGIN_DISPLAY, graphConnectionSmoothPath, Line, MEASURES} from './constants';
import {DynamicSvgComponent} from '../auxiliary/dynamic-svg/dynamic-svg.component';
import {ACTUATOR_TYPE_ICON, SENSOR_TYPE_ICON} from '../entities/devices/device/constants';
import {MatButton, MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {Subject, Subscription} from 'rxjs';
import {Point} from '@angular/cdk/drag-drop';
import {ResizeEventDirective} from '../../directives/resize-event/resize-event.directive';
import {ConfirmDialogComponent} from '../dialogs/confirm-dialog/confirm-dialog.component';
import {SNACKBAR_TIMEOUT, TOOLTIP_TIMEOUT} from '../../utils/constants';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatTooltip} from '@angular/material/tooltip';
import {MixPhase, MixTarget} from '@common/mixing/mix/rest-classes';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {LoadingStatus} from '../../utils/enums';

// noinspection ES6UnusedImports
import type {Mix} from '@common/mixing/mix/mix';
// noinspection ES6UnusedImports
import type {Actuator} from '@common/devices/actuator/actuator';
// noinspection ES6UnusedImports
import type {Sensor} from '@common/devices/sensor/sensor';
// noinspection ES6UnusedImports
import type {ToolbarButton} from '../auxiliary/toolbar/toolbar.component';
// noinspection ES6UnusedImports
import type {Group} from '@common/devices/group/group';

/**
 * Any one of the directives that attaches to an element in {@link MixingComponent|`MixingComponent`}'s template
 * representing a {@link MixGraphElement|`MixGraphElement`} in the graph.
 *
 * @notExported
 */
type ElementDirective = OriginElementDirective | SensorElementDirective | GroupElementDirective | CenterElementDirective | ActuatorElementDirective;

/**
 * Directive that attaches to an element in {@link MixingComponent|`MixingComponent`}'s template
 * representing a {@link TopDatumOrigin|`TopDatumOrigin`} in the {@link MixingGraph|`MixingGraph`}.
 * Accepts the {@link TopDatumOrigin|`TopDatumOrigin`} object and returns it with the
 * {@link OriginElementDirective#getElement|`getElement()`} method.
 *
 * @directive
 * @directiveName `[origin-element]`
 */
@Directive({
               selector: '[origin-element]'
           })
export class OriginElementDirective {

    /**
     * The {@link TopDatumOrigin|`TopDatumOrigin`} referenced by the node.
     *
     * @input
     * @inputAlias origin-element
     */
    @Input('origin-element')
    public originElement!: TopDatumOrigin;

    /**
     * Creates an instance of the directive. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {ElementRef<HTMLElement>} elementRef - The reference to the DOM element.
     */
    constructor(public elementRef: ElementRef<HTMLElement>) {}

    /**
     * Returns the {@link TopDatumOrigin|`TopDatumOrigin`} referenced by the node passed to the directive.
     *
     * @returns {TopDatumOrigin} - The {@link TopDatumOrigin|`TopDatumOrigin`} referenced by the node.
     */
    public getElement(): TopDatumOrigin {
        return this.originElement;
    }

}

/**
 * Directive that attaches to an element in {@link MixingComponent|`MixingComponent`}'s template
 * representing a {@link MixingGraphSensor|`MixingGraphSensor`} in the {@link MixingGraph|`MixingGraph`}.
 * Accepts the {@link MixingGraphSensor|`MixingGraphSensor`} object and returns it with the
 * {@link SensorElementDirective#getElement|`getElement()`} method.
 *
 * @directive
 * @directiveName `[sensor-element]`
 */
@Directive({
               selector: '[sensor-element]'
           })
export class SensorElementDirective {

    /**
     * The {@link MixingGraphSensor|`MixingGraphSensor`} referenced by the node.
     *
     * @input
     * @inputAlias sensor-element
     */
    @Input('sensor-element')
    public sensorElement!: MixingGraphSensor;

    /**
     * Creates an instance of the directive. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {ElementRef<HTMLElement>} elementRef - The reference to the DOM element.
     */
    constructor(public elementRef: ElementRef<HTMLElement>) {}

    /**
     * Returns the {@link MixingGraphSensor|`MixingGraphSensor`} referenced by the node passed to the directive.
     *
     * @returns {MixingGraphSensor} - The {@link MixingGraphSensor|`MixingGraphSensor`} referenced by the node.
     */
    public getElement(): MixingGraphSensor {
        return this.sensorElement;
    }

}

/**
 * Directive that attaches to an element in {@link MixingComponent|`MixingComponent`}'s template
 * representing a {@link MixingGraphGroup|`MixingGraphGroup`} in the {@link MixingGraph|`MixingGraph`}.
 * Accepts the {@link MixingGraphGroup|`MixingGraphGroup`} object and returns it with the
 * {@link GroupElementDirective#getElement|`getElement()`} method.
 *
 * @directive
 * @directiveName `[group-element]`
 */
@Directive({
               selector: '[group-element]'
           })
export class GroupElementDirective {

    /**
     * The {@link MixingGraphGroup|`MixingGraphGroup`} referenced by the node.
     *
     * @input
     * @inputAlias group-element
     * @required
     */
    @Input({
               alias:    'group-element',
               required: true
           })
    public groupElement!: MixingGraphGroup;

    /**
     * Whether this group belongs to the sensor phase.
     *
     * @input
     * @inputAlias group-element-sensor
     * @required
     */
    @Input({
               alias:    'group-element-sensor',
               required: true
           })
    public sensor!: boolean;

    /**
     * Creates an instance of the directive. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {ElementRef<HTMLElement>} elementRef - The reference to the DOM element.
     */
    constructor(public elementRef: ElementRef<HTMLElement>) {}

    /**
     * Returns the {@link MixingGraphGroup|`MixingGraphGroup`} referenced by the node passed to the directive.
     *
     * @returns {MixingGraphGroup} - The {@link MixingGraphGroup|`MixingGraphGroup`} referenced by the node.
     */
    public getElement(): MixingGraphGroup {
        return this.groupElement;
    }

}

/**
 * Directive that attaches to an element in {@link MixingComponent|`MixingComponent`}'s template
 * representing a {@link MixingGraphActuator|`MixingGraphActuator`} in the {@link MixingGraph|`MixingGraph`}.
 * Accepts the {@link MixingGraphActuator|`MixingGraphActuator`} object and returns it with the
 * {@link ActuatorElementDirective#getElement|`getElement()`} method.
 *
 * @directive
 * @directiveName `[actuator-element]`
 */
@Directive({
               selector: '[actuator-element]'
           })
export class ActuatorElementDirective {

    /**
     * The {@link MixingGraphActuator|`MixingGraphActuator`} referenced by the node.
     *
     * @input
     * @inputAlias actuator-element
     * @required
     */
    @Input({
               alias:    'actuator-element',
               required: true
           })
    public actuatorElement!: MixingGraphActuator;

    /**
     * Creates an instance of the directive. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {ElementRef<HTMLElement>} elementRef - The reference to the DOM element.
     */
    constructor(public elementRef: ElementRef<HTMLElement>) {}

    /**
     * Returns the {@link MixingGraphActuator|`MixingGraphActuator`} referenced by the node passed to the directive.
     *
     * @returns {MixingGraphActuator} - The {@link MixingGraphActuator|`MixingGraphActuator`} referenced by the node.
     */
    public getElement(): MixingGraphActuator {
        return this.actuatorElement;
    }

}

/**
 * Directive that attaches to an element in {@link MixingComponent|`MixingComponent`}'s template
 * representing a {@link MixingGraphCenter|`MixingGraphCenter`} in the {@link MixingGraph|`MixingGraph`}.
 * Accepts the {@link MixingGraphCenter|`MixingGraphCenter`} object and returns it with the
 * {@link CenterElementDirective#getElement|`getElement()`} method.
 *
 * @directive
 * @directiveName `[center-element]`
 */
@Directive({
               selector: '[center-element]'
           })
export class CenterElementDirective {

    /**
     * The {@link MixingGraphCenter|`MixingGraphCenter`} referenced by the node.
     *
     * @input
     * @inputAlias center-element
     * @required
     */
    @Input({
               alias:    'center-element',
               required: true
           })
    public centerElement!: MixingGraphCenter;

    /**
     * Creates an instance of the directive. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {ElementRef<HTMLElement>} elementRef - The reference to the DOM element.
     */
    constructor(public elementRef: ElementRef<HTMLElement>) {}

    /**
     * Returns the {@link MixingGraphCenter|`MixingGraphCenter`} referenced by the node passed to the directive.
     *
     * @returns {MixingGraphCenter} - The {@link MixingGraphCenter|`MixingGraphCenter`} referenced by the node.
     */
    public getElement(): MixingGraphCenter {
        return this.centerElement;
    }

}

/**
 * The component for the "mixing" view, showing the system's {@link MixingGraph|`MixingGraph`},
 * allowing for the creation and editing of {@link Mix|`Mix`es} in the system.
 *
 * @component
 * @componentSelector `<house-mix-mixing>`
 */
@Component({
               selector:    'house-mix-mixing',
               imports:     [
                   ToolbarComponent,
                   DynamicSvgComponent,
                   MatIconButton,
                   MatIcon,
                   OriginElementDirective,
                   SensorElementDirective,
                   GroupElementDirective,
                   CenterElementDirective,
                   ActuatorElementDirective,
                   ResizeEventDirective,
                   MatTooltip,
                   MatButton,
                   MatProgressSpinner
               ],
               templateUrl: './mixing.component.html',
               styleUrl:    './mixing.component.scss'
           })
export class MixingComponent implements AfterViewInit, OnDestroy {

    /** The system's {@link MixingGraph|`MixingGraph`} to display.  */
    protected graph: MixingGraph | null = null;
    /** A promise that will be resolved when {@link MixingComponent#graph|`graph`} has been loaded. */
    private graphReady: Promise<MixingGraph>;
    /**
     * The different levels the {@link Mix|`Mix`es} linked to {@link Sensor|`Sensor`s} are arranged in.
     *
     * @see {@link MixingGraph#generateGroupLevels| `generateGroupLevels()`} for a definition of what levels are.
     */
    protected sensorGroupsLevels: MixingGraphGroup[][]   = [];
    /**
     * The different levels the {@link Mix|`Mix`es} linked to {@link Actuator|`Actuator`s} are arranged in.
     *
     * @see {@link MixingGraph#generateGroupLevels| `generateGroupLevels()`} for a definition of what levels are.
     */
    protected actuatorGroupsLevels: MixingGraphGroup[][] = [];
    /**
     * {@link MixGraphElement|`MixGraphElement`s} shown at the same horizontal level can be reordered to tidy up the {@link MixingComponent#graph|`graph`}.
     * This map contains all the order position of every element, keyed by the element itself.
     */
    protected orders: Map<MixGraphElement, number> = new Map<MixGraphElement, number>();

    /** The {@link MixGraphElement|`MixGraphElement`} or {@link TopDatumOrigin|`TopDatumOrigin`} that is currently selected. `null` means no element is selected. */
    private _selectedElement: MixGraphElement | TopDatumOrigin | null = null;

    /** The {@link MixPhase|`MixPhase`} currently being selected. `null` means no phase is selected. */
    private _selectedPhase: MixGraphPhase | null = null;

    /**
     * All the {@link MixingComponent#graph|`graph`} nodes marked with the {@link OriginElementDirective|`OriginElementDirective`}.
     *
     * @viewChildren {@link OriginElementDirective|`OriginElementDirective`}
     */
    @ViewChildren(OriginElementDirective)
    private originElements!: QueryList<OriginElementDirective>;
    /**
     * All the {@link MixingComponent#graph|`graph`} nodes marked with the {@link SensorElementDirective|`SensorElementDirective`}.
     *
     * @viewChildren {@link SensorElementDirective|`SensorElementDirective`}
     */
    @ViewChildren(SensorElementDirective)
    private sensorElements!: QueryList<SensorElementDirective>;
    /**
     * All the {@link MixingComponent#graph|`graph`} nodes marked with the {@link GroupElementDirective|`GroupElementDirective`}.
     *
     * @viewChildren {@link GroupElementDirective|`GroupElementDirective`}
     */
    @ViewChildren(GroupElementDirective)
    private groupElements!: QueryList<GroupElementDirective>;
    /**
     * All the {@link MixingComponent#graph|`graph`} nodes marked with the {@link CenterElementDirective|`CenterElementDirective`}.
     *
     * @viewChildren {@link CenterElementDirective|`CenterElementDirective`}
     */
    @ViewChildren(CenterElementDirective)
    private centerElements!: QueryList<CenterElementDirective>;
    /**
     * All the {@link MixingComponent#graph|`graph`} nodes marked with the {@link ActuatorElementDirective|`ActuatorElementDirective`}.
     *
     * @viewChildren {@link ActuatorElementDirective|`ActuatorElementDirective`}
     */
    @ViewChildren(ActuatorElementDirective)
    private actuatorElements!: QueryList<ActuatorElementDirective>;

    /** The corner coordinates of every {@link MixGraphElement|`MixingGraphElement`} in the graph, used to mask a rectangle around a node. */
    protected elementFootprints: Line[] = [];

    /** All the {@link MixingGraphLink|`MixingGraphLink`s} in the {@link MixingComponent#graph|`graph`}. */
    protected links: MixingGraphLink[] = [];

    /** Whether the {@link TopDatumOrigin|`TopDatumOrigin`} row exceeds the horizontal width and thus should be scrollable. */
    protected originScrollStatus?: boolean;
    /** Whether the {@link MixingGraphSensor|`MixingGraphSensor`} row exceeds the horizontal width and thus should be scrollable. */
    protected sensorScrollStatus?: boolean;
    /** For each level in {@link MixingComponent#sensorGroupsLevels|`sensorGroupsLevels`}, whether its row exceeds the horizontal width and thus should be scrollable. */
    protected sensorGroupScrollStatuses: Map<MixingGraphGroup[], boolean>   = new Map<MixingGraphGroup[], boolean>();
    /** Whether the {@link MixingGraphCenter|`MixingGraphCenter`} row exceeds the horizontal width and thus should be scrollable. */
    protected centerScrollStatus?: boolean;
    /** For each level in {@link MixingComponent#actuatorGroupsLevels|`actuatorGroupsLevels`}, whether its row exceeds the horizontal width and thus should be scrollable. */
    protected actuatorGroupScrollStatuses: Map<MixingGraphGroup[], boolean> = new Map<MixingGraphGroup[], boolean>();
    /** Whether the {@link MixingGraphActuator|`MixingGraphActuator`} row exceeds the horizontal width and thus should be scrollable. */
    protected actuatorScrollStatus?: boolean;

    /** All {@link Subscription|`Subscription`s} opened during the lifecycle of this component to be cleaned up when destroyed. */
    private subscriptions: Subscription[] = [];

    /** The status of the request for loading {@link MixingComponent#graph|`graph`}. */
    protected loadingStatus: LoadingStatus = LoadingStatus.LOADING;

    /** Whether to show a little explanation of what a mix is in the splash screen that's sown when no mix has been created. */
    protected showMeaning: boolean         = false;

    /** The url in the assets folder of a random time-related icon for the loading screen. */
    protected randomIcon: string = Math.random() > 0.5 ? 'clock.svg' : 'hourglass.svg';

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {Router} router - The Angular router. Instantiated by dependency injection.
     * @param {BetterMatDialog} matDialog - The dialog service. Instantiated by dependency injection.
     * @param {MixingService} mixingService - The mixing service. Instantiated by dependency injection.
     * @param {MatSnackBar} snackBar - The snackbar service. Instantiated by dependency injection.
     */
    constructor(
        private router: Router,
        private matDialog: BetterMatDialog,
        private mixingService: MixingService,
        private snackBar: MatSnackBar
    ) {
        this.graphReady = this.reloadGraph();
    }

    /**
     * Implementation of {@link AfterViewInit#ngAfterViewInit| `AfterViewInit.ngAfterViewInit()`}.
     */
    public ngAfterViewInit(): void {
        this.graphReady
            .then(graph => {
                this.subscriptions.push(
                    this
                        .originElements
                        .changes
                        .subscribe(
                            () => {
                                this.recalculateConnections(graph);
                            }
                        ));
                this.subscriptions.push(
                    this
                        .sensorElements
                        .changes
                        .subscribe(
                            () => {
                                this.recalculateConnections(graph);
                            }
                        ));
                this.subscriptions.push(
                    this
                        .groupElements
                        .changes
                        .subscribe(
                            () => {
                                this.recalculateConnections(graph);
                            }
                        ));
                this.subscriptions.push(
                    this
                        .centerElements
                        .changes
                        .subscribe(
                            () => {
                                this.recalculateConnections(graph);
                            }
                        ));
                this.subscriptions.push(
                    this
                        .actuatorElements
                        .changes
                        .subscribe(
                            () => {
                                this.recalculateConnections(graph);
                            }
                        ));
            })
            .then(() => {
                this.loadingStatus = LoadingStatus.LOADED;
            })
            .catch(() => {
                this.loadingStatus = LoadingStatus.ERROR;
            });
    }

    /**
     * Implementation of {@link OnDestroy#ngOnDestroy| `OnDestroy.ngOnDestroy()`}.
     */
    public ngOnDestroy(): void {
        this.subscriptions.forEach(sub => {sub.unsubscribe();});
        this.subscriptions = [];
    }

    /**
     * Reloads all the data in the component. This resets and reconstructs all
     * the structures related to the {@link MixingComponent#graph|`graph`},
     * fetching it again from the server.
     */
    protected reload(): void {
        this.ngOnDestroy();
        this.links                = [];
        this.elementFootprints    = [];
        this.sensorGroupsLevels   = [];
        this.actuatorGroupsLevels = [];
        this._selectedPhase       = null;
        this._selectedElement     = null;
        this.loadingStatus        = LoadingStatus.LOADING;
        this.graph                = null;
        this.graphReady           = this.reloadGraph();
        this.ngAfterViewInit();
    }

    /**
     * Requests the {@link MixingComponent#graph|`graph`} again to the server.
     *
     * @returns {Promise<MixingGraph>} - The problem resolving when the {@link MixingComponent#graph|`graph`}
     *                                  has been fetched and loaded.
     */
    private reloadGraph(): Promise<MixingGraph> {
        this.graphReady = this
            .mixingService
            .getGraph()
            .then(graph => {
                this.graph = graph;
                this.createLevels(graph);
                this.reorderElements();
                return graph;
            });
        return this.graphReady;
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

    /** The {@link MixGraphElement|`MixGraphElement`} or {@link TopDatumOrigin|`TopDatumOrigin`} that is currently selected. `null` means no element is selected. */
    public get selectedElement(): MixGraphElement | TopDatumOrigin | null {
        return this._selectedElement;
    }

    /** Changes the {@link MixGraphElement|`MixGraphElement`} or {@link TopDatumOrigin|`TopDatumOrigin`} that is currently selected. `null` means dismiss current selection. */
    public set selectedElement(value: MixGraphElement | TopDatumOrigin | null) {
        this._selectedElement = value;
        this._selectedPhase   = null;
        setTimeout(() => {
            if (this.graph) {
                this.recalculateConnections(this.graph);
            }
        }, 0);
    }

    /** The {@link MixGraphPhase|`MixGraphPhase`} currently being selected. `null` means no phase is selected. */
    public get selectedPhase(): MixGraphPhase | null {
        return this._selectedPhase;
    }

    /** Changes the {@link MixGraphPhase|`MixGraphPhase`} currently being selected. `null` means dismiss current selection. */
    public set selectedPhase(value: MixGraphPhase | null) {
        this._selectedElement = null;
        this._selectedPhase   = value;
        setTimeout(() => {
            if (this.graph) {
                this.recalculateConnections(this.graph);
            }
        }, 0);
    }

    /** Whether the {@link MixingComponent#graph|`graph`} is empty, meaning no mix has yet to be created. */
    public get isGraphEmpty(): boolean {
        return this.graph != null
               && (
                   this.graph.origins.length
                   + this.graph.sensors.length
                   + this.graph.sensorGroups.length
                   + this.graph.centers.length
                   + this.graph.actuatorGroups.length
                   + this.graph.actuators.length
               ) == 0;
    }

    /**
     * Tests whether a {@link MixGraphElement|`MixGraphElement`} or {@link TopDatumOrigin|`TopDatumOrigin`} belongs
     * to a specific {@link MixGraphPhase|phase in the elaboration}.
     *
     * @param {MixGraphElement | TopDatumOrigin} element - The element to check.
     * @param {MixGraphPhase | null} phase - The phase to check against.
     * @returns {boolean} `true` if the element refers to a {@link Mix|`Mix`} or datum linked to the requested phase, `false` otherwise.
     */
    public isElementInPhase(element: MixGraphElement | TopDatumOrigin, phase: MixGraphPhase | null): boolean {
        if (phase == null) {
            return false;
        }
        switch (phase) {
            case MixGraphPhase.INPUTS:
                return ORIGIN_DISPLAYED_TOP.includes(element as TopDatumOrigin);
            case MixGraphPhase.SENSORS:
                return this.sensorElements.some(sensorElement => sensorElement.sensorElement == element);
            case MixGraphPhase.SENSOR_GROUPS:
                return this.groupElements.some(groupElement => groupElement.groupElement == element && groupElement.sensor);
            case MixGraphPhase.CENTER:
                return this.centerElements.some(centerElement => centerElement.centerElement == element);
            case MixGraphPhase.ACTUATOR_GROUPS:
                return this.groupElements.some(groupElement => groupElement.groupElement == element && !groupElement.sensor);
            case MixGraphPhase.ACTUATORS:
                return this.actuatorElements.some(groupElement => groupElement.actuatorElement == element);
        }
    }

    /**
     * Generated a unique string representing a {@link MixGraphElement|`MixGraphElement`} or {@link TopDatumOrigin|`TopDatumOrigin`},
     * to use for tracking in template loops.
     *
     * @param {MixGraphElement | DatumOrigin} element - The element for which to generate the unique name.
     * @returns {string} The unique name.
     */
    public getElementUniqueName(element: MixGraphElement | DatumOrigin): string {
        if (element instanceof MixingGraphSensor) {
            return `&S=${encodeURIComponent(element.name)}`;
        } else if (element instanceof MixingGraphGroup) {
            if (element.sensorPhase) {
                return `&SG=${encodeURIComponent(element.name)}`;
            } else {
                return `&AG=${encodeURIComponent(element.name)}`;
            }
        } else if (element instanceof MixingGraphActuator) {
            return `&A=${encodeURIComponent(element.name)}`;
        } else if (element instanceof MixingGraphCenter) {
            return `&C=${encodeURIComponent(element.name)}`;
        } else {
            return `&O=${encodeURIComponent(element)}`;
        }
    }

    /** All the @{@link MixingComponent#links|`links`} in the graph, ordered so that selected links are come before unselected ones. */
    public get orderedLinks(): {
        linkId: string,
        line: Line,
        selected: boolean,
        selectedStart: boolean,
        selectedEnd: boolean
        selectedPhase: boolean,
        selectedPhaseStart: boolean,
        selectedPhaseEnd: boolean
    }[] {
        const result = this.links.map(link => ({
            selected:           this._selectedElement != null && ((link.from == this._selectedElement) || (link.to == this._selectedElement)),
            selectedStart:      this._selectedElement != null && (link.from == this._selectedElement),
            selectedEnd:        this._selectedElement != null && (link.to == this._selectedElement),
            selectedPhase:      this.isElementInPhase(link.from, this._selectedPhase) || this.isElementInPhase(link.to, this._selectedPhase),
            selectedPhaseStart: this.isElementInPhase(link.from, this._selectedPhase),
            selectedPhaseEnd:   this.isElementInPhase(link.to, this._selectedPhase),
            line:               link.displayPosition,
            linkId:             `${this.getElementUniqueName(link.from)}?${this.getElementUniqueName(link.to)}`
        }));
        result.sort((a, b) => {
            if (a.selected && !b.selected) {
                return 1;
            } else if (!a.selected && b.selected) {
                return -1;
            }
            return 0;
        });
        return result;
    }

    /**
     * Requests {@link MixingGraph#generateGroupLevels| `MixingGraph.generateGroupLevels()`}
     * on a {@link MixingGraph|`MixingGraph`} and assign the result to
     * {@link MixingComponent#sensorGroupsLevels|`sensorGroupsLevels`} and
     * {@link MixingComponent#actuatorGroupsLevels|`actuatorGroupsLevels`}.
     *
     * @param {MixingGraph} graph - The graph to generate levels for.
     */
    private createLevels(graph: MixingGraph): void {
        const {sensorGroupLevels, actuatorGroupLevels} = graph.generateGroupLevels();
        this.sensorGroupsLevels                        = sensorGroupLevels;
        this.actuatorGroupsLevels                      = actuatorGroupLevels;
    }

    /**
     * Reorder all the elements in each row of the graph such that the least amount
     * of {@link MixingGraphLink|`MixingGraphLink`s} cross each other.
     */
    private reorderElements(): void {
        const orders: Map<MixGraphElement, number> = new Map<MixGraphElement, number>();
        if (this.graph != null) {
            const sensorNamesOrder =
                      this
                          .graph
                          .sensors
                          .map(sensor => sensor.name)
                          .sort((a, b) => a.localeCompare(b));
            let orderProgressive   = 0;
            for (const sensor of this.graph.sensors) {
                orders.set(sensor, sensorNamesOrder.indexOf(sensor.name));
                this.graph.getDependingFrom(sensor).forEach(dependency => {
                    orders.set(dependency, orderProgressive);
                });
                orderProgressive++;
            }
            for (const level of this.sensorGroupsLevels) {
                orderProgressive   = 0;
                const orderedLevel = this.finalizeOrder(level, orders);
                for (const group of orderedLevel) {
                    orderProgressive = this.reorderChildElements(group, orders, orderProgressive);
                }
            }
            orderProgressive     = 0;
            const orderedCenters = this.finalizeOrder(this.graph.centers, orders);
            for (const center of orderedCenters) {
                orderProgressive = this.reorderChildElements(center, orders, orderProgressive);
            }
            for (const level of this.actuatorGroupsLevels) {
                orderProgressive   = 0;
                const orderedLevel = this.finalizeOrder(level, orders);
                for (const group of orderedLevel) {
                    orderProgressive = this.reorderChildElements(group, orders, orderProgressive);
                }
            }
            orderProgressive       = 0;
            const orderedActuators = this.finalizeOrder(this.graph.actuators, orders);
            for (const actuator of orderedActuators) {
                orderProgressive = this.reorderChildElements(actuator, orders, orderProgressive);
            }
        }
        this.orders = orders;
    }

    /**
     * Apply information about the order of elements to an array of elements.
     *
     * @param {T[]} elements - The array of elements to be ordered.
     * @param {Map<MixGraphElement, number>} orders - A map containing for every element in the array, its order.
     * @returns {T[]} A ordered copy of the array.
     * @template T The type of elements in the array.
     */
    private finalizeOrder<T extends MixGraphElement>(elements: T[], orders: Map<MixGraphElement, number>): T[] {
        const orderedElements = elements
            .slice()
            .sort((a, b) => {
                if (orders.get(a) != null && orders.get(b) != null) {
                    if ((orders.get(a) ?? 0) < (orders.get(b) ?? 0)) {
                        return -1;
                    } else if ((orders.get(a) ?? 0) > (orders.get(b) ?? 0)) {
                        return 1;
                    } else {
                        return a.name.localeCompare(b.name);
                    }
                } else if (orders.get(a) != null) {
                    return -1;
                } else if (orders.get(b) != null) {
                    return 1;
                } else {
                    return a.name.localeCompare(b.name);
                }
            });
        orderedElements
            .forEach((el, index) => {
                orders.set(el, index);
            });
        return orderedElements;
    }

    /**
     * Update a map containing the order of all the {@link MixGraphElement|`MixGraphElement`s} in the graph with new
     * values, keeping in mind the order of all the other {@link MixGraphElement|`MixGraphElement`s} that
     * depend on it, in order to keep all the dependencies next to each other.
     *
     * @param {MixGraphElement} element - The element whose dependencies have to be reordered.
     * @param {Map<MixGraphElement, number>} orders - A map containing for every element in the graph, its order.
     * @param {number} orderProgressive - A counter that keeps the newest non-used order position.
     * @returns {number} The updated value for `orderProgressive`.
     */
    private reorderChildElements(element: MixGraphElement, orders: Map<MixGraphElement, number>, orderProgressive: number): number {
        if (this.graph) {
            const dependingElements     = this
                .graph
                .getDependingFrom(element)
                .sort((a, b) => {
                    if (orders.get(a) != null && orders.get(b) != null) {
                        return (orders.get(a) ?? 0) - (orders.get(b) ?? 0);
                    } else if (orders.get(a) != null) {
                        return -1;
                    } else if (orders.get(b) != null) {
                        return 1;
                    } else {
                        return 0;
                    }
                });
            let preOrder: null | number = null;
            const lastPreOrder          = dependingElements[0];
            if (lastPreOrder) {
                preOrder = orders.get(lastPreOrder) ?? null;
            }
            for (const depending of dependingElements) {
                const thisPreOrder = orders.get(depending) ?? null;
                if (thisPreOrder != preOrder) {
                    orderProgressive++;
                    preOrder = thisPreOrder;
                }
                orders.set(depending, orderProgressive);
            }
            orderProgressive++;
        }
        return orderProgressive;
    }

    /**
     * Update the {@link MixingComponent#links|`links`} based on the position of the DOM elements relative to a
     * {@link MixingGraph|`MixingGraph`}'s nodes.
     *
     * @param {MixingGraph} graph - The graph to work on.
     */
    protected recalculateConnections(graph: MixingGraph): void {
        if (
            (this.originElements.length != graph.origins.filter(origin => ORIGIN_DISPLAYED_TOP.includes(origin as TopDatumOrigin)).length)
            || (this.sensorElements.length != graph.sensors.length)
            || (this.actuatorElements.length != graph.actuators.length)
            || (this.groupElements.length != graph.sensorGroups.length + graph.actuatorGroups.length)
        ) {
            return;
        }
        const newLinks: MixingGraphLink[]                    = [];
        const originElements: OriginElementDirective[]       = [...this.originElements];
        const sensorElements: SensorElementDirective[]       = [...this.sensorElements];
        const groupElements: GroupElementDirective[]         = [...this.groupElements];
        const sensorGroupElements: GroupElementDirective[]   = groupElements.filter(el => el.sensor);
        const centerElements: CenterElementDirective[]       = [...this.centerElements];
        const actuatorGroupElements: GroupElementDirective[] = groupElements.filter(el => !el.sensor);
        const actuatorElements: ActuatorElementDirective[]   = [...this.actuatorElements];

        const originOutputSlots: (false | MixingGraphLink)[][]        =
                  this
                      .originElements
                      .map((element): false[] => {
                          const origin       = element.originElement;
                          let childrenNumber = 0;
                          childrenNumber += this
                              .sensorElements
                              .filter(sensorElement =>
                                          sensorElement
                                              .sensorElement
                                              .dependingOn
                                              .some(dependency => dependency.origin == origin)
                              )
                              .length;
                          childrenNumber += this
                              .groupElements
                              .filter(groupElement =>
                                          groupElement
                                              .groupElement
                                              .dependingOn
                                              .some(dependency => dependency.origin == origin)
                              )
                              .length;
                          childrenNumber += this
                              .centerElements
                              .filter(centerElement =>
                                          centerElement
                                              .centerElement
                                              .dependingOn
                                              .some(dependency => dependency.origin == origin)
                              )
                              .length;
                          childrenNumber += this
                              .actuatorElements
                              .filter(actuatorElement =>
                                          actuatorElement
                                              .actuatorElement
                                              .dependingOn
                                              .some(dependency => dependency.origin == origin)
                              )
                              .length;
                          return new Array<false>(childrenNumber).fill(false);
                      });
        const sensorOutputSlots: (false | MixingGraphLink)[][]        =
                  this
                      .sensorElements
                      .map((element): false[] => {
                          const origin       = element.sensorElement;
                          let childrenNumber = 0;
                          childrenNumber += this
                              .groupElements
                              .filter(groupElement =>
                                          groupElement
                                              .groupElement
                                              .dependingOn
                                              .some(dependency => dependency.origin == DatumOrigin.SENSOR && dependency.name == origin.name)
                              )
                              .length;
                          childrenNumber += this
                              .centerElements
                              .filter(groupElement =>
                                          groupElement
                                              .centerElement
                                              .dependingOn
                                              .some(dependency => dependency.origin == DatumOrigin.SENSOR && dependency.name == origin.name)
                              )
                              .length;
                          return new Array<false>(childrenNumber).fill(false);
                      });
        const sensorGroupOutputSlots: (false | MixingGraphLink)[][]   =
                  sensorGroupElements
                      .map((element): false[] => {
                          const origin       = element.groupElement;
                          let childrenNumber = 0;
                          childrenNumber += this
                              .groupElements
                              .filter(groupElement =>
                                          groupElement.sensor &&
                                          groupElement
                                              .groupElement
                                              .dependingOn
                                              .some(dependency => dependency.origin == DatumOrigin.GROUP && dependency.name == origin.name)
                              )
                              .length;
                          childrenNumber += this
                              .centerElements
                              .filter(groupElement =>
                                          groupElement
                                              .centerElement
                                              .dependingOn
                                              .some(dependency => dependency.origin == DatumOrigin.GROUP && dependency.name == origin.name)
                              )
                              .length;
                          return new Array<false>(childrenNumber).fill(false);
                      });
        const centerGroupOutputSlots: (false | MixingGraphLink)[][]   =
                  centerElements
                      .map((element): false[] => {
                          const origin       = element.centerElement;
                          let childrenNumber = 0;
                          childrenNumber += this
                              .groupElements
                              .filter(groupElement =>
                                          groupElement
                                              .groupElement
                                              .dependingOn
                                              .some(dependency => dependency.origin == DatumOrigin.CENTER && dependency.name == origin.name)
                              )
                              .length;

                          childrenNumber += this
                              .actuatorElements
                              .filter(actuatorElement =>
                                          actuatorElement
                                              .actuatorElement
                                              .dependingOn
                                              .some(dependency => dependency.origin == DatumOrigin.CENTER && dependency.name == origin.name)
                              )
                              .length;
                          return new Array<false>(childrenNumber).fill(false);
                      });
        const actuatorGroupOutputSlots: (false | MixingGraphLink)[][] =
                  actuatorGroupElements
                      .map((element): false[] => {
                          const origin       = element.groupElement;
                          let childrenNumber = 0;
                          childrenNumber += this
                              .groupElements
                              .filter(groupElement =>
                                          !groupElement.sensor &&
                                          groupElement
                                              .groupElement
                                              .dependingOn
                                              .some(dependency => dependency.origin == DatumOrigin.GROUP && dependency.name == origin.name)
                              )
                              .length;
                          childrenNumber += this
                              .actuatorElements
                              .filter(actuatorElement =>
                                          actuatorElement
                                              .actuatorElement
                                              .dependingOn
                                              .some(dependency => dependency.origin == DatumOrigin.GROUP && dependency.name == origin.name)
                              )
                              .length;
                          return new Array<false>(childrenNumber).fill(false);
                      });

        const getSourceOutputs = (source: SensorElementDirective | OriginElementDirective | GroupElementDirective | CenterElementDirective): (false | MixingGraphLink)[] => {
            if (source instanceof OriginElementDirective) {
                return originOutputSlots[originElements.indexOf(source)] ?? [];
            } else if (source instanceof SensorElementDirective) {
                return sensorOutputSlots[sensorElements.indexOf(source)] ?? [];
            } else if (source instanceof CenterElementDirective) {
                return centerGroupOutputSlots[centerElements.indexOf(source)] ?? [];
            } else {
                if (source.sensor) {
                    return sensorGroupOutputSlots[sensorGroupElements.indexOf(source)] ?? [];
                } else {
                    return actuatorGroupOutputSlots[actuatorGroupElements.indexOf(source)] ?? [];
                }
            }
        };

        for (const sensor of graph.sensors) {
            const sensorElement = sensorElements.find(element => element.sensorElement == sensor);
            if (sensorElement != null) {
                const origins: DatumOrigin[]   = [];
                const links: MixingGraphLink[] = [];
                for (const dependency of sensor.dependingOn) {
                    if (ORIGIN_DISPLAYED_TOP.includes(dependency.origin as TopDatumOrigin)) {
                        if (origins.includes(dependency.origin)) {
                            continue;
                        } else {
                            origins.push(dependency.origin);
                        }
                    }
                    const source = this.getSourceFromDependency(
                        originElements,
                        sensorElements,
                        sensorGroupElements,
                        centerElements,
                        actuatorGroupElements,
                        dependency
                    );
                    if (source) {
                        if (links.some(link => link.from == source.getElement())) {
                            continue;
                        }
                        const link                = {
                            from:            source.getElement(),
                            to:              sensorElement.getElement(),
                            displayPosition: {
                                from: {x: 0, y: 0},
                                to:   {x: 0, y: 0}
                            }
                        };
                        link.displayPosition.from = this.getConnectorEnd(
                            source,
                            false,
                            getSourceOutputs(source),
                            link
                        );
                        links.push(link);
                        newLinks.push(link);
                    }
                }
                const inputSlots: (false | MixingGraphLink)[] = links.map(_ => false);
                links.sort((a, b) => a.displayPosition.from.x - b.displayPosition.from.x);
                for (const newLink of links) {
                    newLink.displayPosition.to = this.getConnectorEnd(sensorElement, true, inputSlots, newLink);
                }
            }
        }
        for (const sensorGroup of graph.sensorGroups) {
            const sensorGroupElement = sensorGroupElements.find(element => element.groupElement == sensorGroup);
            if (sensorGroupElement != null) {
                const origins: DatumOrigin[]   = [];
                const links: MixingGraphLink[] = [];
                for (const dependency of sensorGroup.dependingOn) {
                    if (ORIGIN_DISPLAYED_TOP.includes(dependency.origin as TopDatumOrigin)) {
                        if (origins.includes(dependency.origin)) {
                            continue;
                        } else {
                            origins.push(dependency.origin);
                        }
                    }
                    const source = this.getSourceFromDependency(
                        originElements,
                        sensorElements,
                        sensorGroupElements,
                        centerElements,
                        actuatorGroupElements,
                        dependency,
                        true
                    );
                    if (source) {
                        if (links.some(link => link.from == source.getElement())) {
                            continue;
                        }
                        const link                = {
                            from:            source.getElement(),
                            to:              sensorGroupElement.getElement(),
                            displayPosition: {
                                from: {x: 0, y: 0},
                                to:   {x: 0, y: 0}
                            }
                        };
                        link.displayPosition.from = this.getConnectorEnd(
                            source,
                            false,
                            getSourceOutputs(source),
                            link
                        );
                        newLinks.push(link);
                        links.push(link);
                    }
                }
                const inputSlots: (false | MixingGraphLink)[] = links.map(_ => false);
                links.sort((a, b) => a.displayPosition.from.x - b.displayPosition.from.x);
                for (const newLink of links) {
                    newLink.displayPosition.to = this.getConnectorEnd(sensorGroupElement, true, inputSlots, newLink);
                }
            }
        }
        for (const center of graph.centers) {
            const centerElement = centerElements.find(element => element.centerElement == center);
            if (centerElement != null) {
                const origins: DatumOrigin[]   = [];
                const links: MixingGraphLink[] = [];
                for (const dependency of center.dependingOn) {
                    if (ORIGIN_DISPLAYED_TOP.includes(dependency.origin as TopDatumOrigin)) {
                        if (origins.includes(dependency.origin)) {
                            continue;
                        } else {
                            origins.push(dependency.origin);
                        }
                    }
                    const source = this.getSourceFromDependency(
                        originElements,
                        sensorElements,
                        sensorGroupElements,
                        centerElements,
                        actuatorGroupElements,
                        dependency,
                        true
                    );
                    if (source) {
                        if (links.some(link => link.from == source.getElement())) {
                            continue;
                        }
                        const link                = {
                            from:            source.getElement(),
                            to:              centerElement.getElement(),
                            displayPosition: {
                                from: {x: 0, y: 0},
                                to:   {x: 0, y: 0}
                            }
                        };
                        link.displayPosition.from = this.getConnectorEnd(
                            source,
                            false,
                            getSourceOutputs(source),
                            link
                        );
                        newLinks.push(link);
                        links.push(link);
                    }
                }
                const inputSlots: (false | MixingGraphLink)[] = links.map(_ => false);
                links.sort((a, b) => a.displayPosition.from.x - b.displayPosition.from.x);
                for (const newLink of links) {
                    newLink.displayPosition.to = this.getConnectorEnd(centerElement, true, inputSlots, newLink);
                }
            }
        }
        for (const actuatorGroup of graph.actuatorGroups) {
            const actuatorGroupElement = actuatorGroupElements.find(element => element.groupElement == actuatorGroup);
            if (actuatorGroupElement != null) {
                const origins: DatumOrigin[]   = [];
                const links: MixingGraphLink[] = [];
                for (const dependency of actuatorGroup.dependingOn) {
                    if (ORIGIN_DISPLAYED_TOP.includes(dependency.origin as TopDatumOrigin)) {
                        if (origins.includes(dependency.origin)) {
                            continue;
                        } else {
                            origins.push(dependency.origin);
                        }
                    }
                    const source = this.getSourceFromDependency(
                        originElements,
                        sensorElements,
                        actuatorGroupElements,
                        centerElements,
                        actuatorGroupElements,
                        dependency,
                        false
                    );
                    if (source) {
                        if (links.some(link => link.from == source.getElement())) {
                            continue;
                        }
                        const link                = {
                            from:            source.getElement(),
                            to:              actuatorGroupElement.getElement(),
                            displayPosition: {
                                from: {x: 0, y: 0},
                                to:   {x: 0, y: 0}
                            }
                        };
                        link.displayPosition.from = this.getConnectorEnd(
                            source,
                            false,
                            getSourceOutputs(source),
                            link
                        );
                        newLinks.push(link);
                        links.push(link);
                    }
                }
                const inputSlots: (false | MixingGraphLink)[] = links.map(_ => false);
                links.sort((a, b) => a.displayPosition.from.x - b.displayPosition.from.x);
                for (const newLink of links) {
                    newLink.displayPosition.to = this.getConnectorEnd(actuatorGroupElement, true, inputSlots, newLink);
                }
            }
        }
        for (const actuator of graph.actuators) {
            const actuatorElement = actuatorElements.find(element => element.actuatorElement == actuator);
            if (actuatorElement != null) {
                const origins: DatumOrigin[]   = [];
                const links: MixingGraphLink[] = [];
                for (const dependency of actuator.dependingOn) {
                    if (ORIGIN_DISPLAYED_TOP.includes(dependency.origin as TopDatumOrigin)) {
                        if (origins.includes(dependency.origin)) {
                            continue;
                        } else {
                            origins.push(dependency.origin);
                        }
                    }
                    const source = this.getSourceFromDependency(
                        originElements,
                        sensorElements,
                        actuatorGroupElements,
                        centerElements,
                        actuatorGroupElements,
                        dependency
                    );
                    if (source) {
                        if (links.some(link => link.from == source.getElement())) {
                            continue;
                        }
                        const link                = {
                            from:            source.getElement(),
                            to:              actuatorElement.getElement(),
                            displayPosition: {
                                from: {x: 0, y: 0},
                                to:   {x: 0, y: 0}
                            }
                        };
                        link.displayPosition.from = this.getConnectorEnd(
                            source,
                            false,
                            getSourceOutputs(source),
                            link
                        );
                        links.push(link);
                        newLinks.push(link);
                    }
                }
                const inputSlots: (false | MixingGraphLink)[] = links.map(_ => false);
                links.sort((a, b) => a.displayPosition.from.x - b.displayPosition.from.x);
                for (const newLink of links) {
                    newLink.displayPosition.to = this.getConnectorEnd(actuatorElement, true, inputSlots, newLink);
                }
            }
        }


        for (const outputSlots of originOutputSlots) {
            this.reorderLinks(outputSlots);
        }
        for (const outputSlots of sensorOutputSlots) {
            this.reorderLinks(outputSlots);
        }
        for (const outputSlots of sensorGroupOutputSlots) {
            this.reorderLinks(outputSlots);
        }
        for (const outputSlots of centerGroupOutputSlots) {
            this.reorderLinks(outputSlots);
        }
        for (const outputSlots of actuatorGroupOutputSlots) {
            this.reorderLinks(outputSlots);
        }

        const elements          = [...originElements, ...sensorElements, ...centerElements, ...actuatorElements, ...groupElements];
        const elementFootprints = elements.map(el => ({
            from: {
                x: el.elementRef.nativeElement.offsetLeft - MEASURES.UNDERPASS_BORDER_WIDTH,
                y: el.elementRef.nativeElement.offsetTop - MEASURES.UNDERPASS_BORDER_WIDTH
            },
            to:   {
                x: el.elementRef.nativeElement.offsetLeft + el.elementRef.nativeElement.offsetWidth + MEASURES.UNDERPASS_BORDER_WIDTH,
                y: el.elementRef.nativeElement.offsetTop + el.elementRef.nativeElement.offsetHeight + MEASURES.UNDERPASS_BORDER_WIDTH
            }
        }));

        queueMicrotask(() => {
            this.links             = newLinks;
            this.elementFootprints = elementFootprints;
        });
    }

    /**
     * Reorder link's order so that links coming from a {@link MixGraphElement|`MixGraphElement`} cross each other the least possible times.
     *
     * @param {(false | MixingGraphLink)[]} links - The links, all coming from a single {@link MixGraphElement|`MixGraphElement`}, to reorder.
     *                                              If `false` is ever present in the array, the function just returns.
     */
    private reorderLinks(links: (false | MixingGraphLink)[]): void {
        if (links.includes(false)) {
            return;
        }
        const realLinks    = links as MixingGraphLink[];
        const originalFrom = realLinks.map(el => el.displayPosition.from);
        const reordered    = realLinks.slice().sort((a, b) => {
            return (a.displayPosition.to.x - a.displayPosition.from.x) / (a.displayPosition.to.y - a.displayPosition.from.y)
                   - (b.displayPosition.to.x - b.displayPosition.from.x) / (b.displayPosition.to.y - b.displayPosition.from.y);
        });
        reordered.forEach((el, index) => {
            const correctFrom = originalFrom[index];
            if (correctFrom != null) {
                el.displayPosition.from = correctFrom;
            }
        });

    }

    /**
     * Gets the coordinates in the DOM of an end of a {@link MixingGraphLink|`MixingGraphLink`} linked to a node
     * marked by one of the {@link ElementDirective|`ElementDirective`s}.
     *
     * @param {ElementDirective} element - The directive linked to the element that the {@link MixingGraphLink|`MixingGraphLink`} end will be attached to.
     * @param {boolean} top - If `true`, the end of the {@link MixingGraphLink|`MixingGraphLink`} is attached to the top of the element.
     * @param {(false | MixingGraphLink)[]} slots - All the slots in the side of the element. If `false`, the slot is free,
     *                                              otherwise the slot is already occupied by the {@link MixingGraphLink|`MixingGraphLink`} in that position.
     * @param {MixingGraphLink} putInSlot - The {@link MixingGraphLink|`MixingGraphLink`} the end is being calcolated for, to put in a free slot.
     * @returns {Point} - The coordinates of the end of the link requested.
     */
    private getConnectorEnd(element: ElementDirective,
                            top: boolean,
                            slots: (false | MixingGraphLink)[],
                            putInSlot: MixingGraphLink): Point {
        const nativeElement = element.elementRef.nativeElement;
        let x               = nativeElement.offsetLeft - (nativeElement.parentElement?.scrollLeft ?? 0);
        const firstFree     = slots.indexOf(false);
        if (slots.length > 0 && firstFree > -1) {
            x += 10;
            x += (firstFree + 1) * (nativeElement.offsetWidth - 20) / (slots.length + 1);
            slots[firstFree] = putInSlot;
        } else {
            x += nativeElement.offsetWidth * 0.5;
        }
        return {
            x,
            y: (top ? 0 : nativeElement.offsetHeight) + nativeElement.offsetTop
        };
    }

    /**
     * Extract the correct {@link ElementDirective|`ElementDirective`} from a {@link MixingGraphDependency|`MixingGraphDependency`}.
     *
     * @param {OriginElementDirective[]} originElements - All the {@link OriginElementDirective|`OriginElementDirective`s} of nodes in the {@link MixingGraph|`MixingGraph`}.
     * @param {SensorElementDirective[]} sensorElements - All the {@link SensorElementDirective|`SensorElementDirective`s} of nodes in the {@link MixingGraph|`MixingGraph`}.
     * @param {GroupElementDirective[]} sensorGroupElements - All the {@link GroupElementDirective|`GroupElementDirective`s} of nodes in the {@link MixingGraph|`MixingGraph`}.
     * @param {CenterElementDirective[]} centerElements - All the {@link CenterElementDirective|`CenterElementDirective`s} of nodes in the {@link MixingGraph|`MixingGraph`}.
     * @param {GroupElementDirective[]} actuatorGroupElements - All the {@link GroupElementDirective|`GroupElementDirective`s} of nodes in the {@link MixingGraph|`MixingGraph`}.
     * @param {MixingGraphDependency} dependency - The {@link MixingGraphDependency|`MixingGraphDependency`} to extract the source from.
     * @param {boolean} sensorSide - For a {@link MixingGraphGroup|`MixingGraphGroup`} dependency, `true` if the dependency has to bee found in the sensor side, `false` if in the actuator side.
     * @returns {SensorElementDirective | OriginElementDirective | GroupElementDirective | CenterElementDirective | null} - The requested {@link ElementDirective|`ElementDirective`}.
     */
    private getSourceFromDependency(
        originElements: OriginElementDirective[],
        sensorElements: SensorElementDirective[],
        sensorGroupElements: GroupElementDirective[],
        centerElements: CenterElementDirective[],
        actuatorGroupElements: GroupElementDirective[],
        dependency: MixingGraphDependency,
        sensorSide?: boolean
    ): SensorElementDirective | OriginElementDirective | GroupElementDirective | CenterElementDirective | null {
        switch (dependency.origin) {
            case DatumOrigin.SENSOR_DATA:
            case DatumOrigin.SENSOR_UPDATE:
            case DatumOrigin.SYSTEM: {
                return originElements.find(originElement => originElement.originElement == dependency.origin) ?? null;
            }
            case DatumOrigin.SENSOR: {
                return sensorElements.find(sensorElement => sensorElement.sensorElement.name == dependency.name) ?? null;
            }
            case DatumOrigin.GROUP:
                if (sensorSide == true) {
                    return sensorGroupElements.find(groupElement => groupElement.groupElement.name == dependency.name) ?? null;
                } else {
                    return actuatorGroupElements.find(groupElement => groupElement.groupElement.name == dependency.name) ?? null;
                }
            case DatumOrigin.CENTER:
                return centerElements.find(centerElement => centerElement.centerElement.name == dependency.name) ?? null;
        }
    }

    /**
     * Scroll a overflowing row.
     *
     * @param {HTMLElement} element - The row that's overflowing.
     * @param {boolean} left - `true` if the row should be scrolled to the left, `false` if to the right.
     */
    protected rowScroll(element: HTMLElement, left: boolean): void {
        if (!left) {
            const mostRight        =
                      element.getBoundingClientRect().right - ((element.querySelector('.scroll-arrow.right') as HTMLElement).offsetWidth) - 16;
            const invisibleAtRight = [...element.childNodes]
                .filter((child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains('node'))
                .filter((child): boolean => child.getBoundingClientRect().right - 2 > mostRight)
                .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
            if (invisibleAtRight.length > 1 && invisibleAtRight[0] != null) {
                element.scrollTo({
                                     left:     element.scrollLeft + invisibleAtRight[0].getBoundingClientRect().right - mostRight,
                                     behavior: 'smooth'
                                 });
            } else {
                element.scrollTo({
                                     left:     element.scrollWidth,
                                     behavior: 'smooth'
                                 });
            }
        } else {
            const mostLeft        =
                      element.getBoundingClientRect().left + ((element.querySelector('.scroll-arrow.right') as HTMLElement).offsetWidth) + 16;
            const invisibleAtLeft = [...element.childNodes]
                .filter((child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains('node'))
                .filter((child): boolean => child.getBoundingClientRect().left + 2 < mostLeft)
                .sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right);
            if (invisibleAtLeft.length > 1 && invisibleAtLeft[0] != null) {
                element.scrollTo({
                                     left:     element.scrollLeft + invisibleAtLeft[0].getBoundingClientRect().left - mostLeft,
                                     behavior: 'smooth'
                                 });
            } else {
                element.scrollTo({
                                     left:     0,
                                     behavior: 'smooth'
                                 });
            }
        }
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
            });
    }

    /**
     * Checks whether a {@link ToolbarElement|`ToolbarElement`s} should be shown given the current state of the component.
     *
     * @param {ToolbarElement} toolbarElement - The {@link ToolbarElement|`ToolbarElement`} to check.
     * @returns {boolean} Whether the element should be shown.
     */
    private isToolbarElementVisible(toolbarElement: ToolbarElement): boolean {
        if (!Object.values<string>(ToolbarAction).includes(toolbarElement.id)) {
            return true;
        }
        if (this.loadingStatus != LoadingStatus.LOADED) {
            return [
                ToolbarAction.DEVICES,
                ToolbarAction.MIXING,
                ToolbarAction.SYSTEM
            ]
                .includes(toolbarElement.id as ToolbarAction);
        }
        switch (toolbarElement.id as ToolbarAction) {
            case ToolbarAction.DELETE:
                return this.selectedElement != null
                       && !ORIGIN_DISPLAYED_TOP.includes(this.selectedElement as TopDatumOrigin)
                       && !this.hasDependencies(this.selectedElement);
            case ToolbarAction.EDIT:
                return this.selectedElement != null
                       && !ORIGIN_DISPLAYED_TOP.includes(this.selectedElement as TopDatumOrigin);
            case ToolbarAction.ADD:
            case ToolbarAction.DEVICES:
            case ToolbarAction.MIXING:
            case ToolbarAction.SYSTEM:
                return true;
        }
    }

    /**
     * Performs the action linked to a {@link ToolbarButton|`ToolbarButton`}'s click.
     *
     * @param {ToolbarAction} id - The {@link ToolbarButton#id|`id`} of the {@link ToolbarButton|`ToolbarButton`} that was clicked.
     */
    protected toolbarClick(id: ToolbarAction): void {
        switch (id) {
            case ToolbarAction.EDIT:
                if (
                    this.selectedElement != null
                    && (
                        this.selectedElement instanceof MixingGraphSensor
                        || this.selectedElement instanceof MixingGraphActuator
                        || this.selectedElement instanceof MixingGraphGroup
                        || this.selectedElement instanceof MixingGraphCenter
                    )
                ) {
                    this.openMix(this.selectedElement.mix);
                }
                break;
            case ToolbarAction.DELETE: {
                const selectedElement = this.selectedElement;
                if (selectedElement == null) {
                    return;
                }
                let message = 'Are you sure you want to delete the mix?';
                if (this.selectedElement instanceof MixingGraphActuator) {
                    message = `Are you sure you want to delete the mix linked to the actuator "${this.selectedElement.displayName}"?`;
                } else if (this.selectedElement instanceof MixingGraphSensor) {
                    message = `Are you sure you want to delete the mix linked to the sensor "${this.selectedElement.displayName}"?`;
                } else if (this.selectedElement instanceof MixingGraphGroup) {
                    if (this.selectedElement.sensorPhase) {
                        message = `Are you sure you want to delete the mix linked to the group "${this.selectedElement.displayName}" in the sensor phase?`;
                    } else {
                        message = `Are you sure you want to delete the mix linked to the group "${this.selectedElement.displayName}" in the actuator phase?`;
                    }
                } else if (this.selectedElement instanceof MixingGraphCenter) {
                    message = `Are you sure you want to delete the central mix "${this.selectedElement.name}"?`;
                } else {
                    return;
                }
                const mixId = this.selectedElement.mix;
                this.matDialog.open(
                    ConfirmDialogComponent,
                    {
                        data: {
                            title:       'Delete mix',
                            message:     message,
                            confirmText: 'Delete',
                            warn:        true
                        }
                    }
                )
                    .afterClosed()
                    .subscribe(result => {
                        if (result == true) {
                            this.selectedElement = null;
                            this
                                .mixingService
                                .deleteMix(
                                    {
                                        id: mixId
                                    }
                                )
                                .then(() => {
                                    this.reload();
                                })
                                .catch(() => {
                                    this.snackBar.open(
                                        'There has been an error while deleting the mix',
                                        undefined,
                                        {
                                            duration: SNACKBAR_TIMEOUT
                                        }
                                    );
                                });
                        }
                    });
                break;
            }
            case ToolbarAction.ADD: {
                this.addMix();
                break;
            }
            case ToolbarAction.DEVICES: {
                this.goTo('devices');
                break;
            }
            case ToolbarAction.MIXING: {
                break;
            }
            case ToolbarAction.SYSTEM: {
                this.goTo('system');
                break;
            }
        }
    }

    /**
     * Open a dialog to create a new {@link Mix|`Mix`}, and navigate to the mix editing view if successful.
     *
     * @param {MixGraphPhase} graphPhase - The {@link MixGraphPhase|`MixGraphPhase`} to preset the dialog with.
     */
    protected addMix(graphPhase?: MixGraphPhase): void {
        let phase: MixPhase;
        let target: MixTarget;
        graphPhase = graphPhase ?? this.selectedPhase ?? MixGraphPhase.SENSORS;
        switch (graphPhase) {
            case MixGraphPhase.INPUTS:
            case MixGraphPhase.SENSORS:
                phase  = MixPhase.SENSORS;
                target = MixTarget.DEVICE;
                break;
            case MixGraphPhase.SENSOR_GROUPS:
                phase  = MixPhase.SENSORS;
                target = MixTarget.GROUP;
                break;
            case MixGraphPhase.CENTER:
                phase  = MixPhase.CENTER;
                target = MixTarget.CENTER;
                break;
            case MixGraphPhase.ACTUATOR_GROUPS:
                phase  = MixPhase.ACTUATORS;
                target = MixTarget.GROUP;
                break;
            case MixGraphPhase.ACTUATORS:
                phase  = MixPhase.ACTUATORS;
                target = MixTarget.DEVICE;
                break;
        }
        this
            .matDialog
            .open(
                AddMixDialogComponent,
                {
                    data: {
                        phase,
                        target
                    }
                }
            )
            .afterClosed()
            .subscribe(result => {
                if (result != null) {
                    // Navigate to /mixing/exit/new/ with the result as query param
                    void this.router.navigate(['/mixing/edit/new/'], {
                        queryParams: result
                    });
                }
            });
    }

    /**
     * Checks whether a node in the {@link MixingComponent#graph|`graph`} has other nodes depending on it.
     *
     * @param {MixingGraphActuator | MixingGraphGroup | MixingGraphSensor | MixingGraphCenter | DatumOrigin.SYSTEM | DatumOrigin.SENSOR_DATA | DatumOrigin.SENSOR_UPDATE} selectedElement - The
     *        element to check.
     * @returns {boolean} - Whether the element has other nodes depending on it.
     */
    private hasDependencies(selectedElement: MixingGraphActuator | MixingGraphGroup | MixingGraphSensor | MixingGraphCenter | DatumOrigin.SYSTEM | DatumOrigin.SENSOR_DATA | DatumOrigin.SENSOR_UPDATE): boolean {
        if (selectedElement == DatumOrigin.SYSTEM || selectedElement == DatumOrigin.SENSOR_DATA || selectedElement == DatumOrigin.SENSOR_UPDATE) {
            return true;
        } else if (selectedElement instanceof MixingGraphActuator) {
            return false;
        } else if (selectedElement instanceof MixingGraphSensor) {
            const checkDependency = (dependency: MixingGraphDependency): boolean => {
                return dependency.origin == DatumOrigin.SENSOR
                       && dependency.name == selectedElement.name;

            };
            if (this.graph != null) {
                return this.graph.sensorGroups.flatMap(group => group.dependingOn).some(checkDependency)
                       || this.graph.centers.flatMap(center => center.dependingOn).some(checkDependency);
            } else {
                return false;
            }
        } else if (selectedElement instanceof MixingGraphGroup) {
            const checkDependency = (dependency: MixingGraphDependency): boolean => {
                return dependency.origin == DatumOrigin.GROUP
                       && dependency.name == selectedElement.name;

            };
            if (selectedElement.sensorPhase) {
                if (this.graph != null) {
                    return this.graph.sensorGroups.flatMap(group => group.dependingOn).some(checkDependency)
                           || this.graph.centers.flatMap(center => center.dependingOn).some(checkDependency);
                } else {
                    return false;
                }
            } else {
                if (this.graph != null) {
                    return this.graph.actuatorGroups.flatMap(group => group.dependingOn).some(checkDependency)
                           || this.graph.actuators.flatMap(center => center.dependingOn).some(checkDependency);
                } else {
                    return false;
                }
            }
        } else { // MixingGraphCenter
            const checkDependency = (dependency: MixingGraphDependency): boolean => {
                return dependency.origin == DatumOrigin.CENTER
                       && dependency.name == selectedElement.name;

            };
            if (this.graph != null) {
                return this.graph.actuatorGroups.flatMap(group => group.dependingOn).some(checkDependency)
                       || this.graph.actuators.flatMap(center => center.dependingOn).some(checkDependency);
            } else {
                return false;
            }
        }
    }

    /**
     * Navigate to another section of the app.
     *
     * @param {string} section - The section to navigate to.
     */
    protected goTo(section: string): void {
        void this.router.navigate([section]);
    }


    /**
     * Navigate to the mix editing view.
     *
     * @param {number} mix - The id of the {@link Mix|`Mix`} to edit.
     */
    protected openMix(mix: number): void {
        void this.router.navigate(['mixing', 'edit', mix]);
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
    protected readonly ORIGIN_DISPLAYED_TOP      = ORIGIN_DISPLAYED_TOP;
    /** @ignore */
    protected readonly DATUM_ORIGIN_DISPLAY      = DATUM_ORIGIN_DISPLAY;
    /** @ignore */
    protected readonly ACTUATOR_TYPE_ICON        = ACTUATOR_TYPE_ICON;
    /** @ignore */
    protected readonly SENSOR_TYPE_ICON          = SENSOR_TYPE_ICON;
    /** @ignore */
    protected readonly graphConnectionSmoothPath = graphConnectionSmoothPath;
    /** @ignore */
    protected readonly MixGraphPhase             = MixGraphPhase;
    /** @ignore */
    protected readonly DatumOrigin               = DatumOrigin;
    /** @ignore */
    protected readonly MEASURES                  = MEASURES;
    /** @ignore */
    protected readonly TOOLTIP_TIMEOUT           = TOOLTIP_TIMEOUT;
    /** @ignore */
    protected readonly ToolbarAction = ToolbarAction;
    /** @ignore */
    protected readonly LoadingStatus = LoadingStatus;
    /** @ignore */
    protected readonly Math          = Math;
}

/**
 * All the {@link DatumOrigin|`DatumOrigin`} values that can appear ath the top of a {@link MixingGraph|`MixingGraph`}.
 *
 * @notExported
 */
type TopDatumOrigin = DatumOrigin.SYSTEM | DatumOrigin.SENSOR_DATA | DatumOrigin.SENSOR_UPDATE;

/**
 * A link between two nodes in a {@link MixingGraph|`MixingGraph`}.
 *
 * @notExported
 */
interface MixingGraphLink {
    /** The originating node. */
    from: MixGraphElement | TopDatumOrigin,
    /** The destination node. */
    to: MixGraphElement | TopDatumOrigin,
    /** The coordinates of the link in the DOM. */
    displayPosition: Line;
}

/**
 * A list of all the possible values of {@link DatumOrigin|`DatumOrigin`}.
 *
 * @notExported
 */
const ORIGIN_DISPLAYED_TOP: TopDatumOrigin[] = [
    DatumOrigin.SYSTEM,
    DatumOrigin.SENSOR_DATA,
    DatumOrigin.SENSOR_UPDATE
];

/**
 * All the distinct phases of a {@link MixingGraph|`MixingGraph`}.
 *
 * @notExported
 */
enum MixGraphPhase {
    /** The phase containing all the inputs coming from the system. */
    INPUTS          = 'INPUTS',
    /** The phase containing all the {@link Mix|`Mix`es} linked to a {@link Sensor|`Sensor`}. */
    SENSORS         = 'SENSORS',
    /** The phase containing all the {@link Mix|`Mix`es} linked to a {@link Group|`Group`}, when elaborating data coming from the {@link Sensor|`Sensor`s}. */
    SENSOR_GROUPS   = 'SENSOR_GROUPS',
    /** The phase containing all the {@link Mix|`Mix`es} in the center of the {@link MixingGraph|`MixingGraph`}. */
    CENTER          = 'CENTER',
    /** The phase containing all the {@link Mix|`Mix`es} linked to a {@link Group|`Group`}, when elaborating data coming from the {@link Actuator|`Actuator`s}. */
    ACTUATOR_GROUPS = 'ACTUATOR_GROUPS',
    /** The phase containing all the {@link Mix|`Mix`es} linked to an {@link Actuator|`Actuator`}. */
    ACTUATORS       = 'ACTUATORS'
}

/**
 * All the actions {@link MixingComponent|`MixingComponent`}'s {@link ToolbarComponent|`ToolbarComponent`} can offer.
 * Used as {@link ToolbarButton#id|`id`} for the {@link ALL_TOOLBAR_ELEMENTS|toolbar buttons}.
 *
 * @notExported
 */
enum ToolbarAction {
    /** Button to move to the "Home" (device) view. */
    DEVICES = 'devices',
    /** Button to move to the "Mixing" view. */
    MIXING  = 'mixing',
    /** Button to move to the "System" view. */
    SYSTEM  = 'system',
    /** Delete the {@link Mix|`Mix`} linked to the currently selected node. */
    DELETE  = 'delete',
    /** Add a new {@link Mix|`Mix`} to the system. */
    ADD     = 'add',
    /** Edit the {@link Mix|`Mix`} linked to the currently selected node. */
    EDIT    = 'edit'
}

/**
 * All the {@link ToolbarElement|`ToolbarElement`s} in {@link MixingComponent|`MixingComponent`}'s {@link ToolbarComponent|`ToolbarComponent`}.
 *
 * @notExported
 */
const ALL_TOOLBAR_ELEMENTS: ToolbarElement[] = [
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'dashboard',
        id:    ToolbarAction.DEVICES,
        hint:  'Device view',
        order: 0
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'instant_mix',
        id:    ToolbarAction.MIXING,
        hint: 'Mixing view',
        order: 0
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'hub',
        id:    ToolbarAction.SYSTEM,
        hint:  'System view',
        order: 0
    },
    {
        type:  ToolBarElementType.SPACER,
        id:    'spacer-1',
        order: 1
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'edit',
        id:    ToolbarAction.EDIT,
        hint:  'Edit mix',
        shortcut: {
            codes:      ['Enter', 'NumpadEnter'],
            osModifier: false,
            shift:      false,
            alt:        false
        },
        order: 2
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'delete',
        id:    ToolbarAction.DELETE,
        hint:  'Delete',
        shortcut: {
            codes:      ['Delete', 'Backspace'],
            osModifier: false,
            shift:      false,
            alt:        false
        },
        order: 2
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'add',
        id:    ToolbarAction.ADD,
        hint:  'Add a mix',
        shortcut: {
            codes:      ['KeyI'],
            osModifier: true,
            shift:      false,
            alt:        false
        },
        order: 2
    }

];
