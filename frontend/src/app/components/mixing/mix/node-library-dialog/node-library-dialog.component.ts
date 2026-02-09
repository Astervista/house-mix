import {Component} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatButton} from '@angular/material/button';
import {MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {DATUM_TYPE_DISPLAY, ELABORATION_NODE_DISPLAY_NAME, ELABORATION_NODE_LIBRARY, ElaborationNodeLibraryItem, getColorVarNameForType} from '../../constants';
import {ElaborationNode, ElaborationNodeCode} from '@common/mixing/mix/elaboration-node';
import {DatumType} from '@common/mixing/mix/datum';
import {MatDialogComponent} from '../../../../utils/better-mat-dialog';
import {MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle} from '@angular/material/expansion';
import {NodeComponent} from '../node/node.component';

@Component({
               selector:    'house-mix-node-library-dialog',
               imports:     [
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
                   NodeComponent
               ],
               templateUrl: './node-library-dialog.component.html',
               styleUrl:    './node-library-dialog.component.scss'
           })
export class NodeLibraryDialogComponent extends MatDialogComponent<undefined, ElaborationNodeLibraryItem> {

    protected result: ElaborationNodeLibraryItem | null = null;

    protected examples: Record<ElaborationNodeCode, ElaborationNode>;

    constructor(
        dialogRef: MatDialogRef<NodeLibraryDialogComponent, ElaborationNodeLibraryItem>
    ) {
        super(undefined, dialogRef);
        const examples: Partial<Record<ElaborationNodeCode, ElaborationNode>> = {};
        for (const section of ELABORATION_NODE_LIBRARY) {
            for (const item of section.nodes) {
                if (item.special) {
                    if (!item.nullMarked) {
                        examples[item.code] = new item.constructor(0, {dataType: item.datumType});
                    } else {
                        examples[item.code] = new item.constructor(0, {dataType: item.datumType, nullable: item.nullMarked});
                    }
                } else {
                    examples[item.code] = new item.constructor(0);
                }
            }
        }
        this.examples = examples as Record<ElaborationNodeCode, ElaborationNode>;
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

}
