import {Component, EventEmitter, HostBinding, Input, Output} from "@angular/core";
import {MatProgressSpinner} from "@angular/material/progress-spinner";
import {MatButton} from "@angular/material/button";
import {MatIcon} from "@angular/material/icon";
import {MatIconSizeDirective} from "../../../directives/mat-icon-size/mat-icon-size.directive.js";
import { LoadingStatus } from '../../../utils/enums';

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

    @HostBinding("class.visible")
    @Input() public visible: boolean = false;
    @Input() public error: boolean   = false;
    @Input() public small: boolean         = false;
    @Input() public errorText: string      = "Unfortunately, an error has occurred";
    @Input() public errorTextClick: string = "An error occurred. Click to retry";
    @Input() public backdrop: boolean      = true;
    @Input() public errorClickable: boolean = true;

    @HostBinding("class.align-left")
    @Input() public alignLeft: boolean = false;

    @Input() public set loadingStatus(value: LoadingStatus) {
        this.error   = (value === LoadingStatus.ERROR);
        this.visible = (value !== LoadingStatus.LOADED);
        if (value === LoadingStatus.LOADING) {
            this.loadingSet.emit();
        }
    }

    @Output() public reload: EventEmitter<void> = new EventEmitter<void>();
    @Output() public loadingSet: EventEmitter<void> = new EventEmitter<void>();

    protected onClick(event: MouseEvent): void {
        if (this.error) {
            this.reload.emit();
        }
        event.stopPropagation();
    }
}
