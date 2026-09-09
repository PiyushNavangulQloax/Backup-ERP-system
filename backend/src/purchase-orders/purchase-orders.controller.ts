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
import { PurchaseOrdersService } from './purchase-orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  @Get()
  @RequirePermissions('po.view')
  findAll(
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    return this.poService.findAll({ status, supplierId });
  }

  @Get(':id')
  @RequirePermissions('po.view')
  findOne(@Param('id') id: string) {
    return this.poService.findOne(id);
  }

  @Post()
  @RequirePermissions('po.create')
  create(@Req() req: any, @Body() body: any) {
    return this.poService.create(req.user.id, body);
  }

  @Post(':id/approve')
  @RequirePermissions('po.approve')
  approve(@Param('id') id: string, @Req() req: any) {
    return this.poService.approve(id, req.user.id);
  }

  @Post(':id/reject')
  @RequirePermissions('po.approve')
  reject(@Param('id') id: string, @Req() req: any, @Body() body: { reason: string }) {
    return this.poService.reject(id, req.user.id, body.reason);
  }
}
