import {Body, Controller, Delete, Get, Param, Post, Put} from "@nestjs/common";
import {ParametersService} from "./parameters.service";
import {SystemParameter, SystemParameterJSON} from "@common/system/parameter/system-parameter";

@Controller("/system/parameters/")
export class ParametersController {
    
    constructor(
        private readonly parametersService: ParametersService
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
    
    @Get("/:name/value")
    public async getValue(
        @Param("name")
        name: string
    ): Promise<{ value: unknown }> {
        return {
            value: await this.parametersService.getValue(name)
        };
    }
    
    @Put("/:name/value")
    public async setValue(
        @Param("name")
        name: string,
        @Body()
        data: { value: unknown }
    ): Promise<void> {
        await this.parametersService.setValue(name, data.value);
    }
    
}
