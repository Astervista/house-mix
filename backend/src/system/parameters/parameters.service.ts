import {BadRequestException, ConflictException, forwardRef, Inject, Injectable, NotFoundException} from "@nestjs/common";
import {PersistentDataService} from "../../helpers/file/persistent-data-service";
import {SystemParameter, SystemParameterJSON} from "@common/system/parameter/system-parameter";
import {FileService} from "../../helpers/file/file.service";
import MixService from "../../mixing/mix/mix.service";
import {DatumOrigin} from "@common/mixing/mix/datum";
import {SystemOrigin} from "@common/system/constants";
import {EngineService} from "../../engine/engine.service";

const SAVE_FILE = "system/parameters.json";

@Injectable()
export class ParametersService extends PersistentDataService<ParameterData, ParameterDataJSON>{
    
    constructor(
        fileService: FileService,
        @Inject(forwardRef(() => MixService))
        private mixService: MixService,
        @Inject(forwardRef(() => EngineService))
        private engineService: EngineService
    ) {
        super(fileService, SAVE_FILE, ParameterData);
    }
    
    public async getAllParameters(): Promise<SystemParameter[]> {
        const data = await this.data;
        return data.parameters.slice();
    }
    
    public async createParameter(parameter: SystemParameter): Promise<void> {
        const data = await this.data;
        const alreadyExists = data.parameters.some(otherParam => otherParam.name == parameter.name);
        if (alreadyExists) {
            throw new Error("Parameter already exists");
        }
        data.parameters.push(parameter);
        this.saveData();
    }
    
    public async deleteParameter(name: string): Promise<void> {
        const data = await this.data;
        const parameterToDelete = data.parameters.find(otherParam => otherParam.name === name);
        if (parameterToDelete == null) {
            throw new NotFoundException("Parameter does not exist");
        }
        if (await this.mixService.dependencyExists(DatumOrigin.SYSTEM, SystemOrigin.PARAMETER, name)) {
            throw new ConflictException("Cannot delete the parameter, it's used in a mix");
        }
        const toDeleteIndex = data.parameters.indexOf(parameterToDelete);
        if (toDeleteIndex !== -1) {
            data.parameters.splice(toDeleteIndex, 1);
        }
        this.saveData();
    }
    
    public async getValue(parameterName: string): Promise<unknown> {
        const data = await this.data;
        const parameter = data.parameters.find(otherParam => otherParam.name === parameterName);
        if (parameter == null) {
            throw new NotFoundException("Parameter does not exist");
        }
        return parameter.value;
    }
    
    public async setValue(parameterName: string, value: unknown): Promise<void> {
        const data = await this.data;
        const parameter = data.parameters.find(otherParam => otherParam.name === parameterName);
        if (parameter == null) {
            throw new NotFoundException("Parameter does not exist");
        }
        if (!parameter.datum.checkValue(value)) {
            throw new BadRequestException("The provided value is not valid for the chosen parameter")
        }
        parameter.value = value;
        this.engineService.requestRecalculation();
        this.saveData();
    }
}

class ParameterData {
    
    public parameters: SystemParameter[];
    
    constructor(mixDataJSON?: ParameterDataJSON) {
        if (mixDataJSON) {
            this.parameters = mixDataJSON.parameters.map((parameter: SystemParameterJSON) => SystemParameter.fromJSON(parameter));
            
        } else {
            this.parameters = [];
        }
    }
    
    public toJSON(): ParameterDataJSON {
        return {
            parameters: this.parameters.map((mix: SystemParameter) => mix.toJSON()),
        };
    }
}

interface ParameterDataJSON {
    parameters: SystemParameterJSON[];
}
