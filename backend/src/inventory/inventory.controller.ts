import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @RequirePermissions('inventory.view')
  getStock(
    @Query('partId') partId?: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.inventoryService.getStock({ partId, storeId });
  }

  @Get('ledger')
  @RequirePermissions('inventory.view')
  getLedger(
    @Query('partId') partId?: string,
    @Query('storeId') storeId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getLedger({
      partId,
      storeId,
      limit: limit ? parseInt(limit, 10) : 100,
    });
  }

  @Post('adjust')
  @RequirePermissions('inventory.adjust')
  adjustStock(@Req() req: any, @Body() body: any) {
    return this.inventoryService.adjustStock(req.user.id, body);
  }

  @Post('transfer')
  @RequirePermissions('inventory.manage')
  transferStock(@Req() req: any, @Body() body: any) {
    return this.inventoryService.transferStock(req.user.id, body);
  }
}
