import {Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post} from "@nestjs/common";
import {MixService} from "./mix.service";
import {Mix, MixJSON} from "@common/mixing/mix/mix";
import {Datum} from "@common/mixing/mix/datum";

@Controller('mixing/mix')
export class MixController {
    
    constructor(private readonly mixService: MixService) {}
    
    @Get("all")
    public async getAll(): Promise<MixJSON[]> {
        const mixes = await this.mixService.getAllMixes();
        return mixes.map(dev => dev.toJSON());
    }
    
    @Get("id/:id")
    public async getById(@Param('id', new ParseIntPipe()) id: number): Promise<MixJSON> {
        const  mix = await this.mixService.getMixById(id);
        if (mix) {
            return mix.toJSON();
        } else {
            throw new NotFoundException();
        }
    }
    
    @Post("")
    public async create(
        @Body()
        data: MixJSON
    ): Promise<{ id: number }> {
        return { id: (await this.mixService.createMix(Mix.fromJSON(data))).id as number };
    }
    
}
