import {Injectable} from "@nestjs/common";
import {Mix, MixJSON} from "@common/mixing/mix/mix";
import {FileService} from "../../helpers/file/file.service";

const SAVE_FILE = "mixing/mix.json";

@Injectable()
export class MixService {
    
    private readonly mixData: Promise<MixData>;
    
    constructor(private fileService: FileService) {
        this.mixData = fileService
            .readDataFile<MixDataJSON>(SAVE_FILE)
            .then((data: MixDataJSON | null) => {
                if (data != null) {
                    return new MixData(data);
                } else {
                    return new MixData();
                }
            });
    }
    
    public async getAllMixes(): Promise<Mix[]> {
        return (await this.mixData).mixes.slice();
    }
    
    public async getMixById(id: number): Promise<Mix | null> {
        return (await this.mixData).mixes.find(a => a.id === id) ?? null;
    }
    
    public async createMix(mix: Mix): Promise<Mix> {
        const data = await this.mixData;
        mix.id = data.nextId++;
        data.mixes.push(mix);
        void this.fileService.saveDataFile(SAVE_FILE, data);
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
    
}

interface MixDataJSON {
    mixes: MixJSON[];
    nextId: number;
}
