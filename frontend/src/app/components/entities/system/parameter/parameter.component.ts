/**
 *  This module contains the {@link ParameterComponent|`ParameterComponent`} and related classes.
 *
 *  @module
 */
import {Component, HostBinding, Input} from '@angular/core';
import {getDateDisplayFormat, TOOLTIP_TIMEOUT} from '../../../../utils/constants';
import { SystemParameter } from "@common/system/parameter/system-parameter";
import {MatTooltip} from '@angular/material/tooltip';
import {DATUM_TYPE_DISPLAY, getColorVarNameForType, MEASURES} from '../../../mixing/constants';
import {Datum, DatumType, DatumTypeColorBase} from '@common/mixing/mix/datum';
import {DatePipe} from '@angular/common';

/**
 * A component that can display a {@link SystemParameter|`SystemParameter`}.
 *
 * @component
 * @componentSelector `<house-mix-parameter>`
 */
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

    /**
     * The {@link SystemParameter|`SystemParameter`} to display.
     *
     * @input
     * @required
     */
    @Input({required: true}) public parameter!: SystemParameter;

    /**
     * Whether the component is selected. A selected component shows a colored outline on the element.
     *
     * @input
     * @hostBinding class.selected
     */
    @HostBinding("class.selected")
    @Input() public selected: boolean = false;

    /** @ignore */
    protected readonly TOOLTIP_TIMEOUT        = TOOLTIP_TIMEOUT;
    /** @ignore */
    protected readonly getColorVarNameForType = getColorVarNameForType;
    /** @ignore */
    protected readonly DATUM_TYPE_DISPLAY   = DATUM_TYPE_DISPLAY;
    /** @ignore */
    protected readonly getDateDisplayFormat = getDateDisplayFormat;
    /** @ignore */
    protected readonly DatumType = DatumType;
    /** @ignore */
    protected readonly Datum    = Datum;
    /** @ignore */
    protected readonly MEASURES = MEASURES;
    /** @ignore */
    protected readonly DatumTypeColorBase = DatumTypeColorBase;
}
