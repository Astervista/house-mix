import {BadRequestException, forwardRef, Inject, Injectable, NotFoundException} from "@nestjs/common";
import {PersistentDataService} from "../../helpers/file/persistent-data-service";
import {FileService} from "../../helpers/file/file.service";
import MixService from "../../mixing/mix/mix.service";
import {EngineService} from "../../engine/engine.service";
import {Adjustment, AdjustmentAnimationOff, AdjustmentAnimationOn, AdjustmentJSON, AdjustmentSplitCommands} from "@common/system/adjustment/adjustment";
import {ZigbeeService} from "../../zigbee/zigbee.service";

const SAVE_FILE = "system/adjustments.json";

@Injectable()
export class AdjustmentsService extends PersistentDataService<AdjustmentData, AdjustmentDataJSON> {
    
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
    
    public async getAllAdjustments(): Promise<Adjustment<unknown, unknown>[]> {
        return (await this.data).adjustments.slice();
    }
    
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


class AdjustmentData {
    
    public adjustments: Adjustment<unknown, unknown>[];
    
    public nextId: number = 0;
    
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
    
    public toJSON(): AdjustmentDataJSON {
        return {
            adjustments: this.adjustments.map((adjustment: Adjustment<unknown, unknown>) => adjustment.toJSON()),
            nextId:      this.nextId
        };
    }
    
}

interface AdjustmentDataJSON {
    adjustments: AdjustmentJSON<unknown>[];
    nextId: number;
}
