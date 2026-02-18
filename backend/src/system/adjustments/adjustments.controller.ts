import {BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Put} from "@nestjs/common";
import {AdjustmentsService} from "./adjustments.service";
import {Adjustment, AdjustmentJSON} from "@common/system/adjustment/adjustment";

@Controller("system/adjustments")
export class AdjustmentsController {
    
    
    constructor(
        private readonly adjustmentsService: AdjustmentsService
    ) {
    
    }
    
    @Get("")
    public async getAll(): Promise<AdjustmentJSON<unknown>[]> {
        const adjustments = await this.adjustmentsService.getAllAdjustments();
        return adjustments.map(adjustment => adjustment.toJSON());
    }
    
    
    @Put("")
    public async create(
        @Body()
        data: AdjustmentJSON<unknown>
    ): Promise<{ id: number }> {
        const adjustment = Adjustment.fromJSON(data);
        if (adjustment == null) {
            throw new BadRequestException("The adjustment configuration data is not valid");
        }
        return {
            id: await this.adjustmentsService.createAdjustment(adjustment)
        };
    }
    
    @Patch("/:id")
    public async edit(
        @Param("id", new ParseIntPipe())
        id: number,
        @Body()
        data: AdjustmentJSON<unknown>
    ): Promise<void> {
        const adjustment = Adjustment.fromJSON(data);
        if (adjustment == null) {
            throw new BadRequestException("The adjustment configuration data is not valid");
        }
        if (adjustment.id != id) {
            throw new BadRequestException("Cannot change the name of the adjustment with this call");
        }
        await this.adjustmentsService.editAdjustment(adjustment);
    }
    
    @Delete("/:id")
    public async delete(
        @Param("id", new ParseIntPipe())
        id: number
    ): Promise<void> {
        await this.adjustmentsService.deleteAdjustment(id);
    }
    
    
}
