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
import { DispatchService } from './dispatch.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dispatches')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Get()
  @RequirePermissions('dispatch.view')
  findAll(@Query('status') status?: string) {
    return this.dispatchService.findAll({ status });
  }

  @Get(':id')
  @RequirePermissions('dispatch.view')
  findOne(@Param('id') id: string) {
    return this.dispatchService.findOne(id);
  }

  @Post()
  @RequirePermissions('dispatch.manage')
  create(@Req() req: any, @Body() body: any) {
    return this.dispatchService.create(req.user.id, body);
  }

  @Post(':id/verify-box')
  @RequirePermissions('barcode.scan')
  verifyBox(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { boxId: string },
  ) {
    return this.dispatchService.verifyBox(id, body.boxId, req.user.id);
  }

  @Post(':id/gate-out')
  @RequirePermissions('dispatch.gate_out')
  gateOut(@Req() req: any, @Param('id') id: string) {
    return this.dispatchService.gateOut(id, req.user.id);
  }
}
