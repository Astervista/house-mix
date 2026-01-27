import {AfterViewInit, Component, Directive, ElementRef, Input, OnDestroy, QueryList, ViewChildren} from '@angular/core';
import {ToolbarComponent, ToolbarElement, ToolBarElementType} from '../auxiliary/toolbar/toolbar.component';
import {Router} from '@angular/router';
import {BetterMatDialog} from '../../utils/better-mat-dialog';
import {AddMixDialogComponent} from '../dialogs/add-mix-dialog/add-mix-dialog.component';
import {MixingService} from './mixing.service';
import {MixingGraph, MixingGraphActuator, MixingGraphDependency, MixingGraphGroup, MixingGraphSensor} from '@common/mixing/mixing-graph';
import {DatumOrigin} from '@common/mixing/mix/datum';
import {DATUM_ORIGIN_DISPLAY, graphConnectionSmoothPath, Line} from './constants';
import {DynamicSvgComponent} from '../auxiliary/dynamic-svg/dynamic-svg.component';
import {ACTUATOR_TYPE_ICON, SENSOR_TYPE_ICON} from '../entities/devices/device/constants';
import {MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {Subscription} from 'rxjs';
import {Point} from '@angular/cdk/drag-drop';
import {ResizeEventDirective} from '../../directives/resize-event/resize-event.directive';

@Directive({
               selector: '[origin-element]'
           })
export class OriginElementDirective {

    @Input('origin-element') public originElement!: DatumOrigin;

    constructor(public elementRef: ElementRef<HTMLElement>) {}

    public getElement(): DatumOrigin {
        return this.originElement;
    }

}

@Directive({
               selector: '[sensor-element]'
           })
export class SensorElementDirective {

    @Input('sensor-element') public sensorElement!: MixingGraphSensor;

    constructor(public elementRef: ElementRef<HTMLElement>) {}

    public getElement(): MixingGraphSensor {
        return this.sensorElement;
    }

}

@Directive({
               selector: '[group-element]'
           })
export class GroupElementDirective {

    @Input({
               alias:    'group-element',
               required: true
           })
    public groupElement!: MixingGraphGroup;

    @Input({
               alias:    'group-element-sensor',
               required: true
           })
    public sensor!: boolean;

    constructor(public elementRef: ElementRef<HTMLElement>) {}

    public getElement(): MixingGraphGroup {
        return this.groupElement;
    }

}

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
                   ResizeEventDirective
               ],
               templateUrl: './mixing.component.html',
               styleUrl:    './mixing.component.scss'
           })
export class MixingComponent implements AfterViewInit, OnDestroy {

    protected graph: MixingGraph | null = null;
    private graphReady: Promise<MixingGraph>;

    protected sensorGroupsLevels: MixingGraphGroup[][] = [];

    private _selectedElement: MixGraphElement | null = null;

    private _selectedPhase: MixGraphPhase | null = null;

    @ViewChildren(OriginElementDirective)
    private originElements!: QueryList<OriginElementDirective>;
    @ViewChildren(SensorElementDirective)
    private sensorElements!: QueryList<SensorElementDirective>;
    @ViewChildren(GroupElementDirective)
    private groupElements!: QueryList<GroupElementDirective>;

    protected links: MixingGraphLink[] = [];

    protected originScrollStatus?: boolean;
    protected sensorScrollStatus?: boolean;
    protected sensorGroupScrollStatuses: Map<MixingGraphGroup[], boolean>   = new Map<MixingGraphGroup[], boolean>();
    protected actuatorGroupScrollStatuses: Map<MixingGraphGroup[], boolean> = new Map<MixingGraphGroup[], boolean>();

    private subscriptions: Subscription[] = [];

