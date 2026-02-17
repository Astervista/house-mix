import {FileService} from "./file.service";
import {Serializable} from "../constants";

export class PersistentDataService<D extends Serializable<J>, J> {
    
    protected _data: Promise<D>;
    
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
    
    protected get data(): Promise<D> {
        return this._data;
    }
    
    protected doAfterLoad(toDo: (data: D) => Promise<void> | void): void {
        this._data = this._data.then(async data => {
            await toDo(data);
            return data;
        });
    }
    
    protected saveData(): void {
        void this._data.then((dataObject) => {
            return this.fileService.saveDataFile(this.saveFile, dataObject.toJSON());
        })
    }
}
