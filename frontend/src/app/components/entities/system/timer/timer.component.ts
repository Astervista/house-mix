import {Component, HostBinding, Input} from '@angular/core';
import {TOOLTIP_TIMEOUT} from '../../../../utils/constants';
import {SystemTimer, TimerType} from '@common/system/timer/system-timer';
import {MatTooltip} from '@angular/material/tooltip';
import {SYSTEM_TIMER_TYPE_DISPLAY} from '../../../system/constants';
import {DatePipe} from '@angular/common';

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

    @Input({required: true}) public timer!: SystemTimer;

    @HostBinding("class.selected")
    @Input() public selected: boolean = false;

    protected readonly TOOLTIP_TIMEOUT           = TOOLTIP_TIMEOUT;
    protected readonly SYSTEM_TIMER_TYPE_DISPLAY = SYSTEM_TIMER_TYPE_DISPLAY;
    protected readonly TimerType                 = TimerType;
}
