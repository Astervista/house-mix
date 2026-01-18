import {Component} from '@angular/core';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatButton} from '@angular/material/button';
import {MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {DatumTypeDisplay, ELABORATION_NODE_DISPLAY_NAME, ELABORATION_NODE_LIBRARY, ElaborationNodeLibraryItem, getColorVarNameForType} from '../../constants';
import {ElaborationNode, ElaborationNodeCode, ElaborationNodeNullGuard} from '@common/mixing/mix/elaboration-node';
import {DatumType} from '@common/mixing/mix/datum';
import {MatFormField, MatLabel, MatOption, MatSelect} from '@angular/material/select';

;

@Component({
  selector: 'house-mix-node-library-dialog',
               imports: [
                   FormsModule,
                   MatButton,
                   MatDialogActions,
                   MatDialogContent,
                   MatDialogTitle,
                   MatDialogClose,
                   MatOption,
                   MatSelect,
                   MatFormField,
                   ReactiveFormsModule,
                   MatLabel
               ],
  templateUrl: './node-library-dialog.component.html',
  styleUrl: './node-library-dialog.component.scss'
})
export class NodeLibraryDialogComponent {

    protected result: ElaborationNodeLibraryItem | null = null;

    protected examples: Record<ElaborationNodeCode, ElaborationNode>

    protected nullGuardTypeFormControl: FormControl<DatumType | null> = new FormControl<DatumType | null>(DatumType.BOOLEAN);

    constructor(
        private dialogRef: MatDialogRef<ElaborationNodeLibraryItem>
    ) {
        const examples: Partial<Record<ElaborationNodeCode, ElaborationNode>> = {};
        for (const item of ELABORATION_NODE_LIBRARY) {
            if (item.code != ElaborationNodeCode.NULL_GUARD) {
                examples[item.code] = new item.constructor(0);
            } else {
                examples[item.code] = new item.constructor(0, {dataType: DatumType.BOOLEAN})
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
                this.dialogRef.close(this.result)
            } else {
                const result = {...this.result};
                result.datumType = this.nullGuardTypeFormControl.value ?? DatumType.BOOLEAN;
                this.dialogRef.close(result);
            }
        }
    }

    protected readonly ELABORATION_NODE_LIBRARY = ELABORATION_NODE_LIBRARY;
    protected readonly DatumTypeDisplay       = DatumTypeDisplay;
    protected readonly getColorVarNameForType        = getColorVarNameForType;
    protected readonly ELABORATION_NODE_DISPLAY_NAME = ELABORATION_NODE_DISPLAY_NAME;
    protected readonly ElaborationNodeCode = ElaborationNodeCode;
    protected readonly Object    = Object;
    protected readonly DatumType = DatumType;
}
