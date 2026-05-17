/**
 *  This module contains the {@link TimerComponent|`TimerComponent`} and related classes.
 *
 *  @module
 */
import {Component, HostBinding, Input} from '@angular/core';
import {TOOLTIP_TIMEOUT} from '../../../../utils/constants';
import {SystemTimer, TimerType} from '@common/system/timer/system-timer';
import {MatTooltip} from '@angular/material/tooltip';
import {SYSTEM_TIMER_TYPE_DISPLAY} from '../../../system/constants';
import {DatePipe} from '@angular/common';

/**
 * A component that can display a {@link SystemTimer|`SystemTimer`}.
 *
 * @component
 * @componentSelector `<house-mix-timer>`
 */
@Component({
  selector: 'house-mix-timer',
               imports: [
                   MatTooltip,
                   DatePipe
               ],
  templateUrl: './timer.component.html',
  styleUrl: './timer.component.scss'
})
export class TimerComponent {

    /**
     * The {@link SystemTimer|`SystemTimer`} to display.
     *
     * @input
     * @required
     */
    @Input({required: true}) public timer!: SystemTimer;

    /**
     * Whether the component is selected. A selected component shows a colored outline on the element.
     *
     * @input
     * @hostBinding class.selected
     */
    @HostBinding("class.selected")
    @Input() public selected: boolean = false;

    /** @ignore */
    protected readonly TOOLTIP_TIMEOUT           = TOOLTIP_TIMEOUT;
    /** @ignore */
    protected readonly SYSTEM_TIMER_TYPE_DISPLAY = SYSTEM_TIMER_TYPE_DISPLAY;
    /** @ignore */
    protected readonly TimerType                 = TimerType;
}
