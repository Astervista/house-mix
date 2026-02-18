import {BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, ParseIntPipe, Patch, Put, Query} from "@nestjs/common";
import MixService from "./mix.service";
import {Mix, MixJSON} from "@common/mixing/mix/mix";
import {createMixInfo, mixInfoFromJSON, MixPositionInfoJSON, PutMixBodyJSON} from "@common/mixing/mix/rest-classes";
import {ExportedDatumJSON} from "@common/mixing/mix/datum";
import {MixingGraphJSON} from "@common/mixing/mixing-graph";
import {MixLayout, Point} from "@common/mixing/mix/mix-layout";

@Controller("mixing/")
export class MixController {
    
    constructor(private readonly mixService: MixService) {}
    
    @Get("mixes/")
    public async getAll(): Promise<MixJSON[]> {
        const mixes = await this.mixService.getAllMixes();
        return mixes.map(dev => dev.toJSON());
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
    
    @Get("mixes/:id/layout")
    public async getMixLayout(@Param("id", new ParseIntPipe()) id: number): Promise<MixLayout> {
        return await this.mixService.getMixLayout(id);
    }
    
    
    @Put("mixes/:id/layout")
    public async saveLayout(@Param("id", new ParseIntPipe()) id: number, @Body() layout: MixLayout): Promise<void> {
        (layout as { nodePositions: Record<string, Point> | null }).nodePositions ??= {};
        const oldPositions   = layout.nodePositions;
        layout.nodePositions = {};
        for (const key of Object.keys(oldPositions)) {
            if (isNaN(parseInt(key))) {
                throw new BadRequestException(`Invalid node index for position (${key} is not an integer)`);
            }
            const oldPosition = oldPositions[key] as unknown;
            if (typeof oldPosition != "object") {
                throw new BadRequestException(`Invalid node position object (${JSON.stringify(oldPosition)} is not a Point)`);
            } else if (oldPosition != null) {
                const checkValue = oldPosition as { x?: unknown, y?: unknown };
                if (typeof checkValue.x != "number" || typeof checkValue.y != "number") {
                    throw new BadRequestException(`Node position must contain numerical x and y`);
                } else {
                    layout.nodePositions[key] = {x: checkValue.x, y: checkValue.y};
                }
            }
        }
        await this.mixService.saveMixLayout(id, layout);
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
