/**
 * This module contains the {@link GroupService|`GroupService`}.
 *
 * @module
 */
import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BasePath, Delete, Get, Patch, Post} from '../utils/networking/decorators';
import {Group} from '@common/devices/group/group';
import {ChangeParentChange, DeleteGroupOptions, GetGroupsOptions, GroupCreateOptions, GroupEditChanges} from '@common/devices/group/rest-classes';
import {EntityPathParams} from '@common/utils/rest-classes';
import {UnavailableParents} from '@common/devices/rest-classes';
import {mixInfoFromJSON, MixPositionInfo, MixPositionInfoJSON} from '@common/mixing/mix/rest-classes';

// noinspection ES6UnusedImports
import type {Mix} from '@common/mixing/mix/mix';
// noinspection ES6UnusedImports
import type {HttpErrorResponse} from '@angular/common/http';

/**
 * This is the service that handles all REST requests to the `"/groups/*"` endpoints regarding
 * {@link Group|`Group`s}.
 */
@Injectable({
                providedIn: 'root'
            })
@BasePath('/groups')
export class GroupService {

    /**
     * Creates an instance of the service. Do not call this constructor directly,
     * it's handled by Angular's rendering engine or component factory.
     *
     * @param {HttpClient} httpClient - - The http service. Instantiated by dependency injection.
     */
    constructor(private httpClient: HttpClient) { }

    /**
     * Get all {@link Group|`Group`s} in the system, optionally filtered by {@link Mix|`Mix`}.
     *
     * @param {GetGroupsOptions} options - The options to filter the results.
     * @returns {Promise<Group[]>} An array containing the resulting {@link Group|`Group`s}.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `400` if  one of {@link GetGroupsOptions#actuatorMix|`actuatorMix`} and
     *     {@link GetGroupsOptions#sensorMix|`sensorMix`} is specified at the same time as {@link GetGroupsOptions#anyMixed|`anyMixed`}.
     * @apiEndpoint <a href="../../rest/#operation-groups-get">`/groups`</a>.
     * @group API Endpoints
     * @get
     */
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

    /**
     * Creates a new {@link Group|`Group`} in the system.
     *
     * @param {Group} group - The information about the {@link Group|`Group`} to be created.
     * @param {GroupCreateOptions} options - The additional optional info for the creation, namely the name of the {@link Group|`Group`} where the new group will be placed.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `409` if  there already exist a {@link Group|group} with the same {@link Group#name|name}.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  a {@link GroupCreateOptions#parent|parent} was specified but no {@link Group|`Group`} was found with
     *     the specified name.
     * @apiEndpoint <a href="../../rest/#operation-groups-post">`/groups`</a>.
     * @group API Endpoints
     * @post
     */
    @Post<Group, null>(
        '/',
        {
            queryParams: {
                parent: false
            }
        }
    )
    public createGroup!: (group: Group, options?: GroupCreateOptions) => Promise<void>;


    /**
     * Get a {@link Group|`Group`} with a specific {@link Group#name|`name`}.
     *
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link Group#name|`name`} of the group to retrieve.
     * @returns {Promise<Group>} - The {@link Group|`Group`}.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Group|`Group`} was found with the specified name.
     * @apiEndpoint <a href="../../rest/#operation-groups-name-get">`/groups/{name}`</a>.
     * @group API Endpoints
     * @get
     */
    @Get<Group>(
        '/:name/',
        {
            result: Group
        }
    )
    public getGroup!: (pathParams: EntityPathParams) => Promise<void>;


    /**
     * Creates a new {@link Group|`Group`} in the system.
     *
     * @param {Group} group - The information about the {@link Group|`Group`} to be created.
     * @param {EntityPathParams} pathParams - The HTTP request's path parameters with the {@link Group#name|`name`} of the group to create.
     * @param {GroupCreateOptions} options - The additional optional info for the creation, namely the name of the {@link Group|`Group`} where the new group will be placed.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `409` if  there already exist a {@link Group|group} with the same {@link Group#name|name}.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  a {@link GroupCreateOptions#parent|parent} was specified but no {@link Group|`Group`} was found with
     *     the specified name.
     * @apiEndpoint <a href="../../rest/#operation-groups-post">`/groups`</a>.
     * @group API Endpoints
     * @post
     */
    @Post<Group, null>(
        '/:name/',
        {
            queryParams: {
                parent: false
            }
        }
    )
    public createGroupWithName!: (group: Group, pathParams?: EntityPathParams, options?: GroupCreateOptions) => Promise<void>;

    /**
     * Edit a {@link Group|`Group`}'s properties, given its {@link Group#name|`name`}.
     *
     * @param {GroupEditChanges} changes - The {@link GroupEditChanges|properties} to be updated.
     * @param {string} pathParams - The HTTP request's path parameters with the {@link Group#name|`name`} of the group to update.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Group|`Group`} was found with the specified name.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `409` if  a new {@link Group#name|`name`} was specified, but a {@link Group|group} with that name already exists.
     * @returns {Promise<void>}
     * @apiEndpoint <a href="../../rest/#operation-groups-name-patch">`/groups/{name}`</a>.
     * @group API Endpoints
     * @patch
     */
    @Patch<GroupEditChanges, null>(
        '/:name/'
    )
    public editGroup!: (changes: GroupEditChanges, pathParams: EntityPathParams) => Promise<void>;

