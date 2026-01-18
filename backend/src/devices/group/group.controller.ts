import {Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, Post} from "@nestjs/common";
import {Group, GroupJSON} from "@common/devices/group/group";
import {GroupService} from "./group.service";
import {AddActuatorBody} from "@common/devices/group/rest-classes";

@Controller('device/group')
export class GroupController {
    
    
    constructor(private readonly groupService: GroupService) {}
    
    @Get("all")
    public async getAll(): Promise<GroupJSON[]> {
        const groups = await this.groupService.getAllGroups();
        return groups.map(dev => dev.toJSON());
    }
    
    @Get("name/:name")
    public async getByName(@Param('name') name: string): Promise<GroupJSON> {
        const  group = await this.groupService.getGroupByName(name);
        if (group) {
            return group.toJSON();
        } else {
            throw new NotFoundException();
        }
    }
    
    @Post("/")
    public async create(
        @Body()
        data: GroupJSON
    ): Promise<void> {
        await this.groupService.createGroup(Group.fromJSON(data));
    }
    
    @Post("name/:name/actuator/:actuatorName")
    @HttpCode(HttpStatus.OK)
    public async addActuator(
        @Param("name")
        name: string,
        @Param("actuatorName")
        actuatorName: string,
        @Body()
        options: AddActuatorBody | null
    ): Promise<void> {
        await this.groupService.addActuator(name, actuatorName, options?.move ?? false);
    }

}
