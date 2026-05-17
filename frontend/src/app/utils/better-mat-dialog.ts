/**
 * This module contains the {@link BetterMatDialog|`BetterMatDialog`} class and helper classes for an enhanced {@link MatDialog|`MatDialog`}.
 *
 * @module
 */
import {Injectable} from '@angular/core';
import {MatDialog, MatDialogConfig, MatDialogRef} from '@angular/material/dialog';
import {ComponentType} from '@angular/cdk/portal';

/**
 * This is an injectable class to create and display {@link MatDialog|`MatDialog`s}, but with enhanced function to keep typing
 * consistent in passed and result data.
 *
 * Usually, {@link MatDialog|`MatDialog`} does not provide a way to enforce that the data type declared for data passed to
 * {@link MatDialogConfig#data|`data`} when opening a dialog is the same as the one defined in the component's constructor
 * through `@Inject(MAT_DIALOG_DATA)`. This can lead to the typing check failing when the data is defined differently, and
 * allowing access to properties that should not be allowed. The same happens in reverse when closing a dialog and the call
 * to {@link MatDialogRef#close| `close()`} accepts a response type that is not related to the type defined for the return
 * object in {@link MatDialogRef#afterClosed| `afterClosed()`}.
 *
 * This class and the helper class {@link MatDialogComponent|`MatDialogComponent`} allow removing this ambiguity by typing
 * the dialog component with the same types as the {@link MatDialog#open| `open()`} that calls it and only accepting in the
 * call a component which has the same template types. This way only components that retrieve and return the correct types
 * are allowed to be used in such a call, assuring both sides that the type contract is shared.
 *
 * To use this version of {@link MatDialog|`MatDialog`}, the dialog component to be used should be declared extending the
 * class {@link MatDialogComponent|`MatDialogComponent`} declaring the template types `<DATA>` and `<RETURN>` and used in
 * the {@link BetterMatDialog#open| `open()`} function, that will enforce the correct `<DATA>` and `<RETURN>` types on both
 * {@link MatDialogConfig#data|`data`} and the return data type.
 *
 * @example The problem
 *
 * This example explains the problem solved by this class:
 *
 * ```typescript
 * @Component( [...] )
 * class MyDialog() {
 *
 *     constructor(
 *                  @Inject(MAT_DIALOG_DATA)
 *                  data: { foo: string },                           // [#1]
 *                  ref:  MatDialogRef<MyDialog, { bar: number }>    // [#2]
 *                ) {
 *        doSomethingWithFoo(data.foo.lowerCase());                  // [#3]
 *    }
 *
 *    exitDialog() {
 *        this.ref.close({ bar: 53 });                               // [#4]
 *    }
 *
 * }
 *
 * @Component( [...] )
 * class OpeningDialogComponent() {
 *
 *
 *     constructor(
 *                  ref:  MatDialog
 *                ) {  }
 *
 *     openDialog() {
 *         this.ref
 *             .open(MyDialog, data: { baz: 5 } )                    // [#5]
 *             .afterClosed()
 *             .subscribe(
 *                        (
 *                          result: number[]                         // [#6]
 *                        ) => {
 *                            doSomethingElse(result.length)         // [#7]
 *                        }
 *                      )
 *     }
 * }
 * ```
 *
 * In these examples, that compile fine in TypeScript, there is a hidden runtime error when executing lines #3 and #7:
 * line #3 assumes that `foo` is a `string` – because it's defined as such in line #1 – and can therefore call `foo.toLowerCase()`
 * on it. Line #5, though, called the dialog with the data `{ baz: 5 }` at line #5, which doesn't define `foo`. The constructor
 * of the dialog therefore receives an object with `foo` as `undefined`, but calls `toLowerCase()` on it, failing.
 *
 * Analogously, line #7 assumes a result declared as an {@link Array|`Array`} of `number` in line #6, but the result that's
 * actually passed in #4, compliant with the definition of {@link MatDialogRef|`MatDialogRef`}, is an object, and as such
 * doesn't have the `length` property accessed in #7, and the function `doSomethingElse` receives an unexpected `undefined` value.
 *
 * @example The fix
 *
 * The code in the previous example can be fixed with this enhanced class, in the following way:
 *
 * ```typescript
 * @Component( [...] )
 * class MyDialog() extends MatDialogComponent<                      // [#8]
 *                            {foo: string},
 *                            {bar: number}
 * > {
 *
 *     constructor(
 *                  @Inject(MAT_DIALOG_DATA)
 *                  data: { foo: string },                           // [#1]
 *                  ref:  MatDialogRef<                              // [#2]
 *                          MyDialog<{foo: string}, {bar: number}>,
 *                          { bar: number }
 *                        >
 *                ) {
 *        super(data, ref);                                          // [#9]
 *        doSomethingWithFoo(data.foo.lowerCase());                  // [#3]
 *    }
 *
 *    exitDialog() {
 *        this.ref.close({ bar: 53 });                               // [#4]
 *    }
 *
 * }
 *
 * @Component( [...] )
 * class OpeningDialogComponent() {
 *
 *
 *     constructor(
 *                  ref:  BetterMatDialog
 *                ) { }
 *
 *     openDialog() {
 *         this.ref
 *             .open(MyDialog, data: { foo: "qux" } )                // [#5]
 *             .afterClosed()
 *             .subscribe(
 *                        (
 *                          result: {bar: number}                    // [#6]
 *                        ) => {
 *                            doSomethingElse(result.bar)            // [#7]
 *                        }
 *                      )
 *     }
 * }
 * ```
 *
 * Just by extending the {@link MatDialogComponent|`MatDialogComponent`} class at line #8, calling the
 * `super()` constructor in line #9 with the data and dialog reference objects, updating types accordingly
 * in #1, #2, #6 (to avoid typescript compilation errors) and correcting the passed objects in #5 and #4,
 * lines #3 and #7 will never throw errors because the types are kept consistent by the implementation of `MyDialog`.
 *
 */
