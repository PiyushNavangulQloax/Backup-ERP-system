import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @RequirePermissions('billing.view')
  findAll(
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
  ) {
    return this.invoicesService.findAll({ customerId, status });
  }

  @Get(':id')
  @RequirePermissions('billing.view')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Post()
  @RequirePermissions('billing.manage')
  create(@Req() req: any, @Body() body: any) {
    return this.invoicesService.create(req.user.id, body);
  }

  @Post(':id/approve')
  @RequirePermissions('billing.approve')
  approve(@Param('id') id: string) {
    return this.invoicesService.approve(id);
  }

  @Post(':id/confirm')
  @RequirePermissions('billing.manage')
  confirmPayment(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.invoicesService.confirmPayment(id, req.user.id, body);
  }

  @Get(':id/pdf')
  @RequirePermissions('billing.view')
  async downloadInvoicePDF(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.invoicesService.generateInvoicePDF(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Invoice_${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
