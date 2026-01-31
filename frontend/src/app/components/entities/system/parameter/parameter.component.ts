import {Component, HostBinding, Input} from '@angular/core';
import {getDateDisplayFormat, TOOLTIP_TIMEOUT} from '../../../../utils/constants';
import { SystemParameter } from "@common/system/parameter/system-parameter";
import {MatTooltip} from '@angular/material/tooltip';
import {DATUM_TYPE_DISPLAY, getColorVarNameForType, MEASURES} from '../../../mixing/constants';
import {Datum, DatumType} from '@common/mixing/mix/datum';
import {DatePipe} from '@angular/common';

@Component({
  selector: 'house-mix-parameter',
               imports: [
                   MatTooltip,
                   DatePipe
               ],
  templateUrl: './parameter.component.html',
  styleUrl: './parameter.component.scss'
})
export class ParameterComponent {

    @Input({required: true}) public parameter!: SystemParameter;
    @HostBinding("class.selected")
    @Input() public selected: boolean = false;

    protected readonly TOOLTIP_TIMEOUT        = TOOLTIP_TIMEOUT;
    protected readonly getColorVarNameForType = getColorVarNameForType;
    protected readonly DATUM_TYPE_DISPLAY   = DATUM_TYPE_DISPLAY;
    protected readonly getDateDisplayFormat = getDateDisplayFormat;
    protected readonly DatumType = DatumType;
    protected readonly Datum    = Datum;
    protected readonly MEASURES = MEASURES;
}
