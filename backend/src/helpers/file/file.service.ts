import {Injectable, Logger} from "@nestjs/common";
import * as nodePath from "node:path";
import * as nodeFs from "node:fs";

@Injectable()
export class FileService {
    
    private readonly logger = new Logger(FileService.name);
    
    private readonly baseDir: string;
    
    private readonly readyPromise: Promise<void>;
    
    private readonly isProd = process.env["NODE_ENV"] === "production";
    
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
