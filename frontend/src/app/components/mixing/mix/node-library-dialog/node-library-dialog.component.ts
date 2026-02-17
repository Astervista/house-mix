import {Component} from '@angular/core';
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
                   MatSuffix
               ],
               templateUrl: './node-library-dialog.component.html',
               styleUrl:    './node-library-dialog.component.scss'
           })
export class NodeLibraryDialogComponent extends MatDialogComponent<undefined, ElaborationNodeLibraryItem> {

    protected result: ElaborationNodeLibraryItem | null = null;

    protected examples: Record<ElaborationNodeCode, ElaborationNode>;

    protected searchFormControl: FormControl<string | null> = new FormControl<string | null>(null);

    protected searchResults: ElaborationNodeLibraryItem[] | null = null;

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
                            examples[item.code] = new item.constructor(0, {dataType: item.datumType, nullable: item.nullMarked, inputNumber: 1});
                        } else {
                            examples[item.code] = new item.constructor(0, {dataType: item.datumType, nullable: item.nullMarked});
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
                    .filter(nodeInfo => {
                        const candidates = [
                            nodeInfo.sectionName.toLowerCase(),
                            nodeInfo.node.description.toLowerCase(),
                            ELABORATION_NODE_DISPLAY_NAME[nodeInfo.node.code].toLowerCase(),
                            ...(examples[nodeInfo.node.code]?.inputs.map(input => input.name.toLowerCase()) ?? []),
                            ...(examples[nodeInfo.node.code]?.outputs.map(output => output.name.toLowerCase()) ?? [])
                        ];
                        return candidates.some(candidate => pieces.every(piece => candidate.includes(piece)));
                    })
                    .map(node => node.node);
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
