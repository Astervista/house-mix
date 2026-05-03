/**
 * This module contains the {@link AdjustmentsService|`AdjustmentsService`} class, handling the business logic about {@link Adjustment|`Adjustment`s}.
 *
 * @module
 */

import {BadRequestException, forwardRef, Inject, Injectable, NotFoundException} from "@nestjs/common";
import {PersistentDataService} from "../../helpers/file/persistent-data-service";
import {FileService} from "../../helpers/file/file.service";
import {MixService} from "../../mixing/mix/mix.service";
import {EngineService} from "../../engine/engine.service";
import {Adjustment, AdjustmentAnimationOff, AdjustmentAnimationOn, AdjustmentJSON, AdjustmentSplitCommands} from "@common/system/adjustment/adjustment";
import {ZigbeeService} from "../../zigbee/zigbee.service";

// noinspection ES6UnusedImports
import type {Mix} from '@common/mixing/mix/mix';

/**
 * The path of the file where to save the data about {@link Adjustment|`Adjustment`s}.
 */
const SAVE_FILE = "system/adjustments.json";

/**
 * This service handles the business logic about {@link Adjustment|`Adjustment`s}.
 */
@Injectable()
export class AdjustmentsService extends PersistentDataService<AdjustmentData, AdjustmentDataJSON> {
    
    /**
     * Creates an instance of the class. Do not call this constructor directly, it's handled by dependency injection.
     *
     * @param {FileService} fileService - The service handling persistent storage. Instantiated by dependency injection.
     * @param {MixService} mixService - The service handling {@link Mix|`Mix`} business logic. Instantiated by dependency injection.
     * @param {EngineService} engineService - The service running the main cycle elaboration. Instantiated by dependency injection.
     * @param {ZigbeeService} zigbeeService - The service handling Zigbee communication. Instantiated by dependency injection.
     */
    constructor(
        fileService: FileService,
        @Inject(forwardRef(() => MixService))
        private mixService: MixService,
        @Inject(forwardRef(() => EngineService))
        private engineService: EngineService,
        private zigbeeService: ZigbeeService
    ) {
        super(fileService, SAVE_FILE, AdjustmentData);
        void this.data.then(data => {
            this.zigbeeService.transitionAdjustments = data
                .adjustments
                .filter(adjustment =>
                            adjustment instanceof AdjustmentAnimationOff || adjustment instanceof AdjustmentAnimationOn || adjustment instanceof AdjustmentSplitCommands
                );
        });
    }
    
    /**
     * @inheritDoc
     */
    protected override saveData(): void {
        void this.data.then(
            (data) => {
                this.zigbeeService.transitionAdjustments = data
                    .adjustments
                    .filter(adjustment =>
                                adjustment instanceof AdjustmentAnimationOff || adjustment instanceof AdjustmentAnimationOn || adjustment instanceof AdjustmentSplitCommands
                    );
                super.saveData();
            }
        );
    }
    
    /**
     * Get all {@link Adjustment|`Adjustment`s} in the system.
     *
     * @returns {Promise<Adjustment<unknown, unknown>[]>} An array containing the resulting {@link Adjustment|`Adjustment`s}.
     */
    public async getAllAdjustments(): Promise<Adjustment<unknown, unknown>[]> {
        return (await this.data).adjustments.slice();
    }
    
    /**
     * Creates a new {@link Adjustment|`Adjustment`} in the system.
     *
     * @param {Adjustment<unknown, unknown>} adjustment - The {@link Adjustment|`Adjustment`} to create.
     * @returns {Promise<number>} The ID of the newly created adjustment, assigned by the system.
     * @throws {BadRequestException} - {@link BadRequestException|`BadRequestException`} if the adjustment id is not `"NEW"`.
     */
    public async createAdjustment(adjustment: Adjustment<unknown, unknown>): Promise<number> {
        const data = await this.data;
        if (adjustment.id != "NEW") {
            throw new BadRequestException("Adjustments to be created must have the id 'NEW'");
        }
        adjustment.id = data.nextId++;
        data.adjustments.push(adjustment);
        this.saveData();
        return adjustment.id;
    }
    
