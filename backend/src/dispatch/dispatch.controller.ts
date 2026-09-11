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
import { DispatchService } from './dispatch.service';
import { ChallanService } from './challan.service';
import { GatePassService } from './gate-pass.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dispatches')
export class DispatchController {
  constructor(
    private readonly dispatchService: DispatchService,
    private readonly challanService: ChallanService,
    private readonly gatePassService: GatePassService,
  ) {}

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
    return this.gatePassService.authorizeGateOut(id, req.user.id);
  }

  // --- Dynamic Delivery / Dispatch Challan Endpoints ---

  @Get(':id/challan')
  @RequirePermissions('dispatch.view')
  getChallan(@Param('id') id: string) {
    return this.challanService.getOrCreateChallan(id);
  }

  @Post(':id/challan')
  @RequirePermissions('dispatch.manage')
  generateChallan(@Param('id') id: string, @Body() body: any) {
    return this.challanService.getOrCreateChallan(id, body);
  }

  @Get(':id/challan/pdf')
  @RequirePermissions('dispatch.view')
  async downloadChallanPDF(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.challanService.generateChallanPDF(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Delivery_Challan_${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // --- Dynamic Security Gate Pass Endpoints ---

  @Get(':id/gate-pass')
  @RequirePermissions('dispatch.view')
  getGatePass(@Param('id') id: string) {
    return this.gatePassService.getOrCreateGatePass(id);
  }

  @Post(':id/gate-pass')
  @RequirePermissions('dispatch.manage')
  generateGatePass(@Param('id') id: string, @Body() body: any) {
    return this.gatePassService.getOrCreateGatePass(id, body);
  }

  @Get(':id/gate-pass/pdf')
  @RequirePermissions('dispatch.view')
  async downloadGatePassPDF(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.gatePassService.generateGatePassPDF(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Security_Gate_Pass_${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post(':id/gate-pass/verify')
  @RequirePermissions('dispatch.manage')
  verifyGatePass(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.gatePassService.updateVerification(id, body);
  }

  @Post(':id/gate-pass/gate-out')
  @RequirePermissions('dispatch.gate_out')
  gateOutViaGatePass(@Req() req: any, @Param('id') id: string) {
    return this.gatePassService.authorizeGateOut(id, req.user.id);
  }

  // --- Document Relationship & Traceability Chain ---

  @Get(':id/document-chain')
  @RequirePermissions('dispatch.view')
  async getDocumentChain(@Param('id') id: string) {
    const challanData = await this.challanService.getOrCreateChallan(id);
    const gatePassData = await this.gatePassService.getOrCreateGatePass(id);

    return {
      dispatchId: id,
      dispatchNumber: challanData.transaction.dispatchNumber,
      dispatchStatus: challanData.status,
      customer: challanData.consignee.customerName,
      chain: [
        {
          stage: 1,
          name: 'Sales Order',
          code: 'SO',
          number: challanData.transaction.referenceNumber,
          date: challanData.transaction.referenceDate,
          status: 'CONFIRMED',
          details: `Client PO Ref / Order: ${challanData.consignee.customerName}`,
        },
        {
          stage: 2,
          name: 'Dispatch Manifest',
          code: 'DSP',
          number: challanData.transaction.dispatchNumber,
          date: challanData.transaction.dispatchDate,
          status: challanData.status,
          details: `${challanData.summary.totalPackages} Sealed Box Cartons assigned`,
        },
        {
          stage: 3,
          name: 'Delivery Challan',
          code: 'DC',
          number: challanData.challanNumber,
          date: challanData.challanDate,
          status: challanData.status,
          details: `Movement: ${challanData.transaction.movementType} (${challanData.taxSummary.amountInWords})`,
        },
        {
          stage: 4,
          name: 'Tax Invoice',
          code: 'INV',
          number: challanData.transaction.invoiceNumber || 'INV-PENDING',
          date: challanData.transaction.invoiceDate,
          status: challanData.transaction.invoiceNumber ? 'APPROVED' : 'N/A',
          details: `Commercial Value: ₹${challanData.taxSummary.grandTotal.toLocaleString('en-IN')}`,
        },
        {
          stage: 5,
          name: 'E-Way Bill',
          code: 'EWB',
          number: challanData.transaction.ewayBillNumber || '181234567890',
          date: challanData.transaction.ewayBillDate,
          status: challanData.transaction.ewayBillNumber ? 'ACTIVE' : 'NOT_REQUIRED',
          details: `Valid for Distance: ${challanData.transport.approxDistanceKm} KM`,
        },
        {
          stage: 6,
          name: 'Transport LR / GR',
          code: 'LR',
          number: challanData.transport.lrNumber,
          date: challanData.transport.lrDate,
          status: 'BOOKED',
          details: `Carrier: ${challanData.transport.transporterName} | Vehicle: ${challanData.transport.vehicleNumber}`,
        },
        {
          stage: 7,
          name: 'Security Gate Pass',
          code: 'GP',
          number: gatePassData.gatePassNumber,
          date: gatePassData.createdAt,
          status: gatePassData.status,
          details: `Checklist: ${gatePassData.status} | Gate: ${gatePassData.gateNumber}`,
        },
        {
          stage: 8,
          name: 'Gate Out / Transit',
          code: 'GATE_OUT',
          number: gatePassData.movement.exitTime ? 'CLEARED' : 'PENDING',
          date: gatePassData.movement.exitTime || null,
          status: gatePassData.status === 'GATE_OUT' ? 'DISPATCHED' : 'AWAITING_EXIT',
          details: gatePassData.movement.exitTime
            ? `Vehicle left plant at ${new Date(gatePassData.movement.exitTime).toLocaleTimeString('en-IN')}`
            : 'Vehicle parked in loading bay, awaiting gate-out authorization',
        },
      ],
    };
  }
}
