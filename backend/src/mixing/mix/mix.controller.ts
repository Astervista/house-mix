import {BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, ParseIntPipe, Patch, Put, Query} from "@nestjs/common";
import MixService from "./mix.service";
import {Mix, MixJSON} from "@common/mixing/mix/mix";
import {createMixInfo, mixInfoFromJSON, MixPositionInfoJSON, PutMixBodyJSON} from "@common/mixing/mix/rest-classes";
import {ExportedDatumJSON} from "@common/mixing/mix/datum";
import {MixingGraphJSON} from "@common/mixing/mixing-graph";

@Controller("mixing/")
export class MixController {
    
    constructor(private readonly mixService: MixService) {}
    
    @Get("mixes/")
    public async getAll(): Promise<MixJSON[]> {
        const mixes = await this.mixService.getAllMixes();
        return mixes.map(dev => dev.toJSON());
    }
    
    @Get("mixes/:id")
    public async getById(@Param("id", new ParseIntPipe()) id: number): Promise<MixJSON> {
        const mix = await this.mixService.getMixById(id);
        if (mix) {
            return mix.toJSON();
        } else {
            throw new NotFoundException();
        }
    }
    
    @Patch("mixes/:id")
    public async editMix(@Body() newMix: MixJSON, @Param("id", new ParseIntPipe()) id: number): Promise<void> {
        const mix = Mix.fromJSON(newMix);
        if (mix.id != id) {
            throw new BadRequestException("The sent mix id doesn't match with the path id requested");
        }
        const position = await this.mixService.getMixPosition(id);
        await this.mixService.putMix(mix, position);
    }
    
    @Delete("mixes/:id")
    public async deleteMix(@Param("id", new ParseIntPipe()) id: number): Promise<void> {
        await this.mixService.deleteMix(id);
    }
    
    @Get("mixes/:id/position")
    public async getMixPosition(@Param("id", new ParseIntPipe()) id: number): Promise<MixPositionInfoJSON> {
        return MixPositionInfoJSON.toJSON(await this.mixService.getMixPosition(id));
    }
    
    @Put("mixes/")
    public async create(
        @Body()
        data: PutMixBodyJSON
    ): Promise<{ id: number }> {
        const mixInfo = mixInfoFromJSON(data.position);
        if (mixInfo == null) {
            throw new BadRequestException("The position information is not correct");
        }
        return {
            id: await this.mixService.putMix(Mix.fromJSON(data.mix), mixInfo)
        };
    }
    
    @Get("available-imports/")
    public async getAvailableImports(
        @Query()
        queryParams: Record<string, string>
    ): Promise<ExportedDatumJSON[]> {
        const mixPosition = createMixInfo(queryParams);
        if (mixPosition == null) {
            throw new BadRequestException("The filter defining the position is not valid");
        }
        const imports = await this.mixService.getAvailableImports(mixPosition);
        return imports.map(imp => imp.toJSON());
    }
    
    @Get("graph")
    public async getGraph(): Promise<MixingGraphJSON> {
        return (await this.mixService.getGraph()).toJSON();
    }
    
    @Get("center-mixes-names")
    public async getCenterMixNames(): Promise<string[]> {
        return (await this.mixService.getCenterMixes()).map(centerMix => centerMix.name);
    }
    
}
