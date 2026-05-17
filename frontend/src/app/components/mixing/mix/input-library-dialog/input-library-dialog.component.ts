/**
 *  This module contains the {@link InputLibraryDialogComponent|`InputLibraryDialogComponent`} and related classes.
 *
 *  @module
 */
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

// noinspection ES6UnusedImports
import type {Mix} from '@common/mixing/mix/mix';

/**
 * A dialog for choosing an {@link ExportedDatum|`ExportedDatum`} as an {@link Mix#imports|`import`}
 * for a {@link Mix|`Mix`} being edited.
 *
 * The dialog shows all the {@link ExportedDatum|`ExportedDatum`} that are available for the specific
 * {@link Mix|`Mix`}, grouped by {@link ExportedDatum#origin|`origin`}, and provides a way to
 * search and filter them.
 *
 * @component
 * @componentSelector `<house-mix-input-library-dialog>`
 */
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
                   MatFormFieldModule,
                   MatInputModule,
                   FormsModule,
                   MatButtonModule,
                   MatIconModule,
                   InputReturnBehaviorDirective,
                   InputReturnBehaviorExcludeDirective,
                   ScrollOnSelectedDirective
               ],
               templateUrl: './input-library-dialog.component.html',
               styleUrl:    './input-library-dialog.component.scss'
           })
export class InputLibraryDialogComponent extends MatDialogComponent<ExportedDatum[], ExportedDatum> {

    /** The {@link ExportedDatum|`ExportedDatum`} chosen as a new {@link Mix#imports|`import`}. */
    protected selectedInput: ExportedDatum | null = null;

    /** The {@link FormControl|`FormControl`} handling the search bar input. */
    protected searchFormControl: FormControl<string | null> = new FormControl<string | null>(null);

    /** The available inputs filtered according to the search text. */
    protected searchResults: ExportedDatum[] | null = null;

    /**
     * The {@link HTMLDivElement|`HTMLDivElement`} containing the search results.
     *
     * @viewChild `#searchResultsDiv`
     */
    @ViewChild('searchResultsDiv')
    private searchResultsDiv?: ElementRef<HTMLDivElement>;

    /**
     * Creates an instance of the component. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {ExportedDatum[]} availableInputs - All the {@link ExportedDatum|`ExportedDatum`} among which to choose the new import.
     * @param {MatDialogRef<InputLibraryDialogComponent, ExportedDatum>} dialogRef - The dialog reference.
     */
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

    /**
     * Filters all the available {@link ExportedDatum|`ExportedDatum`s} returning
     * the ones that have a specific {@link ExportedDatum#origin|`origin`}, and that
     * are also among the search results.
     *
     * @param {DatumOrigin} origin - The origin to filter with.
     * @returns {ExportedDatum[]} - The filtered {@link ExportedDatum|`ExportedDatum`s}.
     */
    protected getInputsFromOrigin(origin: DatumOrigin): ExportedDatum[] {
        return this
            .data
            .filter(datum => datum.origin == origin && (this.searchResults == null || this.searchResults.includes(datum)));
    }

    /**
     * Handler for the keydown event on the search bar.
     *
     * @param {KeyboardEvent} event - The DOM event.
     */
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

    /**
     * Handler for the keydown event on a search result.
     *
     * @param {KeyboardEvent} event - The DOM event.
     */
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

    /**
     * If an {@link ExportedDatum|`ExportedDatum`} is selected, closes the dialog with it as a return value.
     */
    protected confirm(): void {
        if (this.selectedInput != null) {
            this.closeDialog(this.selectedInput);
        }
    }

    /**
     * Casts an unknown value to {@link ExportedDatum|`ExportedDatum`}. If the value is not an {@link ExportedDatum|`ExportedDatum`}, returns `null`.
     *
     * @param {unknown} letValue - The value to cast.
     * @returns {ExportedDatum | null} - The result of the casting.
     */
    protected readonly asExportedDatum = (letValue: unknown): ExportedDatum | null => (letValue instanceof ExportedDatum ? letValue : null);

    /** @ignore */
    protected readonly Datum       = Datum;
    /** @ignore */
    protected readonly DatumOrigin = DatumOrigin;
    /** @ignore */
    protected readonly Object      = Object;
    /** @ignore */
    protected readonly DATUM_TYPE_DISPLAY     = DATUM_TYPE_DISPLAY;
    /** @ignore */
    protected readonly getColorVarNameForType = getColorVarNameForType;
    /** @ignore */
    protected readonly SYSTEM_ORIGIN_DISPLAY  = SYSTEM_ORIGIN_DISPLAY;
    /** @ignore */
    protected readonly TOOLTIP_TIMEOUT               = TOOLTIP_TIMEOUT;
    /** @ignore */
    protected readonly DATUM_ORIGIN_DISPLAY          = DATUM_ORIGIN_DISPLAY;
    /** @ignore */
    protected readonly getExternalDatumOriginDisplay = getExternalDatumOriginNameDisplay;
    /** @ignore */
    protected readonly input = input;

}
