import {Component, forwardRef, HostBinding, HostListener, Input} from '@angular/core';
import {ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule} from '@angular/forms';
import {DateTime} from 'luxon';
import {MatRipple} from '@angular/material/core';

const HOUR_DIGITS   = new Array(12).fill(0).map((_, i) => i + 1);
const MINUTE_DIGITS = new Array(12).fill(0).map((_, i) => ((i + 1) * 5) % 60);

@Component({
               selector:    'house-mix-time-picker',
               imports:     [
                   ReactiveFormsModule,
                   MatRipple
               ],
               providers:   [
                   {
                       provide:     NG_VALUE_ACCESSOR,
                       useExisting: forwardRef(() => TimePickerComponent),
                       multi:       true
                   }
               ],
               templateUrl: './time-picker.component.html',
               styleUrl:    './time-picker.component.scss'
           })
export class TimePickerComponent implements ControlValueAccessor {

    protected phase: Phase = Phase.HOURS;

    protected hour: number | null   = null;
    protected minute: number | null = null;
    protected second: number | null = null;

    protected timeFormControl: FormControl<DateTime | null> = new FormControl<DateTime | null>(null);

    private _dayHalf: 'AM' | 'PM' = 'AM';

    constructor() {
        this.formControl = this.timeFormControl;
    }

    @Input()
    public set formControl(formControl: FormControl<DateTime | null>) {
        this.timeFormControl = formControl;
        this.timeFormControl.valueChanges.subscribe(value => {
            this.hour     = value != null ? ((value.hour % 12) == 0 ? 12 : (value.hour % 12)) : null;
            this._dayHalf = (value?.hour ?? 1) < 12 ? 'AM' : 'PM';
            this.minute   = value?.minute ?? null;
            this.second   = value?.second ?? null;
        });
    }

    private dragging = false;

    protected set dayHalf(dayHalf: 'AM' | 'PM') {
        this._dayHalf = dayHalf;
        this.updateFormControl();
    }

    protected get dayHalf(): 'AM' | 'PM' {
        return this._dayHalf;
    }


    private updateFormControl(): void {
        if (this.hour != null && this.minute != null && this.second != null) {
            let hour = this.hour;
            if (this.dayHalf == 'PM') {
                if (hour != 12) {
                    hour += 12;
                }
            } else if (hour == 12) {
                hour = 0;
            }
            this.timeFormControl.setValue(
                DateTime.fromJSDate(
                    new Date(
                        2000,
                        0,
                        1,
                        hour,
                        this.minute,
                        this.second
                    )
                )
            );
        }
    }

    protected mouseDown(event: MouseEvent): void {
        this.dragging = true;
        this.mouseMove(event);
    }

    protected mouseMove(event: MouseEvent): void {
        if (this.dragging && this.timeFormControl.enabled) {
            const boundingClientRect = (event.target as HTMLElement).getBoundingClientRect();
            const x                  = ((event.clientX - boundingClientRect.x) / boundingClientRect.width - 0.5) * 2;
            const y                  = ((event.clientY - boundingClientRect.y) / boundingClientRect.height - 0.5) * 2;
            const rotationFraction   = (Math.atan2(y, x) / (2 * Math.PI) + 1.25) % 1;
            if (this.phase == Phase.HOURS) {
                let hours = Math.round(rotationFraction * 12);
                if (hours == 0) {
                    hours = 12;
                }
                this.hour = hours;
            } else if (this.phase == Phase.MINUTES) {
                this.minute = Math.round(rotationFraction * 60);
            } else {
                this.second = Math.round(rotationFraction * 60);
            }
            this.updateFormControl();
        }
    }

    protected mouseUp(event: MouseEvent): void {
        this.mouseMove(event);
        this.dragging = false;
        if (this.timeFormControl.enabled) {
            if (this.phase == Phase.HOURS) {
                this.phase = Phase.MINUTES;
            } else if (this.phase == Phase.MINUTES) {
                this.phase = Phase.SECONDS;
            } else {
                this.phase = Phase.HOURS;
            }
        }
    }

    @HostBinding('class.disabled')
    public get isDisabled(): boolean {
        return this.timeFormControl.disabled;
    }


    @HostListener('blur')
    public onBlur(): void {
        this.onTouched?.();
    }

    public writeValue(): void {
        // Nothing to do here
    }

    private onTouched: (() => void) | null                      = null;
    private onChange: ((value: DateTime | null) => void) | null = null;

    public registerOnChange(fn: (value: DateTime | null) => void): void {
        this.onChange = fn;
    }


    public registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    public setDisabledState?(isDisabled: boolean): void {
        if (isDisabled) {
            this.timeFormControl.disable();
        } else {
            this.timeFormControl.enable();
        }
    }

    protected HOURS          = HOUR_DIGITS;
    protected MINUTES        = MINUTE_DIGITS;
    protected readonly Math  = Math;
    protected readonly Phase = Phase;
}

enum Phase {
    HOURS, MINUTES, SECONDS
}
