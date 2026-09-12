import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { customerId?: string; status?: string }) {
    const where: any = {};
    if (params?.customerId) where.customerId = params.customerId;
    if (params?.status) where.status = params.status;

    return this.prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        createdBy: { select: { firstName: true, lastName: true } },
        items: { include: { part: true } },
        dispatches: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { select: { firstName: true, lastName: true, email: true } },
        items: { include: { part: { include: { unit: true } } } },
        dispatches: {
          include: {
            transporter: true,
            boxes: { include: { box: { include: { items: { include: { part: true } } } } } },
          },
        },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async create(userId: string, data: {
    customerId: string;
    items: Array<{
      partId: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
    }>;
  }) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('At least one item is required for invoice');
    }

    const count = await this.prisma.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    let subTotal = 0;
    let taxAmount = 0;

    const itemsToCreate = data.items.map((item) => {
      const lineSub = item.quantity * item.unitPrice;
      const lineTax = lineSub * ((item.taxRate || 0) / 100);
      const lineTotal = lineSub + lineTax;
      subTotal += lineSub;
      taxAmount += lineTax;

      return {
        partId: item.partId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate || 0,
        lineTotal,
      };
    });

    const grandTotal = subTotal + taxAmount;

    return this.prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: data.customerId,
        subTotal,
        taxAmount,
        grandTotal,
        status: 'DRAFT',
        createdById: userId,
        items: {
          create: itemsToCreate,
        },
      },
      include: { customer: true, items: true },
    });
  }

  async approve(id: string) {
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'APPROVED' },
      include: { customer: true },
    });
  }

  async generateInvoicePDF(id: string): Promise<Buffer> {
    const inv = await this.findOne(id);
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    // Header
    doc.fillColor('#0f172a').fontSize(20).text('TAX INVOICE', { align: 'right' });
    doc.fontSize(10).fillColor('#64748b').text(`Invoice #: ${inv.invoiceNumber}`, { align: 'right' });
    doc.text(`Date: ${new Date(inv.invoiceDate).toLocaleDateString('en-IN')}`, { align: 'right' });
    doc.text(`Status: ${inv.status}`, { align: 'right' });
    doc.moveDown(1);

    // Company & Customer details
    doc.fontSize(12).fillColor('#0f172a').text('MANUFACTURING ENTERPRISE 2.0', 40, 50);
    doc.fontSize(9).fillColor('#475569')
       .text('Plant & Logistics Hub: Plot 42, Industrial Zone')
       .text('GSTIN: 27AABCA1234F1Z5 | PAN: AABCA1234F | State: Maharashtra (27)');

    doc.moveDown(2);
    const yStart = doc.y;

    // Bill To Box
    doc.rect(40, yStart, 250, 75).strokeColor('#e2e8f0').stroke();
    doc.fontSize(10).fillColor('#0f172a').text('BILLED TO (BUYER):', 50, yStart + 10);
    doc.fontSize(9).fillColor('#334155')
       .text(inv.customer.name, 50, yStart + 24)
       .text(`GSTIN: ${inv.customer.gstin || 'Unregistered'}`)
       .text(`Phone: ${inv.customer.phone || 'N/A'}`)
       .text(`Billing Address: ${inv.customer.billingAddress || 'N/A'}`);

    // Ship To Box
    doc.rect(305, yStart, 250, 75).strokeColor('#e2e8f0').stroke();
    doc.fontSize(10).fillColor('#0f172a').text('SHIPPED TO (CONSIGNEE):', 315, yStart + 10);
    doc.fontSize(9).fillColor('#334155')
       .text(inv.customer.name, 315, yStart + 24)
       .text(`Shipping Address: ${inv.customer.shippingAddress || inv.customer.billingAddress || 'Same as Billing'}`)
       .text(`Place of Supply: Maharashtra (27)`);

    doc.moveDown(4);

    // Items Table
    const tableTop = doc.y + 20;
    doc.rect(40, tableTop, 515, 22).fillColor('#2563eb').fill();
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
       .text('#', 50, tableTop + 6)
       .text('Description of Goods', 80, tableTop + 6)
       .text('HSN', 260, tableTop + 6)
       .text('Qty', 310, tableTop + 6, { width: 45, align: 'right' })
       .text('Rate (₹)', 365, tableTop + 6, { width: 55, align: 'right' })
       .text('GST %', 430, tableTop + 6, { width: 40, align: 'right' })
       .text('Amount (₹)', 480, tableTop + 6, { width: 65, align: 'right' });

    let currentY = tableTop + 24;
    doc.font('Helvetica');

    inv.items.forEach((item, index) => {
      const isEven = index % 2 === 0;
      if (isEven) {
        doc.rect(40, currentY, 515, 20).fillColor('#f8fafc').fill();
      }
      doc.fillColor('#1e293b').fontSize(8.5)
         .text(`${index + 1}`, 50, currentY + 5)
         .text(`${item.part.code} - ${item.part.name}`, 80, currentY + 5, { width: 175 })
         .text(item.part.hsnCode || '8481', 260, currentY + 5)
         .text(`${item.quantity} ${item.part.unit ? item.part.unit.symbol : ''}`, 310, currentY + 5, { width: 45, align: 'right' })
         .text(`₹${item.unitPrice.toFixed(2)}`, 365, currentY + 5, { width: 55, align: 'right' })
         .text(`${item.taxRate}%`, 430, currentY + 5, { width: 40, align: 'right' })
         .text(`₹${item.lineTotal.toFixed(2)}`, 480, currentY + 5, { width: 65, align: 'right' });
      currentY += 20;
    });

    // Summary Box
    doc.moveDown(2);
    const summaryY = currentY + 15;
    doc.rect(340, summaryY, 215, 65).fillColor('#f1f5f9').fill();
    doc.fillColor('#334155').fontSize(9)
       .text(`Taxable Subtotal:`, 350, summaryY + 8)
       .text(`₹${inv.subTotal.toFixed(2)}`, 460, summaryY + 8, { align: 'right', width: 85 })
       .text(`CGST + SGST:`, 350, summaryY + 24)
       .text(`₹${inv.taxAmount.toFixed(2)}`, 460, summaryY + 24, { align: 'right', width: 85 })
       .font('Helvetica-Bold').fontSize(10).fillColor('#0f172a')
       .text(`Invoice Total:`, 350, summaryY + 44)
       .text(`₹${inv.grandTotal.toFixed(2)}`, 460, summaryY + 44, { align: 'right', width: 85 });

    // Bank Details & Declaration
    doc.font('Helvetica').fontSize(8).fillColor('#64748b')
       .text('Bank Details: HDFC Bank | A/C: 50200012345678 | IFSC: HDFC0001234', 40, summaryY + 85)
       .text('Declaration: We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', 40, summaryY + 100, { width: 515 });

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}
