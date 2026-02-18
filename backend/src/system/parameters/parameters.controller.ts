import {Body, Controller, Delete, Get, Param, Patch, Post} from "@nestjs/common";
import {ParametersService} from "./parameters.service";
import {SystemParameter, SystemParameterJSON} from "@common/system/parameter/system-parameter";
import {SetParameterBody} from "@common/system/parameter/rest-classes";
import {MixPositionInfo} from "@common/mixing/mix/rest-classes";
import MixService from "../../mixing/mix/mix.service";
import {SystemOrigin} from "@common/system/constants";

@Controller("/system/parameters/")
export class ParametersController {
    
    constructor(
        private readonly parametersService: ParametersService,
        private readonly mixService: MixService
    ) {
    
    }
    
    @Get("")
    public async getAll(): Promise<SystemParameterJSON[]> {
        const parameters = await this.parametersService.getAllParameters();
        return parameters.map(parameter => parameter.toJSON());
    }
    
    
    @Post("")
    public async create(
        @Body()
        data: SystemParameterJSON
    ): Promise<void> {
        await this.parametersService.createParameter(SystemParameter.fromJSON(data));
    }
    
    @Delete("/:name")
    public async delete(
        @Param("name")
        name: string
    ): Promise<void> {
        await this.parametersService.deleteParameter(name);
    }
    
    @Patch("/:name/value")
    public async set(
        @Param("name")
        name: string,
        @Body()
        body: SetParameterBody
    ): Promise<void> {
        await this.parametersService.setValue(name, body.value);
    }
    
    @Get("/:name/value")
    public async getValue(
        @Param("name")
        name: string
    ): Promise<{ value: unknown }> {
        return {
            value: await this.parametersService.getValue(name)
        };
    }
    
    @Get("/:name/delete-locks")
    public async canDelete(
        @Param("name")
        name: string
    ): Promise<MixPositionInfo[]> {
        return await this.mixService.getDeleteLocks(SystemOrigin.PARAMETER, name);
    }
    
}
