import {ConflictException, Injectable, NotFoundException} from "@nestjs/common";
import {FileService} from "../../helpers/file/file.service";
import {MixService} from "../../mixing/mix/mix.service";
import { Actuator, ActuatorJSON } from "@common/devices/actuator/actuator";

const SAVE_FILE = "devices/actuator.json";

@Injectable()
export class ActuatorService {
    
    private readonly actuatorData: Promise<ActuatorData>;
    
    constructor(
        private fileService: FileService,
        private mixService: MixService,
    ) {
        this.actuatorData = fileService
            .readDataFile<ActuatorDataJSON>(SAVE_FILE)
            .then((data: ActuatorDataJSON | null) => {
                if (data != null) {
                    return new ActuatorData(data);
                } else {
                    return new ActuatorData();
                }
            });
    }
    
    public async getAllActuators(): Promise<Actuator[]> {
        return (await this.actuatorData).actuators.slice();
    }
    
    public async getActuatorByName(name: string): Promise<Actuator | null> {
        return (await this.actuatorData).actuators.find(a => a.name === name) ?? null;
    }
    
    public async createActuator(actuator: Actuator): Promise<void> {
        const data = await this.actuatorData;
        const alreadyExisting = data.actuators.some(otherActuator => otherActuator.name === actuator.name);
        if (!alreadyExisting) {
            data.actuators.push(actuator);
            void this.fileService.saveDataFile(SAVE_FILE, data);
        } else {
            throw new ConflictException();
        }
    }
    
    public async actuatorExists(actuatorName: string): Promise<boolean> {
        return (await this.actuatorData).actuators.some(a => a.name === actuatorName);
    }
    
}


class ActuatorData {
    
    public actuators: Actuator[];
    
    constructor(actuatorDataJSON?: ActuatorDataJSON) {
        if (actuatorDataJSON) {
            this.actuators = actuatorDataJSON.actuators.map((actuatorJSON: ActuatorJSON) => Actuator.fromJSON(actuatorJSON));
        } else {
            this.actuators = [];
        }
    }

}

interface ActuatorDataJSON {
    actuators: ActuatorJSON[];
}
