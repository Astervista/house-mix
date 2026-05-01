/**
 * This module contains the REST control logic for the <a href="../../rest/#tag-adjustments">`/system/adjustments`</a> api endpoint.
 *
 * @module
 */
// noinspection ES6UnusedImports
import {BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, ParseIntPipe, Patch, Put} from "@nestjs/common";
import {AdjustmentsService} from "./adjustments.service";
import {Adjustment, AdjustmentJSON} from "@common/system/adjustment/adjustment";

/**
 * This class is the controller for all the api endpoints under <a href="../../rest/#tag-adjustments">`/system/adjustments`</a>,
 * regarding operations on {@link Adjustment|`Adjustment`s}.
 */
@Controller("system/adjustments")
export class AdjustmentsController {
    
    
    /**
     * Creates an instance of the class. Do not call this constructor directly, it's handled by dependency injection.
     *
     * @param {AdjustmentsService} adjustmentsService - The service handling {@link Adjustment|`Adjustment`} business logic.
     *                                                  Instantiated by dependency injection.
     */
    constructor(
        private readonly adjustmentsService: AdjustmentsService
    ) {
    
    }
    
    /**
     * Get all {@link Adjustment|`Adjustment`s} in the system.
     *
     * @returns {Promise<AdjustmentJSON<unknown>[]>} An array containing the resulting {@link Adjustment|`Adjustment`s}' {@link AdjustmentJSON|serializations}.
     * @see REST API endpoint <a href="../../rest/#operation-system-adjustments-get">`GET /system/adjustments`</a>.
     * @group API Endpoints
     */
    @Get("")
    public async getAll(): Promise<AdjustmentJSON<unknown>[]> {
        const adjustments = await this.adjustmentsService.getAllAdjustments();
        return adjustments.map(adjustment => adjustment.toJSON());
    }
    
    
    /**
     * Creates a new {@link Adjustment|`Adjustment`} in the system.
     *
     * @param {AdjustmentJSON<unknown>} data - The HTTP request's body containing all the information about the {@link Adjustment|`Adjustment`} to be created.
     * @returns {Promise<{ id: number }>} The ID of the newly created adjustment, assigned by the system.
     * @throws {BadRequestException} - {@link BadRequestException|`BadRequestException`} if the adjustment value provided is not valid, or if
     *                                 the new {@link AdjustmentJSON#id|`adjustment id`} is not `"NEW"`.
     * @see REST API endpoint <a href="../../rest/#operation-system-adjustments-put">`PUT /system/adjustments`</a>.
     * @group API Endpoints
     */
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
    
    /**
     * Edit an {@link Adjustment|`Adjustment`}'s properties, given its {@link Adjustment#id|`id`}.
     * This call cannot change an {@link Adjustment#type|adjustment's `type`},
     * delete and recreate the adjustment to change it.
     *
     * @param {number} id - The HTTP request's path parameter with the {@link Adjustment#id|`id`} of the adjustment to edit.
     * @param {AdjustmentJSON<unknown>} data - The HTTP request's body containing the properties to be updated.
     * @throws {BadRequestException} - {@link BadRequestException|`BadRequestException`} if the data is invalid or if there
     *                                  is an attempt to change the {@link Adjustment#id|`id`} or the {@link Adjustment#type|`type`}.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Adjustment|`Adjustment`} with the specified ID exists.
     * @see REST API endpoint <a href="../../rest/#operation-system-adjustments-id-patch">`PATCH /system/adjustments/{id}`</a>.
     * @group API Endpoints
     */
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
    
    /**
     * Removes an {@link Adjustment|`Adjustment`} from the system by its ID.
     *
     * @param {number} id - The HTTP request's path parameter with the {@link Adjustment#id|`id`} of the {@link Adjustment|adjustment} to remove.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Adjustment|`Adjustment`} with the specified ID exists.
     * @see REST API endpoint <a href="../../rest/#operation-system-adjustments-id-delete">`DELETE /system/adjustments/{id}`</a>.
     * @group API Endpoints
     */
    @Delete("/:id")
    public async delete(
        @Param("id", new ParseIntPipe())
        id: number
    ): Promise<void> {
        await this.adjustmentsService.deleteAdjustment(id);
    }
    
    
}
