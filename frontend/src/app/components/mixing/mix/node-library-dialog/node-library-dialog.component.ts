/**
 *  This module contains the {@link NodeLibraryDialogComponent|`NodeLibraryDialogComponent`} and related classes.
 *
 *  @module
 */
import {Component, ElementRef, ViewChild} from '@angular/core';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatButton, MatIconButton} from '@angular/material/button';
import {MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {DATUM_TYPE_DISPLAY, ELABORATION_NODE_DISPLAY_NAME, ELABORATION_NODE_LIBRARY, ElaborationNodeLibraryItem, getColorVarNameForType} from '../../constants';
import {ElaborationNode, ElaborationNodeCode} from '@common/mixing/mix/elaboration-node';
import {DatumType} from '@common/mixing/mix/datum';
import {MatDialogComponent} from '../../../../utils/better-mat-dialog';
import {MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle} from '@angular/material/expansion';
import {NodeComponent} from '../node/node.component';
import {MatIcon} from '@angular/material/icon';
import {MatTooltip} from '@angular/material/tooltip';
import {TOOLTIP_TIMEOUT} from '../../../../utils/constants';
import {MatFormField, MatInput, MatPrefix, MatSuffix} from '@angular/material/input';
import {LocalStorageService} from '../../../../services/local-storage.service';
import {InputReturnBehaviorDirective, InputReturnBehaviorExcludeDirective} from '../../../../directives/input-return-behavior/input-return-behavior.directive';
import {ScrollOnSelectedDirective} from '../../../../directives/scroll-on-selected/scroll-on-selected.directive';

// noinspection ES6UnusedImports
import type {ElaborationNodeLibrarySection} from '../../constants';
// noinspection ES6UnusedImports
import type {Mix} from '@common/mixing/mix/mix';

/**
 * Key for saving the {@link NodeLibraryDialogComponent|`NodeLibraryDialogComponent`} status in the {@link LocalStorageService|`LocalStorageService`}.
 *
 * @notExported
 */
const NODE_LIBRARY_STATUS_STORAGE_KEY = {name: 'node-library-status', defaultValue: {expanded: true}};

/**
 * A dialog for choosing an {@link ElaborationNode|`ElaborationNode`} to insert in a {@link Mix|`Mix`} being edited.
 *
 * The dialog shows all the {@link ElaborationNode|`ElaborationNode`} types that are available grouped by
 * {@link ElaborationNodeLibrarySection|`ElaborationNodeLibrarySection`}, and provides a way to search and filter them.
 *
 * @component
 * @componentSelector `<house-mix-node-library-dialog>`
 */
@Component({
               selector:    'house-mix-node-library-dialog',
               imports: [
                   FormsModule,
                   MatButton,
                   MatDialogActions,
                   MatDialogContent,
                   MatDialogTitle,
                   ReactiveFormsModule,
                   MatExpansionPanelHeader,
                   MatExpansionPanel,
                   MatAccordion,
                   MatExpansionPanelTitle,
                   NodeComponent,
                   MatIconButton,
                   MatIcon,
                   MatTooltip,
                   MatFormField,
                   MatInput,
                   MatPrefix,
                   MatSuffix,
                   InputReturnBehaviorDirective,
                   InputReturnBehaviorExcludeDirective,
                   ScrollOnSelectedDirective
               ],
               templateUrl: './node-library-dialog.component.html',
               styleUrl:    './node-library-dialog.component.scss'
           })
export class NodeLibraryDialogComponent extends MatDialogComponent<undefined, ElaborationNodeLibraryItem> {

    /**
     * The {@link ElaborationNodeLibraryItem|`ElaborationNodeLibraryItem`} relative to the {@link ElaborationNode|`ElaborationNode`}
     * to be inserted in the {@link Mix|`Mix`}.
     */
    protected result: ElaborationNodeLibraryItem | null = null;

    /** An object containing an example instance for each {@link ElaborationNode|`ElaborationNode`} implementation class, by {@link ElaborationNodeCode|`ElaborationNodeCode`}. */
    protected examples: Record<ElaborationNodeCode, ElaborationNode>;

    /** The {@link FormControl|`FormControl`} handling the search bar input. */
    protected searchFormControl: FormControl<string | null> = new FormControl<string | null>(null);

    /** The {@link ElaborationNodeLibraryItem|`ElaborationNodeLibraryItem`s} relative to the {@link ElaborationNode|`ElaborationNode`s} filtered according to the search text. */
    protected searchResults: ElaborationNodeLibraryItem[] | null = null;

    /** Whether the nodes should be shown as expanded or preview. */
    private _expanded: boolean | null = null;

    /**
     * The {@link HTMLDivElement|`HTMLDivElement`} containing the search results.
     *
     * @viewChild `#searchResultsDiv`
     */
    @ViewChild('searchResultsDiv')
    private searchResultsDiv?: ElementRef<HTMLDivElement>;

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {MatDialogRef<NodeLibraryDialogComponent, ElaborationNodeLibraryItem>} dialogRef - The dialog reference.
     * @param {LocalStorageService} localStorageService - The local storage service. Instantiated by dependency injection.
     */
    constructor(
        dialogRef: MatDialogRef<NodeLibraryDialogComponent, ElaborationNodeLibraryItem>,
        private localStorageService: LocalStorageService
    ) {
        super(undefined, dialogRef);
        const examples: Partial<Record<ElaborationNodeCode, ElaborationNode>> = {};
        for (const section of ELABORATION_NODE_LIBRARY) {
            for (const item of section.nodes) {
                if (item.special) {
                    if (!item.nullMarked) {
                        if (item.isTimeout) {
                            examples[item.code] = new item.constructor(0, {creationTimestamp: Date.now()});
                        } else {
                            examples[item.code] = new item.constructor(0, {dataType: item.datumType});
                        }
                    } else {
                        if (item.arbitraryNumber) {
                            examples[item.code] = new item.constructor(0, {dataType: item.datumType, nullable: item.nullableMark, inputNumber: 1});
                        } else {
                            examples[item.code] = new item.constructor(0, {dataType: item.datumType, nullable: item.nullableMark});
                        }
                    }
                } else {
                    examples[item.code] = new item.constructor(0);
                }
            }
        }
        this.examples = examples as Record<ElaborationNodeCode, ElaborationNode>;
        this.searchFormControl.valueChanges.subscribe(value => {
            if (value == null || value.trim().length == 0) {
                this.searchResults = null;
            } else {
                const pieces       = value.toLowerCase().split(/\s+/).map(piece => piece.trim()).filter(piece => piece.length > 0);
                this.searchResults = ELABORATION_NODE_LIBRARY
                    .flatMap(section =>
                                 section
                                     .nodes
                                     .map(node => ({node, sectionName: section.sectionName}))
                    )
                    .map((nodeInfo): [number, ElaborationNodeLibraryItem] => {
                        const candidates = [
                            [ELABORATION_NODE_DISPLAY_NAME[nodeInfo.node.code].toLowerCase()],
                            [nodeInfo.node.description.toLowerCase()],
                            examples[nodeInfo.node.code]?.inputs.map(input => input.name.toLowerCase()) ?? [],
                            examples[nodeInfo.node.code]?.outputs.map(output => output.name.toLowerCase()) ?? [],
                            [nodeInfo.sectionName.toLowerCase()]
                        ];
                        return [candidates.findIndex(section => section.some(candidate => pieces.every(piece => candidate.includes(piece)))), nodeInfo.node];
                    })
                    .filter(([matchIndex]) => matchIndex != -1)
                    .sort(([aIndex, aNode], [bIndex, bNode]) => {
                        if (aIndex != bIndex) {
                            return aIndex - bIndex;
                        } else {
                            return ELABORATION_NODE_DISPLAY_NAME[aNode.code].toLowerCase().localeCompare(ELABORATION_NODE_DISPLAY_NAME[bNode.code].toLowerCase());
                        }
                    })
                    .map(([_, node]) => node);
            }
        });
    }

    /** Whether the nodes should be shown as expanded or preview. */
    protected get expanded(): boolean {
        if (this._expanded == null) {
            const save     = this.localStorageService.getItem(NODE_LIBRARY_STATUS_STORAGE_KEY);
            this._expanded = save.expanded;
        }
        return this._expanded;
    }

    /** Choose whether the nodes should be shown as expanded or preview. */
    protected set expanded(value: boolean) {
        this._expanded = value;
        this.localStorageService.setItem(
            NODE_LIBRARY_STATUS_STORAGE_KEY,
            {expanded: value}
        );
    }

    /**
     * Filter a list of {@link ElaborationNodeLibraryItem|`ElaborationNodeLibraryItem`s} including only the elements
     * that are in the search results.
     *
     * @param {ElaborationNodeLibraryItem[]} nodes - The {@link ElaborationNodeLibraryItem|`ElaborationNodeLibraryItem`} to filtered.
     * @returns {ElaborationNodeLibraryItem[]} - The filtered {@link ElaborationNodeLibraryItem|`ElaborationNodeLibraryItem`s}.
     */
    protected filterSearchNodes(nodes: ElaborationNodeLibraryItem[]): ElaborationNodeLibraryItem[] {
        return nodes.filter(node => this.searchResults == null ? true : this.searchResults.includes(node));
    }

    /**
     * Handler for the keydown event on the search bar.
     *
     * @param {KeyboardEvent} event - The DOM event.
     */
    protected searchKeyDown(event: KeyboardEvent): void {
        if (event.key == 'Enter' && this.searchResultsDiv) {
            event.preventDefault();
            this.searchResultsDiv.nativeElement.focus();
            if (this.result == null || this.searchResults?.includes(this.result) == false) {
                this.result = null;
            }
            this.result ??= this.searchResults?.[0] ?? null;
        }
    }

    /**
     * Handler for the keydown event on a search result.
     *
     * @param {KeyboardEvent} event - The DOM event.
     */
    protected searchResultsKeyDown(event: KeyboardEvent): void {
        if (event.code == 'ArrowRight') {
            event.preventDefault();
            if (this.result == null || this.searchResults == null || this.searchResults.length == 0) {
                this.result ??= this.searchResults?.[0] ?? null;
            } else {
                const index = (this.searchResults.indexOf(this.result) + 1) % this.searchResults.length;
                this.result = this.searchResults[index] ?? null;
            }
        } else if (event.code == 'ArrowLeft') {
            event.preventDefault();
            if (this.result == null || this.searchResults == null || this.searchResults.length == 0) {
                this.result ??= this.searchResults?.[0] ?? null;
            } else {
                const index = (this.searchResults.indexOf(this.result) + this.searchResults.length - 1) % this.searchResults.length;
                this.result = this.searchResults[index] ?? null;
            }
        } else if (event.code == 'Enter') {
            event.preventDefault();
            this.confirm();
        }
    }

    /**
     * If an {@link ElaborationNode|`ElaborationNode`} is selected, closes the dialog with it as a return value.
     */
    protected confirm(): void {
        if (this.result != null) {
            if (!this.result.special) {
                this.closeDialog(this.result);
            } else {
                const result = {...this.result};
                this.closeDialog(result);
            }
        }
    }

    /** @ignore */
    protected readonly ELABORATION_NODE_LIBRARY = ELABORATION_NODE_LIBRARY;
    /** @ignore */
    protected readonly DATUM_TYPE_DISPLAY       = DATUM_TYPE_DISPLAY;
    /** @ignore */
    protected readonly getColorVarNameForType   = getColorVarNameForType;
    /** @ignore */
    protected readonly ELABORATION_NODE_DISPLAY_NAME = ELABORATION_NODE_DISPLAY_NAME;
    /** @ignore */
    protected readonly ElaborationNodeCode      = ElaborationNodeCode;
    /** @ignore */
    protected readonly Object                   = Object;
    /** @ignore */
    protected readonly DatumType                = DatumType;
    /** @ignore */
    protected readonly TOOLTIP_TIMEOUT = TOOLTIP_TIMEOUT;
}
