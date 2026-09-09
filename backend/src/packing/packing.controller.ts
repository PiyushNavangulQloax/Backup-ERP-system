import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PackingService } from './packing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('packing')
export class PackingController {
  constructor(private readonly packingService: PackingService) {}

  @Get('boxes')
  @RequirePermissions('packing.view')
  getBoxes(@Query('status') status?: string) {
    return this.packingService.getBoxes({ status });
  }

  @Get('boxes/:id')
  @RequirePermissions('packing.view')
  getBox(@Param('id') id: string) {
    return this.packingService.getBox(id);
  }

  @Post('boxes')
  @RequirePermissions('packing.manage')
  createBox(@Body() body: any) {
    return this.packingService.createBox(body);
  }

  @Post('boxes/:id/items')
  @RequirePermissions('packing.manage')
  addItemToBox(@Param('id') boxId: string, @Body() body: any) {
    return this.packingService.addItemToBox(boxId, body);
  }

  @Delete('boxes/:boxId/items/:itemId')
  @RequirePermissions('packing.manage')
  removeItemFromBox(
    @Param('boxId') boxId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.packingService.removeItemFromBox(boxId, itemId);
  }

  @Post('boxes/:id/close')
  @RequirePermissions('packing.close')
  closeAndSealBox(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.packingService.closeAndSealBox(req.user.id, id, body);
  }

  @Post('boxes/:id/reopen')
  @RequirePermissions('packing.close')
  reopenBox(@Param('id') id: string) {
    return this.packingService.reopenBox(id);
  }
}
