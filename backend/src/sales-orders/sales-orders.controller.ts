import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SalesOrdersService } from './sales-orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Get()
  @RequirePermissions('billing.view')
  findAll(
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
  ) {
    return this.salesOrdersService.findAll({ customerId, status });
  }

  @Get(':id')
  @RequirePermissions('billing.view')
  findOne(@Param('id') id: string) {
    return this.salesOrdersService.findOne(id);
  }

  @Post()
  @RequirePermissions('billing.manage')
  create(@Req() req: any, @Body() body: any) {
    return this.salesOrdersService.create(req.user.id, body);
  }

  @Post(':id/submit')
  @RequirePermissions('billing.manage')
  submit(@Param('id') id: string) {
    return this.salesOrdersService.submit(id);
  }

  @Post(':id/approve')
  @RequirePermissions('billing.approve')
  approve(@Req() req: any, @Param('id') id: string) {
    return this.salesOrdersService.approve(id, req.user.id);
  }

  @Post(':id/reject')
  @RequirePermissions('billing.approve')
  reject(@Req() req: any, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.salesOrdersService.reject(id, req.user.id, body.reason);
  }
}