    /**
     * Removes a {@link Group|`Group`} from the system by its name, if possible.
     *
     * @param {DeleteGroupOptions} options - The options for handling children of the deleted group.
     * @param {string} pathParams - The HTTP request's path parameters with the {@link Group#name|`name`} of the group to delete.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Group|`Group`} was found with the specified name.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `409` if  the {@link Group|`Group`} cannot be deleted because it is linked to a {@link Mix|mix} that is
     *     referenced by another {@link Mix|mix}.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `400` if  the provided options are invalid.
     * @returns {Promise<void>}
     * @apiEndpoint <a href="../../rest/#operation-groups-name-delete">`/groups/{name}`</a>.
     * @group API Endpoints
     * @delete
     */
    @Delete<DeleteGroupOptions, null>(
        '/:name/',
        {
            hasBody: true
        }
    )
    public deleteGroup!: (options: DeleteGroupOptions, pathParams: EntityPathParams) => Promise<void>;

    /**
     * Gets all the conflicts that prevent a {@link Group|`Group`} from being deleted.
     *
     * @param {string} pathParams - The HTTP request's path parameters with the {@link Group#name|`name`} of the group to check.
     * @returns {Promise<MixPositionInfoJSON[]>} A list of serialized {@link MixPositionInfo|positions} of all the {@link Mix|`Mix`es} that
     *                                       reference the {@link Group|`Group`} and prevent it from being deleted. If empty, it means that
     *                                       the {@link Group|`Group`} can be deleted.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Group|`Group`} was found with the specified name.
     * @apiEndpoint <a href="../../rest/#operation-groups-name-delete-locks-get">`/groups/{name}/delete-locks`</a>.
     * @group API Endpoints
     * @get
     */
    @Get<MixPositionInfoJSON>(
        '/:name/delete-locks',
        {
            result:        MixPositionInfoJSON,
            resultIsArray: true
        }
    )
    private getDeleteLocksRest!: (pathParams: EntityPathParams) => Promise<MixPositionInfoJSON[]>;

    /**
     * Gets all the conflicts that prevent a {@link Group|`Group`} from being deleted.
     *
     * @param {string} pathParams - The HTTP request's path parameters with the {@link Group#name|`name`} of the group to check.
     * @returns {Promise<MixPositionInfo[]>} A list of {@link MixPositionInfo|positions} of all the {@link Mix|`Mix`es} that
     *                                       reference the {@link Group|`Group`} and prevent it from being deleted. If empty, it means that
     *                                       the {@link Group|`Group`} can be deleted.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Group|`Group`} was found with the specified name.
     * @apiEndpoint <a href="../../rest/#operation-groups-name-delete-locks-get">`/groups/{name}/delete-locks`</a>.
     * @group API Endpoints
     * @get
     * @apiProxy
     */
    public async getDeleteLocks(pathParams: EntityPathParams): Promise<MixPositionInfo[]> {
        const mixPositionJSON = await this
            .getDeleteLocksRest(pathParams);
        return mixPositionJSON
            .map(mixInfoFromJSON)
            .filter(a => a != null);
    }

    /**
     * Move a {@link Group|`Group`} inside a different {@link Group|`Group`}, or take it out of any {@link Group|`Group`}.
     *
     * @param {ChangeParentChange} change - The object containing property {@link ChangeParentChange#parent|`parent`} indicating the {@link Group#name|name} of the new
     *                                    {@link Group|parent} or `null` to remove the parent.
     * @param {string} pathParams - The HTTP request's path parameters with the {@link Group#name|`name`} of the group to move.
     * @returns {Promise<void>}
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Group|`Group`} or destination {@link Group|`Group`} was found with the specified
     *                               names.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `409` if  the {@link Group|`Group`} cannot be moved to the requested {@link Group|`Group`}, because it would
     *     break dependencies inside the {@link Mix|mixes}.
     * @apiEndpoint <a href="../../rest/#operation-groups-name-parent-patch">`/groups/{name}/parent`</a>.
     * @group API Endpoints
     * @patch
     */
    @Patch<ChangeParentChange, null>(
        '/:name/parent'
    )
    public changeParent!: (change: ChangeParentChange, pathParams: EntityPathParams) => Promise<void>;

    /**
     * Returns information about all the {@link Group|`Group`s} that cannot be parents for this {@link Group|`Group`}, because they would break
     * dependencies inside the {@link Mix|mixes}. For example, if a {@link Group|group}'s {@link Mix|`Mix`} is referenced by a parent {@link Group|group}'s
     * {@link Mix|`Mix`}, this parent must remain in the hierarchy, otherwise the {@link Group|group}'s {@link Mix|mix} will not be able to reach it.
     *
     * @param {string} pathParams - The HTTP request's path parameters with the {@link Group#name|`name`} of the group.
     * @returns {Promise<UnavailableParents>} The information about the {@link UnavailableParents|unavailable groups}.
     * @throws {HttpErrorResponse} - {@link HttpErrorResponse|`HttpErrorResponse`} with {@link HttpErrorResponse#status|`status`} `404` if  no {@link Group|`Group`} was found with the specified name.
     * @apiEndpoint <a href="../../rest/#operation-groups-name-unavailable-parents-get">`/groups/{name}/unavailable-parents`</a>.
     * @group API Endpoints
     * @get
     */
    @Get<UnavailableParents>(
        '/:name/unavailable-parents',
        {
            result: UnavailableParents
        }
    )
    public getUnavailableParents!: (pathParams: EntityPathParams) => Promise<UnavailableParents>;

}
