import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { GrnService } from './grn.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('grns')
export class GrnController {
  constructor(private readonly grnService: GrnService) {}

  @Get()
  @RequirePermissions('grn.view')
  findAll(
    @Query('poId') poId?: string,
    @Query('status') status?: string,
  ) {
    return this.grnService.findAll({ poId, status });
  }

  @Get(':id')
  @RequirePermissions('grn.view')
  findOne(@Param('id') id: string) {
    return this.grnService.findOne(id);
  }

  @Post()
  @RequirePermissions('grn.create')
  create(@Req() req: any, @Body() body: any) {
    return this.grnService.create(req.user.id, body);
  }

  @Post(':id/verify')
  @RequirePermissions('grn.verify')
  verify(@Param('id') id: string, @Req() req: any) {
    return this.grnService.verify(id, req.user.id);
  }
}
