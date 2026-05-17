/**
 * This module contains the {@link FileService|`FileService`} class that provides services with a common framework for persisting data.
 *
 * @module
 */
import { Injectable, Logger } from '@nestjs/common';
import * as nodePath from 'node:path';
import * as nodeFs from 'node:fs';
// noinspection ES6UnusedImports
import ErrnoException = NodeJS.ErrnoException;

/**
 * This service gives other services facilities for storing data persistently,
 * and handles promises and filesystem handling internally.
 *
 * It offers two functions, to retrieve and store the data: {@link FileService#readDataFile| `readDataFile()`}
 * and {@link FileService#saveDataFile| `saveDataFile()`}.
 *
 * Files will be saved in the base save directory passed at launch as the
 * environment variable `APP_BASE_DIR`, inside the `/data/` directory,
 * appending the `path` passed to the function.
 */
@Injectable()
export class FileService {
    
    /**
     * The logger for this service.
     */
    private readonly logger = new Logger(FileService.name);
    
    /**
     * The base directory passed to the application at startup that will contain
     * all the data for this application.
     */
    private readonly baseDir: string;
    
    /**
     * A promise that gets fulfilled after the system has set up the base directory
     * and done preparatory filesystem operations. This promise is also the one
     * that gets rejected when the startup fails.
     */
    private readonly readyPromise: Promise<void>;
    
    /**
     * Whether the application is running in production mode.
     */
    private readonly isProd = process.env["NODE_ENV"] === "production";
    
    /**
     * Creates an instance of the class. Do not call this constructor directly, it's handled by dependency injection.
     */
    constructor() {
        const baseDir = process.env["APP_BASE_DIR"] ?? process.cwd();
        if (baseDir.startsWith("/")) {
            this.baseDir = baseDir;
        } else {
            this.baseDir = nodePath.join(process.cwd(), baseDir);
        }
        this.readyPromise = new Promise<void>((resolve, reject) => {
            // We first check for the existence of the base dir and try to create it if not available
            nodeFs.access(this.baseDir, (accessError) => {
                if (accessError) {
                    this.logger.warn(`Base directory ${this.baseDir} is not accessible, trying to create it`);
                    nodeFs.mkdir(this.baseDir, {recursive: true}, mkDirErr => {
                        if (mkDirErr) {
                            this.logger.error(`Base directory ${this.baseDir} is not accessible, and cannot be created`);
                            reject(mkDirErr);
                        } else {
                            this.logger.log(`Base directory ${this.baseDir} created`);
                            resolve();
                        }
                    });
                } else {
                    this.logger.log(`Base directory ${this.baseDir} accessed`);
                    resolve();
                }
            });
        }).then(() => {
            // We then check for the existence of the data dir and try to create it if not available
            const dataDir = nodePath.join(this.baseDir, "data");
            
            nodeFs.access(dataDir, (accessError) => {
                if (accessError) {
                    this.logger.warn(`Data directory ${dataDir} is not accessible, trying to create it`);
                    nodeFs.mkdir(dataDir, {recursive: true}, mkDirErr => {
                        if (mkDirErr) {
                            this.logger.error(`Data directory ${dataDir} is not accessible, and cannot be created`);
                            throw mkDirErr;
                        } else {
                            this.logger.log(`Data directory ${dataDir} created`);
                        }
                    });
                } else {
                    this.logger.log(`Data directory ${dataDir} accessed`);
                }
            });
        });
    }
    
    /**
     * Reads a data file from the persistent storage and parses its content as JSON.
     * The data will be read from `${APP_BASE_DIR}/data/{path}`.
     *
     * @param {string} path - The path relative to the data directory to locate the
     *                        file to read from.
     * @returns {Promise<T | null>} - The data stored in the file. `null` if the file
     *                                wasn't found.
     * @throws {ErrnoException} - When a filesystem operation files, the
     *                            {@link ErrnoException|`ErrnoException`} thrown
     *                            gets used to reject the promise.
     * @template T - The format of the content of the file. It's only for resolving
     *               the type, the function doesn't typecheck and doesn't assure
     *               the result is of the correct requested type. It will be correct
     *               if the file is always saved through {@link FileService#saveDataFile| `saveDataFile()`},
     *               since that function is alse typechecked.
     */
    public async readDataFile<T>(path: string): Promise<T | null> {
        await this.readyPromise;
        const finalPath = nodePath.join(this.baseDir, "data", path);
        return new Promise<void>(
            (resolve, reject) => {
                const containingFolder = finalPath.split("/").slice(0, -1).join("/");
                // Check the existence of the subfolder structure
                
                nodeFs.access(containingFolder, (accessError) => {
                    if (accessError != null) {
                        nodeFs.mkdir(containingFolder, {recursive: true}, mkDirErr => {
                            if (mkDirErr) {
                                reject(mkDirErr);
                            } else {
                                resolve();
                            }
                        });
                    } else {
                        resolve();
                    }
                });
            })
            .then(() => {
                return new Promise<null | T>((resolve, reject) => {
                    // Check the existence of the file
                    nodeFs.access(finalPath, (accessError) => {
                        if (accessError != null) {
                            resolve(null);
                        } else {
                            nodeFs.readFile(finalPath, {encoding: "utf-8"}, (readError, data) => {
                                if (readError != null) {
                                    reject(readError);
                                } else {
                                    resolve(JSON.parse(data) as T);
                                }
                            });
                        }
                    });
                });
            });
    }
    
    /**
     * Saves data to a file in the persistent storage as a JSON string.
     * The data will be saved to `${APP_BASE_DIR}/data/{path}`.
     *
     * @param {string} path - The path relative to the data directory where the
     *                        file should be saved.
     * @param {T} data - The data to be stored in the file.
     * @throws {ErrnoException} - When a filesystem operation files, the
     *                            {@link ErrnoException|`ErrnoException`} thrown
     *                            gets used to reject the promise.
     * @template T - The type of the data being saved.
     */
    public async saveDataFile<T>(path: string, data: T): Promise<void> {
        await this.readyPromise;
        return new Promise((resolve, reject) => {
            const finalPath = nodePath.join(this.baseDir, "data", path);
            nodeFs.writeFile(finalPath, JSON.stringify(data, null, this.isProd ? undefined : 2), {encoding: "utf8"}, (writeFileErr) => {
                if (writeFileErr != null) {
                    reject(writeFileErr);
                } else {
                    resolve();
                }
            });
        });
    }
    
    
}
