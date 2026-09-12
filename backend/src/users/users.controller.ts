import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.view')
  findAll(
    @Query('search') search?: string,
    @Query('roleId') roleId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.findAll({
      search,
      roleId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('roles')
  @RequirePermissions('users.view')
  getRoles() {
    return this.usersService.getRoles();
  }

  @Get('permissions')
  @RequirePermissions('users.view')
  getPermissions() {
    return this.usersService.getPermissions();
  }

  @Put('roles/:id/permissions')
  @RequirePermissions('roles.manage')
  updateRolePermissions(
    @Param('id') id: string,
    @Body() body: { permissionIds: string[] },
  ) {
    return this.usersService.updateRolePermissions(id, body.permissionIds);
  }

  @Get(':id')
  @RequirePermissions('users.view')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequirePermissions('users.create')
  create(@Body() body: any) {
    return this.usersService.create(body);
  }

  @Put(':id')
  @RequirePermissions('users.edit')
  update(@Param('id') id: string, @Body() body: any) {
    return this.usersService.update(id, body);
  }
}
