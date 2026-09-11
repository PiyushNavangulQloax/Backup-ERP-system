import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('stock/export-excel')
  @RequirePermissions('reports.export')
  async exportStockExcel(@Res() res: Response) {
    const buffer = await this.reportsService.generateStockExcel();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Stock_Report.xlsx',
    );
    res.send(buffer);
  }

  @Get('po/export-excel')
  @RequirePermissions('reports.export')
  async exportPOExcel(@Res() res: Response) {
    const buffer = await this.reportsService.generatePOExcel();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Purchase_Orders_Report.xlsx',
    );
    res.send(buffer);
  }

  @Get('dispatch/:id/pdf')
  async exportDispatchPDF(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generateDispatchPDF(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename=Dispatch_${id}.pdf`,
    );
    res.send(buffer);
  }
}