    constructor(
        private router: Router,
        private matDialog: BetterMatDialog,
        private mixingService: MixingService
    ) {
        this.graphReady = this
            .mixingService
            .getGraph()
            .then(graph => {
                this.graph = graph;
                this.createLevels(graph);
                return graph;
            });
        this.graphReady
            .catch(() => {

            });
    }

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
            })
            .catch(() => {

            });
    }

    public ngOnDestroy(): void {
        this.subscriptions.forEach(sub => {sub.unsubscribe();});
    }

    public get selectedElement(): MixGraphElement | null {
        return this._selectedElement;
    }

    public set selectedElement(value: MixGraphElement | null) {
        this._selectedElement = value;
        this._selectedPhase = null;
        setTimeout(() => {
            if (this.graph) {
                this.recalculateConnections(this.graph);
            }
        }, 0);
    }

    public get selectedPhase(): MixGraphPhase | null {
        return this._selectedPhase;
    }

    public set selectedPhase(value: MixGraphPhase | null) {
        this._selectedElement = null;
        this._selectedPhase = value;
        setTimeout(() => {
            if (this.graph) {
                this.recalculateConnections(this.graph);
            }
        }, 0);
    }

    public isElementInPhase(element: MixGraphElement, phase: MixGraphPhase | null): boolean {
        if (phase == null) {
            return false;
        }
        switch (phase) {
            case MixGraphPhase.INPUTS:
                return ORIGIN_DISPLAYED_TOP.includes(element as DatumOrigin) ;
            case MixGraphPhase.SENSORS:
                return this.sensorElements.some(sensorElement => sensorElement.sensorElement == element);
            case MixGraphPhase.SENSOR_GROUPS:
                return this.groupElements.some(groupElement => groupElement.groupElement == element && groupElement.sensor);
            case MixGraphPhase.CENTER:
            case MixGraphPhase.ACTUATOR_GROUPS:
            case MixGraphPhase.ACTUATORS:
                return false;
        }
    }

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
        } else {
            return `&O=${encodeURIComponent(element)}`;
        }
    }

    public get orderedLinks(): { linkId: string, line: Line, selected: boolean, selectedPhase: boolean }[] {
        const result = this.links.map(link => ({
            selected: this._selectedElement != null && ((link.from == this._selectedElement) || (link.to == this._selectedElement)),
            selectedPhase: this.isElementInPhase(link.from, this._selectedPhase) || this.isElementInPhase(link.to, this._selectedPhase),
            line:     link.displayPosition,
            linkId:   `${this.getElementUniqueName(link.from)}?${this.getElementUniqueName(link.to)}`
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

    private createLevels(graph: MixingGraph): void {
        const alreadyFound: MixingGraphGroup[] = [];
        let nextLevel: MixingGraphGroup[];
        do {
            nextLevel = graph.sensorGroups.filter(
                group =>
                    !alreadyFound.includes(group) && group.dependingOn.every(
                                                      dependency =>
                                                          (dependency.origin != DatumOrigin.GROUP) || (alreadyFound.some(found => found.name == dependency.name))
                                                  )
            );
            if (nextLevel.length > 0) {
                this.sensorGroupsLevels.push(nextLevel);
                alreadyFound.push(...nextLevel);
            }
        } while (nextLevel.length > 0);
    }

    protected recalculateConnections(graph: MixingGraph): void {
        if (
            (this.originElements.length != graph.origins.filter(origin => ORIGIN_DISPLAYED_TOP.includes(origin)).length)
            || (this.sensorElements.length != graph.sensors.length)
            || (this.groupElements.length != graph.sensorGroups.length + graph.actuatorGroups.length)
        ) {
            return;
        }
        const newLinks: MixingGraphLink[]                             = [];
        const originElements                                          = [...this.originElements];
        const sensorElements                                          = [...this.sensorElements];
        const groupElements                                           = [...this.groupElements];
        const sensorGroupElements                                     = groupElements.filter(el => el.sensor);
        const actuatorGroupElements                                   = groupElements.filter(el => !el.sensor);
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
                                          groupElement
                                              .groupElement
                                              .dependingOn
                                              .some(dependency => dependency.origin == DatumOrigin.GROUP && dependency.name == origin.name)
                              )
                              .length;
                          return new Array<false>(childrenNumber).fill(false);
                      });
        const actuatorGroupOutputSlots: (false | MixingGraphLink)[][] = []; //TODO: Calculate correct value

        const getSourceOutputs = (source: SensorElementDirective | OriginElementDirective | GroupElementDirective): (false | MixingGraphLink)[] => {
            if (source instanceof OriginElementDirective) {
                return originOutputSlots[originElements.indexOf(source)] ?? [];
            } else if (source instanceof SensorElementDirective) {
                return sensorOutputSlots[sensorElements.indexOf(source)] ?? [];
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
                    if (ORIGIN_DISPLAYED_TOP.includes(dependency.origin)) {
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
                        actuatorGroupElements,
                        dependency
                    );
                    if (source) {
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
                    if (ORIGIN_DISPLAYED_TOP.includes(dependency.origin)) {
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
                        actuatorGroupElements,
                        dependency,
                        true
                    );
                    if (source) {
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
        for (const outputSlots of originOutputSlots) {
            this.reorderLinks(outputSlots);
        }
        for (const outputSlots of sensorOutputSlots) {
            this.reorderLinks(outputSlots);
        }
        for (const outputSlots of sensorGroupOutputSlots) {
            this.reorderLinks(outputSlots);
        }
        for (const outputSlots of actuatorGroupOutputSlots) {
            this.reorderLinks(outputSlots);
        }
        queueMicrotask(() => {
            this.links = newLinks;
        });
    }

    private reorderLinks(links: (false | MixingGraphLink)[]): void {
        if (links.includes(false)) {
            // TODO: Remove error
            console.error("A link has been skipped. This should not happen");
            return;
        }
        const realLinks = links as MixingGraphLink[];
        const originalFrom = realLinks.map(el => el.displayPosition.from);
        const reordered = realLinks.slice().sort((a, b) => {
            return (a.displayPosition.to.x - a.displayPosition.from.x) / (a.displayPosition.to.y - a.displayPosition.from.y)
                   - (b.displayPosition.to.x - b.displayPosition.from.x) / (b.displayPosition.to.y - b.displayPosition.from.y)
        });
        reordered.forEach((el, index) => {
            const correctFrom = originalFrom[index];
            if (correctFrom != null) {
                el.displayPosition.from = correctFrom;
            }
        })

    }

    private getConnectorEnd(element: SensorElementDirective | OriginElementDirective | GroupElementDirective,
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

    private getSourceFromDependency(
        originElements: OriginElementDirective[],
        sensorElements: SensorElementDirective[],
        sensorGroupElements: GroupElementDirective[],
        actuatorGroupElements: GroupElementDirective[],
        dependency: MixingGraphDependency,
        sensorSide?: boolean
    ): SensorElementDirective | OriginElementDirective | GroupElementDirective | null {
        switch (dependency.origin) {
            case DatumOrigin.SENSOR_DATA:
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
        }
    }

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

    protected toolbarClick(id: ToolbarAction): void {
        switch (id) {
            case ToolbarAction.DELETE:
                break;
            case ToolbarAction.ADD: {
                this
                    .matDialog
                    .open(
                        AddMixDialogComponent,
                        {}
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
                break;
            }
            case ToolbarAction.DEVICES: {
                this.goTo('home');
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

    private isToolbarElementVisible(toolbarElement: ToolbarElement): boolean {
        if (!Object.values<string>(ToolbarAction).includes(toolbarElement.id)) {
            return true;
        }
        switch (toolbarElement.id as ToolbarAction) {
            case ToolbarAction.DELETE:
                return false;
            case ToolbarAction.ADD:
            case ToolbarAction.DEVICES:
            case ToolbarAction.MIXING:
            case ToolbarAction.SYSTEM:
                return true;
        }
    }

    protected goTo(section: string): void {
        void this.router.navigate([section]);
    }

    protected openMix(mix: number): void {
        void this.router.navigate(['mixing', 'edit', mix]);
    }

    protected asToolbarAction(val: string): ToolbarAction { return val as ToolbarAction; }

    protected readonly ORIGIN_DISPLAYED_TOP      = ORIGIN_DISPLAYED_TOP;
    protected readonly DATUM_ORIGIN_DISPLAY      = DATUM_ORIGIN_DISPLAY;
    protected readonly ACTUATOR_TYPE_ICON        = ACTUATOR_TYPE_ICON;
    protected readonly SENSOR_TYPE_ICON          = SENSOR_TYPE_ICON;
    protected readonly graphConnectionSmoothPath = graphConnectionSmoothPath;
    protected readonly MixGraphPhase             = MixGraphPhase;
    protected readonly DatumOrigin = DatumOrigin;
}

type MixGraphElement = MixingGraphActuator | MixingGraphGroup | MixingGraphSensor | DatumOrigin;

interface MixingGraphLink {
    from: MixGraphElement | DatumOrigin,
    to: MixGraphElement | DatumOrigin,
    displayPosition: Line;
}

const ORIGIN_DISPLAYED_TOP = [
    DatumOrigin.SYSTEM,
    DatumOrigin.SENSOR_DATA
];

enum ToolbarAction {
    DEVICES = 'devices',
    MIXING  = 'mixing',
    SYSTEM  = 'system',
    DELETE  = 'delete',
    ADD     = 'add'
}

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
        hint:  'Mixing',
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
        icon:  'add',
        id:    ToolbarAction.ADD,
        hint:  'Add a mix',
        order: 2
    },
    {
        type:  ToolBarElementType.BUTTON,
        icon:  'delete',
        id:    ToolbarAction.DELETE,
        hint:  'Delete',
        order: 2
    }

];

enum MixGraphPhase {
    INPUTS = "INPUTS",
    SENSORS = "SENSORS",
    SENSOR_GROUPS = "SENSOR_GROUPS",
    CENTER = "CENTER",
    ACTUATOR_GROUPS = "ACTUATOR_GROUPS",
    ACTUATORS = "ACTUATORS"
}
