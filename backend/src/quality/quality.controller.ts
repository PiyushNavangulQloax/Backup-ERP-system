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
import { QualityService } from './quality.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { CompleteInspectionDto } from './dto/complete-inspection.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('quality')
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  @Get(['', 'inspections'])
  @RequirePermissions('quality.view')
  findAll(
    @Query('status') status?: string,
    @Query('decision') decision?: string,
    @Query('sourceType') sourceType?: string,
    @Query('partId') partId?: string,
  ) {
    return this.qualityService.findAll({ status, decision, sourceType, partId });
  }

  @Get(['stats', 'inspections/stats'])
  @RequirePermissions('quality.view')
  getStatistics() {
    return this.qualityService.getStatistics();
  }

  @Get([':id', 'inspections/:id'])
  @RequirePermissions('quality.view')
  findOne(@Param('id') id: string) {
    return this.qualityService.findOne(id);
  }

  @Post(['', 'inspections'])
  @RequirePermissions('quality.manage')
  create(@Req() req: any, @Body() body: CreateInspectionDto) {
    return this.qualityService.create(req.user.id, body);
  }

  @Post([':id/start', 'inspections/:id/start'])
  @RequirePermissions('quality.manage')
  start(@Req() req: any, @Param('id') id: string) {
    return this.qualityService.start(id, req.user.id);
  }

  @Post([':id/complete', 'inspections/:id/complete'])
  @RequirePermissions('quality.approve')
  complete(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: CompleteInspectionDto,
  ) {
    return this.qualityService.complete(id, req.user.id, body);
  }
}
