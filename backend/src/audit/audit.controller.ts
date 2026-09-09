import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions('audit.view')
  findAll(
    @Query('module') module?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findAll({
      module,
      userId,
      limit: limit ? parseInt(limit, 10) : 100,
    });
  }
}
