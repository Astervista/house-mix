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

const NODE_LIBRARY_STATUS_STORAGE_KEY = {name: 'node-library-status', defaultValue: {expanded: true}};

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

    protected result: ElaborationNodeLibraryItem | null = null;

    protected examples: Record<ElaborationNodeCode, ElaborationNode>;

    protected searchFormControl: FormControl<string | null> = new FormControl<string | null>(null);

    protected searchResults: ElaborationNodeLibraryItem[] | null = null;

    @ViewChild('searchResultsDiv')
    private searchResultsDiv?: ElementRef<HTMLDivElement>;

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
                        examples[item.code] = new item.constructor(0, {dataType: item.datumType});
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

    private _expanded: boolean | null = null;

    protected get expanded(): boolean {
        if (this._expanded == null) {
            const save     = this.localStorageService.getItem(NODE_LIBRARY_STATUS_STORAGE_KEY);
            this._expanded = save.expanded;
        }
        return this._expanded;
    }

    protected set expanded(value: boolean) {
        this._expanded = value;
        this.localStorageService.setItem(
            NODE_LIBRARY_STATUS_STORAGE_KEY,
            {expanded: value}
        );
    }

    protected filterSearchNodes(nodes: ElaborationNodeLibraryItem[]): ElaborationNodeLibraryItem[] {
        return nodes.filter(node => this.searchResults == null ? true : this.searchResults.includes(node));
    }

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

    protected readonly ELABORATION_NODE_LIBRARY = ELABORATION_NODE_LIBRARY;
    protected readonly DATUM_TYPE_DISPLAY       = DATUM_TYPE_DISPLAY;
    protected readonly getColorVarNameForType   = getColorVarNameForType;
    protected readonly ELABORATION_NODE_DISPLAY_NAME = ELABORATION_NODE_DISPLAY_NAME;
    protected readonly ElaborationNodeCode      = ElaborationNodeCode;
    protected readonly Object                   = Object;
    protected readonly DatumType                = DatumType;

    protected readonly TOOLTIP_TIMEOUT = TOOLTIP_TIMEOUT;
}
