import {Component, HostBinding, Input} from '@angular/core';
import {Adjustment, AdjustmentAnimationOff, AdjustmentAnimationOn, AdjustmentSplitCommands, AdjustmentType} from '@common/system/adjustment/adjustment';
import {TOOLTIP_TIMEOUT} from '../../../../utils/constants';
import {ADJUSTMENT_TYPE_DISPLAY} from '../../../system/constants';

@Component({
               selector:    'house-mix-adjustment',
               imports:     [],
               templateUrl: './adjustment.component.html',
               styleUrl:    './adjustment.component.scss'
           })
export class AdjustmentComponent {

    @Input({required: true}) public adjustment!: Adjustment<unknown, unknown>;

    @HostBinding('class.selected')
    @Input() public selected: boolean = false;

    protected adjustmentIsOnOff(adjustment = this.adjustment): adjustment is AdjustmentAnimationOff | AdjustmentAnimationOn {
        return adjustment instanceof AdjustmentAnimationOff || adjustment instanceof AdjustmentAnimationOn;
    }

    protected adjustmentIsSplitCommands(adjustment = this.adjustment): adjustment is AdjustmentSplitCommands {
        return adjustment instanceof AdjustmentAnimationOff || adjustment instanceof AdjustmentSplitCommands;
    }

    protected readonly TOOLTIP_TIMEOUT         = TOOLTIP_TIMEOUT;
    protected readonly ADJUSTMENT_TYPE_DISPLAY = ADJUSTMENT_TYPE_DISPLAY;
    protected readonly AdjustmentType          = AdjustmentType;
}

