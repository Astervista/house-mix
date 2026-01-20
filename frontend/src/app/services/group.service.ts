import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BasePath, Delete, Get, Patch, Post} from '../utils/networking/decorators';
import {Group} from '@common/devices/group/group';
import {ChangeParentChange, DeleteGroupOptions, GroupCreateOptions, GroupEditChanges, GroupPathParams} from '@common/devices/group/rest-classes';

@Injectable({
                providedIn: 'root'
            })
@BasePath('/group')
export class GroupService {

    constructor(private httpClient: HttpClient) { }

    @Get(
        '/',
        {
            result:        Group,
            resultIsArray: true
        }
    )
    public getAllGroups!: () => Promise<Group[]>;

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
    public editGroup!: (changes: GroupEditChanges, params: GroupPathParams) => Promise<void>;

    @Delete<DeleteGroupOptions, null>(
        '/:name/'
    )
    public deleteGroup!: (options: DeleteGroupOptions, params: GroupPathParams) => Promise<void>;

    @Patch<ChangeParentChange, null>(
        '/:name/parent'
    )
    public changeParent!: (change: ChangeParentChange, params: GroupPathParams) => Promise<void>;

}
