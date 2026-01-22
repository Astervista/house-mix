import {Injectable} from "@nestjs/common";
import {Mix, MixJSON} from "@common/mixing/mix/mix";
import {FileService} from "../../helpers/file/file.service";
import {PersistentDataService} from "../../helpers/file/persistent-data-service";

const SAVE_FILE = "mixing/mix.json";

@Injectable()
export class MixService extends PersistentDataService<MixData, MixDataJSON>{
    
    constructor(fileService: FileService) {
        super(fileService, SAVE_FILE, MixData)
    }
    
    public async getAllMixes(): Promise<Mix[]> {
        return (await this.data).mixes.slice();
    }
    
    public async getMixById(id: number): Promise<Mix | null> {
        return (await this.data).mixes.find(a => a.id === id) ?? null;
    }
    
    public async createMix(mix: Mix): Promise<Mix> {
        const data = await this.data;
        mix.id = data.nextId++;
        data.mixes.push(mix);
        this.saveData();
        return mix;
    }
    
}


class MixData {
    
    public mixes: Mix[];
    
    public nextId: number = 0;
    
    constructor(mixDataJSON?: MixDataJSON) {
        if (mixDataJSON) {
            this.mixes = mixDataJSON.mixes.map((mixJSON: MixJSON) => Mix.fromJSON(mixJSON));
            this.nextId = mixDataJSON.nextId;
        } else {
            this.mixes = [];
            this.nextId = 0;
        }
    }
    
    public toJSON(): MixDataJSON {
        return {
            mixes: this.mixes.map((mix: Mix) => mix.toJSON()),
            nextId: this.nextId
        };
    }
    
}

interface MixDataJSON {
    mixes: MixJSON[];
    nextId: number;
}
