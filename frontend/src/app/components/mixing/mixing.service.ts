import {Injectable} from '@angular/core';
import {BasePath, Get, Put} from '../../utils/networking/decorators';
import {Mix} from '@common/mixing/mix/mix';
import {HttpClient} from '@angular/common/http';
import {mixInfoFromJSON, MixPositionInfo, MixPositionInfoJSON, PutMixBodyJSON} from '@common/mixing/mix/rest-classes';
import {ExportedDatum} from '@common/mixing/mix/datum';
import {MixingGraph}  from '@common/mixing/mixing-graph'

@Injectable({
                providedIn: 'root'
            })
@BasePath('/mixing')
export class MixingService {

    constructor(private httpClient: HttpClient) { }

    @Get("/graph/", {result: MixingGraph})
    public getGraph!: () => Promise<MixingGraph>

    @Get('/mixes/:id/', {result: Mix, resultIsArray: false})
    public getMix!: (pathParams: { id: number }) => Promise<Mix>;

    @Get('/mixes/:id/position', {result: MixPositionInfoJSON})
    private getMixPositionRest!: (pathParams: { id: number }) => Promise<MixPositionInfoJSON>;

    @Put<PutMixBodyJSON, { id: number }>('/mixes')
    private putMixRest!: (body: PutMixBodyJSON) => Promise< { id: number }>;

    @Get(
        '/available-imports/',
        {
            result:        ExportedDatum,
            resultIsArray: true,
            queryParams:   {
                target:       true,
                phase:        true,
                actuatorName: false,
                groupName:    false,
                sensorName:   false
            }
        }
    )
    private getAvailableImportsRest!: (queryParams: {
        phase: string
        target: string
        actuatorName?: string
        groupName?: string
        sensorName?: string
    }) => Promise<ExportedDatum[]>;

    public async getMixPositionInfo(pathParams: { id: number }): Promise<MixPositionInfo> {
        const json   = await this.getMixPositionRest(pathParams);
        const result = mixInfoFromJSON(json);
        if (result == null) {
            const error = new Error('Wrong mix position info');
            error.cause = 'WRONG_MIX_POSITION';
            throw error;
        } else {
            return result;
        }
    }

    public async getAvailableImports(mixPositionInfoJSON: MixPositionInfoJSON): Promise<ExportedDatum[]> {
        return this.getAvailableImportsRest({
                                                phase:        mixPositionInfoJSON.phase,
                                                target:       mixPositionInfoJSON.target,
                                                actuatorName: mixPositionInfoJSON.actuatorName,
                                                groupName:    mixPositionInfoJSON.groupName,
                                                sensorName:   mixPositionInfoJSON.sensorName
                                            });
    }

    public async updateMix(mix: Mix, position: MixPositionInfo): Promise<number> {
        return (await this.putMixRest({
                                   position: MixPositionInfoJSON.toJSON(position),
                                   mix:      mix.toJSON()
                               })).id;
    }


}
