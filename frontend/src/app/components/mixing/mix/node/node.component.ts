/**
 *  This module contains the {@link NodeComponent|`NodeComponent`} and related classes.
 *
 *  @module
 */
import {Component, EventEmitter, Input, Output} from '@angular/core';
import {MatFormField, MatLabel} from '@angular/material/input';
import {MatOption} from '@angular/material/core';
import {MatSelect} from '@angular/material/select';
import {DATUM_TYPE_DISPLAY, ELABORATION_NODE_DISPLAY_NAME, ElaborationNodeLibraryItem, getColorVarNameForType} from '../../constants';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {DatumType} from '@common/mixing/mix/datum';
import {ArbitraryInputsElaborationNode, ElaborationNode, ElaborationNodeCode} from '@common/mixing/mix/elaboration-node';
import {MatCheckbox} from '@angular/material/checkbox';

// noinspection ES6UnusedImports
import type {TypedNullMarkedElaborationNode, TypedElaborationNode} from '@common/mixing/mix/elaboration-node';

/**
 * A component that shows the preview of an {@link ElaborationNode|`ElaborationNode`}.
 *
 * @component
 * @componentSelector `<house-mix-node>`
 */
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
export class NodeComponent {

    /** The {@link ElaborationNodeLibraryItem|`ElaborationNodeLibraryItem`} relative to the {@link ElaborationNode|`ElaborationNode`} to display. */
    public item?: ElaborationNodeLibraryItem;
    /**
     * An object containing an example instance for each {@link ElaborationNode|`ElaborationNode`} implementation class, by {@link ElaborationNodeCode|`ElaborationNodeCode`}.
     *
     * @input
     * @required
     */
    @Input({required: true})
    public examples!: Record<ElaborationNodeCode, ElaborationNode>;

    /**
     * Set the selected status of this node..
     *
     * @input
     */
    @Input()
    public set selected(value: boolean) {
        this._selected = value;
    }

    /**
     * Whether the node should show as selected.
     */
    public get selected(): boolean {
        return this._selected;
    }
    /**
     * Whether the node should show as expanded or in preview mode.
     *
     * @input
     */
    @Input()
    public expanded: boolean = true;

    /**
     * The {@link ElaborationNodeLibraryItem|`ElaborationNodeLibraryItem`} relative to the {@link ElaborationNode|`ElaborationNode`} to display.
     *
     * @input
     * @required
     * @inputAlias `library-item`
     */
    @Input({
               alias: 'library-item',
               required: true
    })
    public set libraryItem(value: ElaborationNodeLibraryItem) {
        if (value.special) {
            if (!value.isTimeout) {
                this.datumTypeFormControl.setValue(value.datumType);
                if (value.nullMarked) {
                    this.nullMarkFormControl.setValue(value.nullableMark);
                } else {
                    this.nullMarkFormControl.setValue(null);
                }
            }
        } else {
            this.datumTypeFormControl.setValue(null);
            this.nullMarkFormControl.setValue(null);
        }
        this.item = value;
    }

    /**
     * Event triggered when the node is selected.
     *
     * @output
     * @outputAlias `onSelected`
     */
    @Output('onSelected')
    public selectedEmitter: EventEmitter<void> = new EventEmitter<void>();

    /** Whether the node should show as selected. */
    protected _selected: boolean = false;

    /** The {@link FormControl|`FormControl`} handling the datum type {@link MatSelect|`MatSelect`} for {@link TypedElaborationNode|`TypedElaborationNode`s}. */
    protected datumTypeFormControl: FormControl<DatumType | null> = new FormControl<DatumType | null>(DatumType.BOOLEAN);
    /** The {@link FormControl|`FormControl`} handling the nullable {@link MatCheckbox|`MatCheckbox`} for {@link TypedNullMarkedElaborationNode|`TypedNullMarkedElaborationNode`s}. */
    protected nullMarkFormControl: FormControl<boolean | null>    = new FormControl<boolean | null>(false);

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     */
    constructor() {
        this.datumTypeFormControl.valueChanges.subscribe(value => {
            if (this.item == null) {
                return;
            }
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
                        if (this.item.isTimeout) {
                            this.examples[this.item.code] = new this.item.constructor(0, {creationTimestamp: Date.now()});
                        } else {
                            this.examples[this.item.code] = new this.item.constructor(0, {dataType: value});
                            this.item.datumType           = value;
                        }
                    }
                }
            }
        });
        this.nullMarkFormControl.valueChanges.subscribe(value => {
            if (this.item == null) {
                return;
            }
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
                        if (this.item.isTimeout) {
                            this.examples[this.item.code] = new this.item.constructor(0, {creationTimestamp: Date.now()});
                        } else {
                            this.examples[this.item.code] = new this.item.constructor(0, {dataType: this.datumTypeFormControl.value ?? this.item.datumType});
                            this.item.datumType           = this.datumTypeFormControl.value ?? this.item.datumType;
                        }
                    }
                }
            }
        });
    }

    /**
     * Checks whether an {@link ElaborationNode|`ElaborationNode`} is an instance of {@link ArbitraryInputsElaborationNode|`ArbitraryInputsElaborationNode`}.
     *
     * @param {ElaborationNode} example - The {@link ElaborationNode|`ElaborationNode`} to check.
     * @returns {example is ArbitraryInputsElaborationNode} `true` if `example` is an instance of {@link ArbitraryInputsElaborationNode|`ArbitraryInputsElaborationNode`}.
     */
    protected isArbitraryInputsNode(example: ElaborationNode): example is ArbitraryInputsElaborationNode {
        return example instanceof ArbitraryInputsElaborationNode;
    }

    /** @ignore */
    protected readonly getColorVarNameForType        = getColorVarNameForType;
    /** @ignore */
    protected readonly DATUM_TYPE_DISPLAY            = DATUM_TYPE_DISPLAY;
    /** @ignore */
    protected readonly ELABORATION_NODE_DISPLAY_NAME = ELABORATION_NODE_DISPLAY_NAME;
    /** @ignore */
    protected readonly Object                        = Object;
    /** @ignore */
    protected readonly DatumType                     = DatumType;
}
