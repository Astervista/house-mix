/**
 *  This module contains the {@link AdjustmentComponent|`AdjustmentComponent`} and related classes.
 *
 *  @module
 */
import {Component, HostBinding, Input} from '@angular/core';
import {Adjustment, AdjustmentAnimationOff, AdjustmentAnimationOn, AdjustmentSplitCommands, AdjustmentType} from '@common/system/adjustment/adjustment';
import {TOOLTIP_TIMEOUT} from '../../../../utils/constants';
import {ADJUSTMENT_TYPE_DISPLAY} from '../../../system/constants';

/**
 * A component that can display a {@link Adjustment|`Adjustment`}.
 *
 * @component
 * @componentSelector `<house-mix-adjustment>`
 */
@Component({
               selector:    'house-mix-adjustment',
               imports:     [],
               templateUrl: './adjustment.component.html',
               styleUrl:    './adjustment.component.scss'
           })
export class AdjustmentComponent {

    /**
     * The {@link Adjustment|`Adjustment`} to display.
     *
     * @input
     * @required
     */
    @Input({required: true}) public adjustment!: Adjustment<unknown, unknown>;

    /**
     * Whether the component is selected. A selected component shows a colored outline on the element.
     *
     * @input
     * @hostBinding class.selected
     */
    @HostBinding('class.selected')
    @Input() public selected: boolean = false;

    /**
     * Tests if an {@link Adjustment|`Adjustment`} is an {@link AdjustmentAnimationOff|`AdjustmentAnimationOff`}
     * or {@link AdjustmentAnimationOn|`AdjustmentAnimationOn`}.
     *
     * @param {Adjustment<unknown, unknown>} adjustment - The {@link Adjustment|`Adjustment`} to check.
     * @returns {adjustment is AdjustmentAnimationOff | AdjustmentAnimationOn} - Whether the {@link Adjustment|`Adjustment`} is an
     *                                                                       {@link AdjustmentAnimationOff|`AdjustmentAnimationOff`}
     *                                                                       or {@link AdjustmentAnimationOn|`AdjustmentAnimationOn`}.
     */
    protected adjustmentIsOnOff(adjustment = this.adjustment): adjustment is AdjustmentAnimationOff | AdjustmentAnimationOn {
        return adjustment instanceof AdjustmentAnimationOff || adjustment instanceof AdjustmentAnimationOn;
    }


    /**
     * Tests if an {@link Adjustment|`Adjustment`} is an {@link AdjustmentSplitCommands|`AdjustmentSplitCommands`}.
     *
     * @param {Adjustment<unknown, unknown>} adjustment - The {@link Adjustment|`Adjustment`} to check.
     * @returns {adjustment is AdjustmentSplitCommands} - Whether the {@link Adjustment|`Adjustment`} is an
     *                                                     {@link AdjustmentSplitCommands|`AdjustmentSplitCommands`}.
     */
    protected adjustmentIsSplitCommands(adjustment = this.adjustment): adjustment is AdjustmentSplitCommands {
        return adjustment instanceof AdjustmentAnimationOff || adjustment instanceof AdjustmentSplitCommands;
    }

    /** @ignore */
    protected readonly TOOLTIP_TIMEOUT         = TOOLTIP_TIMEOUT;
    /** @ignore */
    protected readonly ADJUSTMENT_TYPE_DISPLAY = ADJUSTMENT_TYPE_DISPLAY;
    /** @ignore */
    protected readonly AdjustmentType          = AdjustmentType;
}

