import {Component} from '@angular/core';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatButton} from '@angular/material/button';
import {MatDialogActions,  MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {DATUM_TYPE_DISPLAY, ELABORATION_NODE_DISPLAY_NAME, ELABORATION_NODE_LIBRARY, ElaborationNodeLibraryItem, getColorVarNameForType} from '../../constants';
import {ElaborationNode, ElaborationNodeCode, ElaborationNodeNullGuard} from '@common/mixing/mix/elaboration-node';
import {DatumType} from '@common/mixing/mix/datum';
import {MatFormField, MatLabel, MatOption, MatSelect} from '@angular/material/select';
import {MatDialogComponent} from '../../../../utils/better-mat-dialog';
import {MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle} from '@angular/material/expansion';

;

@Component({
  selector: 'house-mix-node-library-dialog',
               imports: [
                   FormsModule,
                   MatButton,
                   MatDialogActions,
                   MatDialogContent,
                   MatDialogTitle,

                   MatOption,
                   MatSelect,
                   MatFormField,
                   ReactiveFormsModule,
                   MatLabel,
                   MatExpansionPanelHeader,
                   MatExpansionPanel,
                   MatAccordion,
                   MatExpansionPanelTitle
               ],
  templateUrl: './node-library-dialog.component.html',
  styleUrl: './node-library-dialog.component.scss'
})
export class NodeLibraryDialogComponent extends MatDialogComponent<undefined, ElaborationNodeLibraryItem> {

    protected result: ElaborationNodeLibraryItem | null = null;

    protected examples: Record<ElaborationNodeCode, ElaborationNode>

    protected nullGuardTypeFormControl: FormControl<DatumType | null> = new FormControl<DatumType | null>(DatumType.BOOLEAN);

    constructor(
        dialogRef: MatDialogRef<NodeLibraryDialogComponent, ElaborationNodeLibraryItem>
    ) {
        super(undefined, dialogRef);
        const examples: Partial<Record<ElaborationNodeCode, ElaborationNode>> = {};
        for (const section of ELABORATION_NODE_LIBRARY) {
            for (const item of section.nodes) {
                if (item.code != ElaborationNodeCode.NULL_GUARD) {
                    examples[item.code] = new item.constructor(0);
                } else {
                    examples[item.code] = new item.constructor(0, {dataType: DatumType.BOOLEAN})
                }
            }
        }
        this.examples = examples as Record<ElaborationNodeCode, ElaborationNode>

        this.nullGuardTypeFormControl.valueChanges.subscribe(value => {
            if (value != null) {
                examples[ElaborationNodeCode.NULL_GUARD] = new ElaborationNodeNullGuard(0, {dataType: value});
            }
        })
    }

    protected confirm(): void {
        if (this.result != null) {
            if (!this.result.special) {
                this.closeDialog(this.result)
            } else {
                const result = {...this.result};
                result.datumType = this.nullGuardTypeFormControl.value ?? DatumType.BOOLEAN;
                this.closeDialog(result);
            }
        }
    }

    protected readonly ELABORATION_NODE_LIBRARY = ELABORATION_NODE_LIBRARY;
    protected readonly DATUM_TYPE_DISPLAY       = DATUM_TYPE_DISPLAY;
    protected readonly getColorVarNameForType   = getColorVarNameForType;
    protected readonly ELABORATION_NODE_DISPLAY_NAME = ELABORATION_NODE_DISPLAY_NAME;
    protected readonly ElaborationNodeCode = ElaborationNodeCode;
    protected readonly Object    = Object;
    protected readonly DatumType = DatumType;
}
