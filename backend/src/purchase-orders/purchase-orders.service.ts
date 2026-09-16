import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { status?: string; supplierId?: string }) {
    const where: any = {};
    if (params?.status) where.status = params.status;
    if (params?.supplierId) where.supplierId = params.supplierId;

    return this.prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        createdBy: { select: { firstName: true, lastName: true, email: true } },
        approvedBy: { select: { firstName: true, lastName: true, email: true } },
        items: { include: { part: { include: { unit: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        items: {
          include: {
            part: { include: { unit: true } },
          },
        },
        grns: {
          include: {
            items: true,
            receivedBy: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async create(userId: string, data: {
    supplierId: string;
    deliveryDate?: string;
    notes?: string;
    items: Array<{
      partId: string;
      orderedQty: number;
      unitPrice: number;
      taxRate?: number;
    }>;
  }) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('PO must have at least one line item');
    }

    let subTotal = 0;
    let totalTax = 0;

    const itemsData = data.items.map((item) => {
      const lineSub = item.orderedQty * item.unitPrice;
      const taxRate = item.taxRate || 0;
      const lineTax = (lineSub * taxRate) / 100;
      const lineTotal = lineSub + lineTax;

      subTotal += lineSub;
      totalTax += lineTax;

      return {
        partId: item.partId,
        orderedQty: item.orderedQty,
        unitPrice: item.unitPrice,
        taxRate,
        lineTotal,
      };
    });

    const count = await this.prisma.purchaseOrder.count();
    const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          poNumber,
          supplierId: data.supplierId,
          deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
          notes: data.notes,
          totalAmount: subTotal,
          taxAmount: totalTax,
          grandTotal: subTotal + totalTax,
          createdById: userId,
          status: 'SUBMITTED',
          items: {
            create: itemsData,
          },
        },
        include: {
          supplier: true,
          items: { include: { part: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          module: 'PO',
          entityName: 'PurchaseOrder',
          entityId: po.id,
          newData: JSON.stringify({
            poNumber: po.poNumber,
            supplierId: po.supplierId,
            grandTotal: po.grandTotal,
            status: po.status,
          }),
        },
      });

      return po;
    });
  }

  async approve(id: string, userId: string) {
    const po = await this.findOne(id);
    if (po.status !== 'SUBMITTED' && po.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot approve PO in ${po.status} status`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: userId,
          approvedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'APPROVE',
          module: 'PO',
          entityName: 'PurchaseOrder',
          entityId: id,
          oldData: JSON.stringify({ status: po.status }),
          newData: JSON.stringify({ status: 'APPROVED', approvedById: userId }),
        },
      });

      return updated;
    });
  }

  async reject(id: string, userId: string, reason: string) {
    const po = await this.findOne(id);
    if (po.status !== 'SUBMITTED' && po.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot reject PO in ${po.status} status`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approvedById: userId,
          rejectionReason: reason?.trim() || 'Rejected by authorized reviewer',
          approvedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'REJECT',
          module: 'PO',
          entityName: 'PurchaseOrder',
          entityId: id,
          oldData: JSON.stringify({ status: po.status }),
          newData: JSON.stringify({
            status: 'REJECTED',
            rejectionReason: updated.rejectionReason,
          }),
        },
      });

      return updated;
    });
  }

  async generatePOPDF(id: string): Promise<Buffer> {
    const po = await this.findOne(id);
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    // Header
    doc.fillColor('#0f172a').fontSize(20).text('PURCHASE ORDER', { align: 'right' });
    doc.fontSize(10).fillColor('#64748b').text(`PO #: ${po.poNumber}`, { align: 'right' });
    doc.text(`Date: ${new Date(po.orderDate).toLocaleDateString('en-IN')}`, { align: 'right' });
    doc.text(`Status: ${po.status}`, { align: 'right' });
    doc.moveDown(1);

    // Company & Supplier details
    doc.fontSize(12).fillColor('#0f172a').text('MANUFACTURING ENTERPRISE 2.0', 40, 50);
    doc.fontSize(9).fillColor('#475569')
       .text('Plant & Logistics Hub: Plot 42, Industrial Zone')
       .text('GSTIN: 27AABCA1234F1Z5 | Email: purchase@erp.local');

    doc.moveDown(2);
    const yStart = doc.y;

    // Supplier Info Box
    doc.rect(40, yStart, 250, 75).strokeColor('#e2e8f0').stroke();
    doc.fontSize(10).fillColor('#0f172a').text('VENDOR / SUPPLIER:', 50, yStart + 10);
    doc.fontSize(9).fillColor('#334155')
       .text(po.supplier.name, 50, yStart + 24)
       .text(`GSTIN: ${po.supplier.gstin || 'N/A'}`)
       .text(`Phone: ${po.supplier.phone || 'N/A'}`)
       .text(`Address: ${po.supplier.address || 'N/A'}`);

    // Order Info Box
    doc.rect(305, yStart, 250, 75).strokeColor('#e2e8f0').stroke();
    doc.fontSize(10).fillColor('#0f172a').text('DELIVERY & TERMS:', 315, yStart + 10);
    doc.fontSize(9).fillColor('#334155')
       .text(`Delivery Date: ${po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('en-IN') : 'Immediate'}`)
       .text(`Payment Terms: ${po.supplier.paymentTerms || 'Standard Net 30'}`)
       .text(`Created By: ${po.createdBy ? `${po.createdBy.firstName} ${po.createdBy.lastName}` : 'System'}`)
       .text(`Approved By: ${po.approvedBy ? `${po.approvedBy.firstName} ${po.approvedBy.lastName}` : 'Pending'}`);

    doc.moveDown(4);

    // Items Table
    const tableTop = doc.y + 20;
    doc.rect(40, tableTop, 515, 22).fillColor('#0d9488').fill();
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
       .text('#', 50, tableTop + 6)
       .text('Part Code & Description', 80, tableTop + 6)
       .text('Qty', 310, tableTop + 6, { width: 50, align: 'right' })
       .text('Unit Price', 370, tableTop + 6, { width: 60, align: 'right' })
       .text('Tax %', 440, tableTop + 6, { width: 40, align: 'right' })
       .text('Total', 490, tableTop + 6, { width: 55, align: 'right' });

    let currentY = tableTop + 24;
    doc.font('Helvetica');

    po.items.forEach((item, index) => {
      const isEven = index % 2 === 0;
      if (isEven) {
        doc.rect(40, currentY, 515, 20).fillColor('#f8fafc').fill();
      }
      doc.fillColor('#1e293b').fontSize(8.5)
         .text(`${index + 1}`, 50, currentY + 5)
         .text(`${item.part.code} - ${item.part.name}`, 80, currentY + 5, { width: 220 })
         .text(`${item.orderedQty} ${item.part.unit ? item.part.unit.symbol : ''}`, 310, currentY + 5, { width: 50, align: 'right' })
         .text(`₹${item.unitPrice.toFixed(2)}`, 370, currentY + 5, { width: 60, align: 'right' })
         .text(`${item.taxRate}%`, 440, currentY + 5, { width: 40, align: 'right' })
         .text(`₹${item.lineTotal.toFixed(2)}`, 490, currentY + 5, { width: 55, align: 'right' });
      currentY += 20;
    });

    // Summary Box
    doc.moveDown(2);
    const summaryY = currentY + 15;
    doc.rect(340, summaryY, 215, 65).fillColor('#f1f5f9').fill();
    doc.fillColor('#334155').fontSize(9)
       .text(`Subtotal:`, 350, summaryY + 8)
       .text(`₹${po.totalAmount.toFixed(2)}`, 460, summaryY + 8, { align: 'right', width: 85 })
       .text(`Tax Total:`, 350, summaryY + 24)
       .text(`₹${po.taxAmount.toFixed(2)}`, 460, summaryY + 24, { align: 'right', width: 85 })
       .font('Helvetica-Bold').fontSize(10).fillColor('#0f172a')
       .text(`Grand Total:`, 350, summaryY + 44)
       .text(`₹${po.grandTotal.toFixed(2)}`, 460, summaryY + 44, { align: 'right', width: 85 });

    // Terms & Signatures
    doc.font('Helvetica').fontSize(8).fillColor('#64748b')
       .text('Terms & Conditions: Material must be accompanied by Test Certificate and Tax Invoice. Delivery subject to standard incoming quality inspection.', 40, summaryY + 85, { width: 300 });

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}