    /**
     * Edit an {@link Adjustment|`Adjustment`}'s properties, given its ID.
     * This call cannot change an {@link Adjustment|`Adjustment`}'s type,
     * delete and recreate the adjustment to change it.
     *
     * @param {Adjustment<unknown, unknown>} edit - The {@link Adjustment|`Adjustment`} with the properties to update.
     * @throws {BadRequestException} - {@link BadRequestException|`BadRequestException`} if there is an attempt to change the {@link Adjustment#type|`type`}.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Adjustment|`Adjustment`} with the specified ID exists.
     */
    public async editAdjustment(edit: Adjustment<unknown, unknown>): Promise<void> {
        const data       = await this.data;
        const adjustment = data.adjustments.find(otherAdjustment => otherAdjustment.id == edit.id);
        if (adjustment == null) {
            throw new NotFoundException("Adjustment doesn't exist");
        }
        if (edit.type != adjustment.type) {
            throw new BadRequestException("Cannot change the type of the adjustment with this call");
        }
        adjustment.data = edit.data;
        this.saveData();
    }
    
    /**
     * Removes an {@link Adjustment|`Adjustment`} from the system by its ID.
     *
     * @param {number} id - The ID of the {@link Adjustment|adjustment} to remove.
     * @throws {NotFoundException} - {@link NotFoundException|`NotFoundException`} if no {@link Adjustment|`Adjustment`} with the specified ID exists.
     */
    public async deleteAdjustment(id: number): Promise<void> {
        const data               = await this.data;
        const adjustmentToDelete = data.adjustments.find(otherAdjustment => otherAdjustment.id === id);
        if (adjustmentToDelete == null) {
            throw new NotFoundException("Adjustment does not exist");
        }
        const toDeleteIndex = data.adjustments.indexOf(adjustmentToDelete);
        if (toDeleteIndex !== -1) {
            data.adjustments.splice(toDeleteIndex, 1);
        }
        this.saveData();
    }
}

/**
 * The persistent data structure used by {@link AdjustmentsService|`AdjustmentsService`}
 * for persisting data about {@link Adjustment|`Adjustment`s}.
 */
export class AdjustmentData {
    
    /**
     * All the {@link Adjustment|`Adjustment`s} in the system.
     */
    public adjustments: Adjustment<unknown, unknown>[];
    
    /**
     * The next ID to assign to a new {@link Adjustment|`Adjustment`}.
     */
    public nextId: number = 0;
    
    /**
     * Creates an instance of the class from its serialization.
     *
     * @param {AdjustmentDataJSON} adjustmentDataJSON - The serialization of the class to recreate into an instance of the class.
     */
    constructor(adjustmentDataJSON?: AdjustmentDataJSON) {
        if (adjustmentDataJSON) {
            this.adjustments = adjustmentDataJSON
                .adjustments
                .map((adjustmentJSON: AdjustmentJSON<unknown>) => Adjustment.fromJSON(adjustmentJSON))
                .filter(a => a != null);
            this.nextId      = adjustmentDataJSON.nextId;
        } else {
            this.adjustments = [];
            this.nextId      = 0;
        }
    }
    
    /**
     * Converts the adjustment data instance into its JSON representation.
     *
     * @returns {AdjustmentDataJSON} The JSON representation of `this`.
     */
    public toJSON(): AdjustmentDataJSON {
        return {
            adjustments: this.adjustments.map((adjustment: Adjustment<unknown, unknown>) => adjustment.toJSON()),
            nextId:      this.nextId
        };
    }
    
}

/**
 * The serialization of the class {@link AdjustmentData|`AdjustmentData`}.
 */
export interface AdjustmentDataJSON {
    /**
     * Serialization of the property {@link AdjustmentData#adjustments|`adjustments`}.
     */
    adjustments: AdjustmentJSON<unknown>[];
    
    /**
     * Serialization of the property {@link AdjustmentData#nextId|`nextId`}.
     */
    nextId: number;
}
