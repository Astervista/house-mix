/**
 * This module contains the {@link PersistentDataService|`PersistentDataService`} class, a generic class that can be extended to
 * create a service with data persistence capabilities.
 *
 * @module
 */
import {FileService} from "./file.service";
import {Serializable} from "../constants";

// noinspection ES6UnusedImports
import ErrnoException = NodeJS.ErrnoException;

/**
 * This class can be used to help create NestJS services that have data persistence capabilities, without
 * reimplementing the data save logic with the {@link FileService|`FileService`}. This class can be
 * extended by a NestJS service class and handles the save features. The service just needs to pass
 * the {@link FileService|`FileService`}, the path of the save file, and the constructor of its own
 * data class.
 *
 * @template D - The class representing the content of the data saved to file that the service is handling.
 * @template J - The serialization of the class `D`. Can be the same as `D`, if no serialization is required.
 * @example A service with data persistence capabilities can be set up this way:
 * ```typescript
 *  class MyService extends PersistentDataService<MyServiceData, MyServiceDataJSON> {
 *
 *      constructor(fileService: FileService) {
 *          // Call the PersistentDataService constructor.
 *          // This handles all the reading the initial value.
 *          super(fileService, "path/to/the/save.file", MyServiceData);
 *
 *          // Operations can be performed to the data after
 *          // it's ready, but before anything relying on
 *          // this.data (see next function) gets executed.
 *          this.doAfterLoad((data: MyServiceData) => {
 *              doSomethingImportantToData(data);
 *          });
 *      }
 *
 *      functionThatNeedsData(): void {
 *          // this.data contains the data retrieved from the
 *          // filesystem when the constructor was called.
 *          // It's a promise that resolves at the end of the reading.
 *          this.data
 *              .then((data: MyServiceData) => {
 *                  // The data is ready
 *                  doSomethingWithData(data);
 *              });
 *              .catch((error: ErrnoException) => {
 *                  // There was an error retrieving the datea
 *                  handleError(error);
 *              });
 *      }
 *
 *      async asyncFunctionThatNeedsData(): Promise<void> {
 *          // this.data can also be awaited...
 *          const data = await this.data;
 *
 *          // ...and used
 *          doSomethingWithData(data);
 *      }
 *
 *      async functionThatChangesData(): Promise<void> {
 *          // To perform changes, those changes must be done on the
 *          // data object provided by this.data.
 *          const data = await this.data;
 *
 *          // The data can be edited
 *          doSomethingToData(data);
 *
 *          // this.saveData() persists the content of the this.data
 *          // object to the filesystem.
 *          this.saveData();
 *      }
 */
export class PersistentDataService<D extends Serializable<J>, J> {
    
    /**
     * The internal data promise that will be resolved once
     * the service has loaded the data from the filesystem.
     */
    private _data: Promise<D>;
    
    /**
     * Construct an instance of the class.
     *
     * @param {FileService} fileService - The service handling persistent storage. Pass the instance created by dependency injection.
     * @param {string} saveFile - The path of the file where to save the data, passed to {@link FileService#saveDataFile|`saveDataFile`}
     *                            and {@link FileService#readDataFile|`readDataFile`}.
     * @param {{new(data?: J): D}} D - The constructor of the D class.
     */
    constructor(
        private fileService: FileService,
        private saveFile: string,
        private D: new (data?: J) => D
    ) {
        this._data = fileService
            .readDataFile<J>(saveFile)
            .then((data: J | null) => {
                if (data != null) {
                    return new D(data);
                } else {
                    return  new D();
                }
            });
    }
    
    /**
     * A promise that will be resolved or rejected once all the preliminary
     * operations have been done and the data is ready.
     *
     * @throws {ErrnoException} - When a filesystem operation files, the
     *                            {@link ErrnoException|`ErrnoException`} thrown
     *                            gets used to reject the promise.
     */
    protected get data(): Promise<D> {
        return this._data;
    }
    
    /**
     * Schedule an operation to be done after the data will be available,
     * but before <a href="#data">`data`</a> gets fulfilled,
     * so that critical operations can be done to the data before any
     * consumer can access it.
     *
     * @param {(data: D) => (Promise<void> | void)} toRun - The function that
     *          will be executed after the data is available.
     */
    protected doAfterLoad(toRun: (data: D) => Promise<void> | void): void {
        this._data = this._data.then(async data => {
            await toRun(data);
            return data;
        });
    }
    
    /**
     * Save any change done to the data provided by
     * <a href="#data">`data`</a> to disk.
     */
    protected saveData(): void {
        void this._data.then((dataObject) => {
            return this.fileService.saveDataFile(this.saveFile, dataObject.toJSON());
        })
    }
}
