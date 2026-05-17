/**
 *  This module contains the {@link LoadingScrimComponent|`LoadingScrimComponent`} and related classes.
 *
 *  @module
 */
import {Component, EventEmitter, HostBinding, Input, Output} from "@angular/core";
import {MatProgressSpinner} from "@angular/material/progress-spinner";
import {MatButton} from "@angular/material/button";
import {MatIcon} from "@angular/material/icon";
import {MatIconSizeDirective} from "../../../directives/mat-icon-size/mat-icon-size.directive.js";
import { LoadingStatus } from '../../../utils/enums';

/**
 * This component covers the nearest relatively positioned ancestor element with a loading spinner and some informative text.
 * It also offers the possibility to set the component in an error state that displays an error and an optional button
 * to trigger reloading, wiht an output to be notified of it.
 *
 * @component
 * @componentSelector `<house-mix-loading-scrim>`
 */
@Component({
               selector:    "house-mix-loading-scrim",
               imports: [
                   MatProgressSpinner,
                   MatButton,
                   MatIcon,
                   MatIconSizeDirective
               ],
               templateUrl: "./loading-scrim.component.html",
               styleUrl:    "./loading-scrim.component.scss"
           })
export class LoadingScrimComponent {

    /**
     * Whether the component should be shown and cover the children of its nearest relatively positioned ancestor.
     * Use either this or {@link LoadingScrimComponent#loadingStatus|`loadingStatus`}.
     *
     * @input
     * @hostBinding class.visible
     */
    @HostBinding("class.visible")
    @Input() public visible: boolean = false;
    /**
     * Whether to show an error. `true` shows the error, `false` is the default and shows the spinner.
     *
     * @input
     */
    @Input() public error: boolean   = false;
    /**
     * Whether the component should be shown in a smaller size. Useful when covering a single component.
     *
     * @input
     */
    @Input() public small: boolean         = false;
    /**
     * The error to be shown when {@link LoadingScrimComponent#error|`error`} is `true`.
     *
     * @input
     */
    @Input() public errorText: string      = "Unfortunately, an error has occurred";
    /**
     * The text to be shown inside a button when {@link LoadingScrimComponent#error|`error`} is `true` and
     * {@link LoadingScrimComponent#errorClickable|`errorClickable`} is `true`.
     *
     * @input
     */
    @Input() public errorTextClick: string = "An error occurred. Click to retry";
    /**
     * If `true`, the text of the component will have a solid box underneath for clarity against the underlying elements.
     *
     * @input
     */
    @Input() public backdrop: boolean      = true;
    /**
     * Whether to show a button instead of the error message.
     *
     * @input
     */
    @Input() public errorClickable: boolean = true;

    /**
     * Whether to left-align the content of the component. `false` means the default behavior of center alignment.
     *
     * @input
     * @hostBinding class.align-left
     */
    @HostBinding("class.align-left")
    @Input() public alignLeft: boolean = false;

    /**
     * Fast setting for the status of the component.
     *
     * {@link LoadingStatus.LOADING|`LOADING`} is equivalent to setting {@link LoadingScrimComponent#error|`error`}
     * to `false` and  {@link LoadingScrimComponent#visible|`visible`} to `true`. It also triggers the
     * {@link LoadingScrimComponent#loadingSet|`loadingSet`} output.
     *
     * {@link LoadingStatus.ERROR|`ERROR`} is equivalent to setting {@link LoadingScrimComponent#error|`error`}
     * to `true` and  {@link LoadingScrimComponent#visible|`visible`} to `true`.
     *
     * {@link LoadingStatus.LOADED|`LOADED`} is equivalent to setting both {@link LoadingScrimComponent#error|`error`}
     * and  {@link LoadingScrimComponent#visible|`visible`}.
     *
     * @input
     */
    @Input() public set loadingStatus(value: LoadingStatus) {
        this.error   = (value === LoadingStatus.ERROR);
        this.visible = (value !== LoadingStatus.LOADED);
        if (value === LoadingStatus.LOADING) {
            this.loadingSet.emit();
        }
    }

    /**
     * Event triggered when the reload button is clicked.
     *
     * @output
     */
    @Output() public reload: EventEmitter<void> = new EventEmitter<void>();
    /**
     * Event triggered when the {@link LoadingScrimComponent#loadingStatus|`loadingStatus`} gets set
     *  with {@link LoadingStatus.LOADING|`LOADING`}.
     *
     * @output
     */
    @Output() public loadingSet: EventEmitter<void> = new EventEmitter<void>();

    /**
     * Listener for the button click.
     *
     * @param {MouseEvent} event - The DOM event.
     */
    protected onClick(event: MouseEvent): void {
        if (this.error) {
            this.reload.emit();
        }
        event.stopPropagation();
    }
}
