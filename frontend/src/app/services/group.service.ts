import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BasePath, Delete, Get, Patch, Post} from '../utils/networking/decorators';
import {Group} from '@common/devices/group/group';
import {ChangeParentChange, DeleteGroupOptions, GetGroupsOptions, GroupCreateOptions, GroupEditChanges} from '@common/devices/group/rest-classes';
import {EntityPathParams} from '@common/utils/rest-classes';
import {UnavailableParents} from '@common/devices/rest-classes';
import {mixInfoFromJSON, MixPositionInfo, MixPositionInfoJSON} from '@common/mixing/mix/rest-classes';


@Injectable({
                providedIn: 'root'
            })
@BasePath('/groups')
export class GroupService {

    constructor(private httpClient: HttpClient) { }

    @Get(
        '/',
        {
            result:        Group,
            resultIsArray: true,
            queryParams:   {
                sensorMix:   false,
                actuatorMix: false
            }
        }
    )
    public getAllGroups!: (options?: GetGroupsOptions) => Promise<Group[]>;

    @Post<Group, null>(
        '/',
        {
            queryParams: {
                parent: false
            }
        }
    )
    public createGroup!: (group: Group, options?: GroupCreateOptions) => Promise<void>;

    @Patch<GroupEditChanges, null>(
        '/:name/'
    )
    public editGroup!: (changes: GroupEditChanges, params: EntityPathParams) => Promise<void>;

    @Delete<DeleteGroupOptions, null>(
        '/:name/',
        {
            hasBody: true
        }
    )
    public deleteGroup!: (options: DeleteGroupOptions, params: EntityPathParams) => Promise<void>;

    @Get<MixPositionInfoJSON>(
        '/:name/delete-locks',
        {
            result:        MixPositionInfoJSON,
            resultIsArray: true
        }
    )
    private getDeleteLocksRest!: (params: EntityPathParams) => Promise<MixPositionInfoJSON[]>;

    public async getDeleteLocks(params: EntityPathParams): Promise<MixPositionInfo[]> {
        const mixPositionJSON = await this
            .getDeleteLocksRest(params);
        return mixPositionJSON
            .map(mixInfoFromJSON)
            .filter(a => a != null);
    }

    @Patch<ChangeParentChange, null>(
        '/:name/parent'
    )
    public changeParent!: (change: ChangeParentChange, params: EntityPathParams) => Promise<void>;

    @Get<UnavailableParents>(
        '/:name/unavailable-parents',
        {
            result: UnavailableParents
        }
    )
    public getUnavailableParents!: (params: EntityPathParams) => Promise<UnavailableParents>;

}