@Injectable({
                providedIn: 'root'
            })
export class BetterMatDialog {

    /**
     * Create an instance of the class.
     *
     * @param {MatDialog} matDialog - The {@link MatDialog|`MatDialog`} instance to enhance.
     */
    constructor(
        private matDialog: MatDialog
    ) {}

    /**
     * Open a dialog exactly as {@link MatDialog#open| `open()`} does, but only accept a {@link MatDialogComponent|`MatDialogComponent`}
     * to assure that the types are kept consistent.
     *
     * @param {ComponentType<MatDialogComponent<DATA, RETURN>>} component - Type of the component to load into the dialog.
     * @param {MatDialogConfig<DATA>} config - Extra configuration options.
     * @returns {MatDialogRef<MatDialogComponent<DATA, RETURN>, RETURN>} Reference to the newly opened dialog.
     * @template DATA - The type of {@link MatDialogConfig#data|`config.data`}.
     * @template RETURN - The type of data returned by the dialog.
     */
    public open<DATA, RETURN>(component: ComponentType<MatDialogComponent<DATA, RETURN>>, config: MatDialogConfig<DATA>): MatDialogRef<MatDialogComponent<DATA, RETURN>, RETURN> {
        return this.matDialog.open<MatDialogComponent<DATA, RETURN>, DATA, RETURN>(component, config);
    }
}

/**
 * A component that must be defined with two template types {@link DATA|`DATA`} and {@link RETURN|`RETURN`}
 * as the content of a dialog in conjunction with {@link BetterMatDialog|`BetterMatDialog`} to avoid typing
 * errors not caught by the usual {@link MatDialog|`MatDialog`} use case.
 *
 * @see {@link BetterMatDialog|`BetterMatDialog`} for information on the problem that's solved and how to use both classes to solve it.
 * @template DATA - The type of the data being sent to the dialog when opening it.
 * @template RETURN - The type of the data returned by the dialog when closing it.
 */
export class MatDialogComponent<DATA, RETURN> {

    /**
     * Creates an instance of the class. Call from inside the constructor of an extending component with the
     * objects injected in it by Angular.
     *
     * @param {DATA} data - The dialog data (injected with `@Inject(MAT_DIALOG_DATA)`).
     * @param {MatDialogRef<MatDialogComponent<DATA, RETURN>, RETURN>} dialogRef - The dialog reference.
     */
    constructor(
        protected data: DATA,
        private dialogRef: MatDialogRef<MatDialogComponent<DATA, RETURN>, RETURN>
    ) {

    }

    /**
     * Close the dialog with the correct type of result.
     *
     * @param {RETURN | null} result - The returning value.
     */
    protected closeDialog(result?: RETURN | null): void {
        this.dialogRef.close(result ?? undefined);
    }

}
