import {Component, ElementRef, Inject, input, ViewChild} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {MatButton, MatButtonModule, MatIconButton} from '@angular/material/button';
import {Datum, DatumOrigin, ExportedDatum} from '@common/mixing/mix/datum';
import {MatDialogComponent} from '../../../../utils/better-mat-dialog';
import {MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle} from '@angular/material/expansion';
import {DATUM_ORIGIN_DISPLAY, DATUM_TYPE_DISPLAY, getColorVarNameForType, getExternalDatumOriginNameDisplay} from '../../constants';
import {SYSTEM_ORIGIN_DISPLAY} from '../../../system/constants';
import {MatTooltip} from '@angular/material/tooltip';
import {TOOLTIP_TIMEOUT} from '../../../../utils/constants';
import {MatFormField, MatInput, MatInputModule} from '@angular/material/input';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {NgTemplateOutlet} from '@angular/common';
import {MatIcon, MatIconModule} from '@angular/material/icon';
import {MatFormFieldModule} from '@angular/material/form-field';
import {InputReturnBehaviorDirective, InputReturnBehaviorExcludeDirective} from '../../../../directives/input-return-behavior/input-return-behavior.directive';
import {ScrollOnSelectedDirective} from '../../../../directives/scroll-on-selected/scroll-on-selected.directive';

@Component({
               selector:    'house-mix-input-library-dialog',
               imports: [
                   MatDialogContent,
                   MatDialogActions,
                   MatDialogTitle,
                   MatButton,
                   MatExpansionPanel,
                   MatAccordion,
                   MatExpansionPanelHeader,
                   MatExpansionPanelTitle,
                   MatTooltip,
                   MatFormField,
                   MatInput,
                   ReactiveFormsModule,
                   NgTemplateOutlet,
                   MatIcon,
                   MatIconButton,
                   MatFormFieldModule, MatInputModule, FormsModule, MatButtonModule, MatIconModule, InputReturnBehaviorDirective, InputReturnBehaviorExcludeDirective,
                   ScrollOnSelectedDirective
               ],
               templateUrl: './input-library-dialog.component.html',
               styleUrl:    './input-library-dialog.component.scss'
           })
export class InputLibraryDialogComponent extends MatDialogComponent<ExportedDatum[], ExportedDatum> {

    protected selectedInput: ExportedDatum | null = null;

    protected searchFormControl: FormControl<string | null> = new FormControl<string | null>(null);

    protected searchResults: ExportedDatum[] | null = null;

    @ViewChild('searchResultsDiv')
    private searchResultsDiv?: ElementRef<HTMLDivElement>;

    constructor(
        @Inject(MAT_DIALOG_DATA) availableInputs: ExportedDatum[],
        dialogRef: MatDialogRef<InputLibraryDialogComponent, ExportedDatum>
    ) {
        super(availableInputs, dialogRef);
        this.searchFormControl.valueChanges.subscribe(value => {
            if (value == null || value.trim().length == 0) {
                this.searchResults = null;
            } else {
                const pieces       = value.toLowerCase().split(/\s+/).map(piece => piece.trim()).filter(piece => piece.length > 0);
                this.searchResults = this
                    .data
                    .map((datum): [number, ExportedDatum] => {
                        const candidates = [
                            datum.displayName?.toLowerCase() ?? '',
                            datum.name.toLowerCase(),
                            datum.originDisplayName?.toLowerCase() ?? '',
                            datum.originName.toLowerCase(),
                            DATUM_ORIGIN_DISPLAY[datum.origin].toLowerCase()
                        ];
                        return [candidates.findIndex(candidate => pieces.every(piece => candidate.includes(piece))), datum];
                    })
                    .filter(([matchIndex]) => matchIndex != -1)
                    .sort(([aIndex, aDatum], [bIndex, bDatum]) => {
                        if (aIndex != bIndex) {
                            return aIndex - bIndex;
                        } else {
                            return aDatum.name.toLowerCase().localeCompare(bDatum.name.toLowerCase());
                        }
                    })
                    .map(([_, datum]) => datum);
            }
        });
    }

    protected getInputsFromOrigin(origin: DatumOrigin): ExportedDatum[] {
        return this
            .data
            .filter(datum => datum.origin == origin && (this.searchResults == null || this.searchResults.includes(datum)));
    }

    protected searchKeyDown(event: KeyboardEvent): void {
        if (event.key == 'Enter' && this.searchResultsDiv) {
            event.preventDefault();
            this.searchResultsDiv.nativeElement.focus();
            if (this.selectedInput == null || this.searchResults?.includes(this.selectedInput) == false) {
                this.selectedInput = null;
            }
            this.selectedInput ??= this.searchResults?.[0] ?? null;
        }
    }

    protected searchResultsKeyDown(event: KeyboardEvent): void {
        if (event.code == 'ArrowRight') {
            event.preventDefault();
            if (this.selectedInput == null || this.searchResults == null || this.searchResults.length == 0) {
                this.selectedInput ??= this.searchResults?.[0] ?? null;
            } else {
                const index        = (this.searchResults.indexOf(this.selectedInput) + 1) % this.searchResults.length;
                this.selectedInput = this.searchResults[index] ?? null;
            }
        } else if (event.code == 'ArrowLeft') {
            event.preventDefault();
            if (this.selectedInput == null || this.searchResults == null || this.searchResults.length == 0) {
                this.selectedInput ??= this.searchResults?.[0] ?? null;
            } else {
                const index        = (this.searchResults.indexOf(this.selectedInput) + this.searchResults.length - 1) % this.searchResults.length;
                this.selectedInput = this.searchResults[index] ?? null;
            }
        } else if (event.code == 'Enter') {
            event.preventDefault();
            this.confirm();
        }
    }

    protected confirm(): void {
        if (this.selectedInput != null) {
            this.closeDialog(this.selectedInput);
        }
    }

    protected readonly asExportedDatum = (letValue: unknown): ExportedDatum | null => (letValue instanceof ExportedDatum ? letValue : null);

    protected readonly Datum       = Datum;
    protected readonly DatumOrigin = DatumOrigin;
    protected readonly Object      = Object;

    protected readonly DATUM_TYPE_DISPLAY     = DATUM_TYPE_DISPLAY;
    protected readonly getColorVarNameForType = getColorVarNameForType;
    protected readonly SYSTEM_ORIGIN_DISPLAY  = SYSTEM_ORIGIN_DISPLAY;

    protected readonly TOOLTIP_TIMEOUT               = TOOLTIP_TIMEOUT;
    protected readonly DATUM_ORIGIN_DISPLAY          = DATUM_ORIGIN_DISPLAY;
    protected readonly getExternalDatumOriginDisplay = getExternalDatumOriginNameDisplay;
    protected readonly input = input;
}
