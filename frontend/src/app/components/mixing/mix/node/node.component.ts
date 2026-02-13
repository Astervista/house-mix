import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {MatFormField, MatLabel} from '@angular/material/input';
import {MatOption} from '@angular/material/core';
import {MatSelect} from '@angular/material/select';
import {DATUM_TYPE_DISPLAY, ELABORATION_NODE_DISPLAY_NAME, ElaborationNodeLibraryItem, getColorVarNameForType} from '../../constants';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {DatumType} from '@common/mixing/mix/datum';
import {ArbitraryInputsElaborationNode, ElaborationNode, ElaborationNodeCode} from '@common/mixing/mix/elaboration-node';
import {MatCheckbox} from '@angular/material/checkbox';

@Component({
               selector:    'house-mix-node',
               imports:     [
                   MatFormField,
                   MatLabel,
                   MatOption,
                   MatSelect,
                   ReactiveFormsModule,
                   MatCheckbox
               ],
               templateUrl: './node.component.html',
               styleUrl:    './node.component.scss'
           })
export class NodeComponent implements OnInit {

    @Input({alias: 'library-item', required: true}) public item!: ElaborationNodeLibraryItem;
    @Input({required: true}) public examples!: Record<ElaborationNodeCode, ElaborationNode>;
    @Input() public selected: boolean = false;

    @Output('onSelected') public selectedEmitter: EventEmitter<void> = new EventEmitter<void>();

    protected datumTypeFormControl: FormControl<DatumType | null> = new FormControl<DatumType | null>(DatumType.BOOLEAN);
    protected nullMarkFormControl: FormControl<boolean | null>    = new FormControl<boolean | null>(false);

    constructor() {
        this.datumTypeFormControl.valueChanges.subscribe(value => {
            if (value != null) {
                if (!this.item.special) {
                    this.examples[this.item.code] = new this.item.constructor(0);
                } else {
                    if (this.item.nullMarked) {
                        if (this.item.arbitraryNumber) {
                            this.examples[this.item.code] =
                                new this.item.constructor(0, {nullable: this.nullMarkFormControl.value ?? this.item.nullableMark, dataType: value, inputNumber: 1});
                        } else {
                            this.examples[this.item.code] = new this.item.constructor(0, {nullable: this.nullMarkFormControl.value ?? this.item.nullableMark, dataType: value});
                        }
                        this.item.nullableMark = this.nullMarkFormControl.value ?? this.item.nullableMark;
                        this.item.datumType    = value;
                    } else {
                        this.examples[this.item.code] = new this.item.constructor(0, {dataType: value});
                        this.item.datumType           = value;
                    }
                }
            }
        });
        this.nullMarkFormControl.valueChanges.subscribe(value => {
            if (value != null) {
                if (!this.item.special) {
                    this.examples[this.item.code] = new this.item.constructor(0);
                } else {
                    if (this.item.nullMarked) {
                        if (this.item.arbitraryNumber) {
                            this.examples[this.item.code] = new this.item.constructor(0, {nullable: value, dataType: this.datumTypeFormControl.value ?? this.item.datumType, inputNumber: 1});
                        } else {
                            this.examples[this.item.code] = new this.item.constructor(0, {nullable: value, dataType: this.datumTypeFormControl.value ?? this.item.datumType});
                        }
                        this.item.nullableMark = value;
                        this.item.datumType    = this.datumTypeFormControl.value ?? this.item.datumType;
                    } else {
                        this.examples[this.item.code] = new this.item.constructor(0, {dataType: this.datumTypeFormControl.value ?? this.item.datumType});
                        this.item.datumType           = this.datumTypeFormControl.value ?? this.item.datumType;
                    }
                }
            }
        });
    }

    public ngOnInit(): void {
        if (this.item.special) {
            this.datumTypeFormControl.setValue(this.item.datumType);
        }
    }

    protected isArbitraryInputsNode(example: ElaborationNode): example is ArbitraryInputsElaborationNode {
        return example instanceof ArbitraryInputsElaborationNode;
    }

    protected readonly getColorVarNameForType        = getColorVarNameForType;
    protected readonly DATUM_TYPE_DISPLAY            = DATUM_TYPE_DISPLAY;
    protected readonly ELABORATION_NODE_DISPLAY_NAME = ELABORATION_NODE_DISPLAY_NAME;
    protected readonly Object                        = Object;
    protected readonly DatumType                     = DatumType;
}
