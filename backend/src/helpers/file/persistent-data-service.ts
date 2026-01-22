import {FileService} from "./file.service";
import {Serializable} from "../constants";

export class PersistentDataService<D extends Serializable<J>, J> {
    
    protected readonly data: Promise<D>;
    
    constructor(
        private fileService: FileService,
        private saveFile: string,
        private D: new (data?: J) => D
    ) {
        this.data = fileService
            .readDataFile<J>(saveFile)
            .then((data: J | null) => {
                if (data != null) {
                    return new D(data);
                } else {
                    return  new D();
                }
            });
    }
    
    protected saveData(): void {
        void this.data.then((dataObject) => {
            return this.fileService.saveDataFile(this.saveFile, dataObject.toJSON());
        })
    }
}
