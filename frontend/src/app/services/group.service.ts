import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BasePath, Delete, Get, Patch, Post} from '../utils/networking/decorators';
import {Group} from '@common/devices/group/group';
import {ChangeParentChange, GroupCreateOptions, GroupEditChanges, EntityPathParams, DeleteGroupOptions, GetGroupsOptions} from '@common/devices/group/rest-classes';

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
            queryParams: {
                sensorMix: false,
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

    @Patch<ChangeParentChange, null>(
        '/:name/parent'
    )
    public changeParent!: (change: ChangeParentChange, params: EntityPathParams) => Promise<void>;

}
