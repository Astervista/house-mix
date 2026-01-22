import {Component, HostBinding, Input} from '@angular/core';
import {TOOLTIP_TIMEOUT} from '../../../../utils/constants';
import { SystemParameter } from "@common/system/parameter/system-parameter";
import {MatTooltip} from '@angular/material/tooltip';
import {DATUM_TYPE_DISPLAY, getColorVarNameForType} from '../../../mixing/constants';

@Component({
  selector: 'house-mix-parameter',
               imports: [
                   MatTooltip
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
    protected readonly DATUM_TYPE_DISPLAY     = DATUM_TYPE_DISPLAY;
}
