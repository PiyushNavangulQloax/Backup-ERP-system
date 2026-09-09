import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Response } from 'express';
import { BarcodesService } from './barcodes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('barcodes')
export class BarcodesController {
  constructor(private readonly barcodesService: BarcodesService) {}

  @Get('image/:code')
  async getBarcodeImage(
    @Param('code') code: string,
    @Res() res: Response,
  ) {
    const png = await this.barcodesService.generateBarcodeImage(code);
    res.setHeader('Content-Type', 'image/png');
    res.send(png);
  }

  @Get('qr/:code')
  async getQRCode(
    @Param('code') code: string,
  ) {
    const dataUrl = await this.barcodesService.generateQRCodeImage(code);
    return { dataUrl };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('history')
  @RequirePermissions('barcode.scan')
  getHistory(
    @Query('code') code?: string,
    @Query('limit') limit?: string,
  ) {
    return this.barcodesService.getHistory({
      code,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':code')
  @RequirePermissions('barcode.scan')
  findByCode(@Param('code') code: string) {
    return this.barcodesService.findByCode(code);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('scan')
  @RequirePermissions('barcode.scan')
  scanBarcode(@Req() req: any, @Body() body: any) {
    return this.barcodesService.scanBarcode(req.user.id, body);
  }
}
