import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async generateStockExcel(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Manufacturing ERP 2.0';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Current Inventory');

    sheet.columns = [
      { header: 'Part Code', key: 'partCode', width: 18 },
      { header: 'Part Name', key: 'partName', width: 32 },
      { header: 'Type', key: 'type', width: 16 },
      { header: 'Store', key: 'store', width: 22 },
      { header: 'Location / Rack', key: 'location', width: 18 },
      { header: 'Batch #', key: 'batch', width: 20 },
      { header: 'Qty On Hand', key: 'qty', width: 14 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Std Cost ($)', key: 'cost', width: 14 },
      { header: 'Total Value ($)', key: 'totalVal', width: 16 },
    ];

    // Format headers
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0D9488' },
    };

    const stocks = await this.prisma.stock.findMany({
      include: {
        part: { include: { unit: true } },
        store: true,
        location: true,
      },
      orderBy: { part: { name: 'asc' } },
    });

    stocks.forEach((s) => {
      const val = s.quantityOnHand * (s.part.standardCost || 0);
      sheet.addRow({
        partCode: s.part.code,
        partName: s.part.name,
        type: s.part.partType,
        store: s.store.name,
        location: s.location ? `${s.location.code} (${s.location.rack || ''})` : 'Main Floor',
        batch: s.batchNumber || 'N/A',
        qty: s.quantityOnHand,
        unit: s.part.unit.symbol,
        cost: s.part.standardCost,
        totalVal: val,
      });
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  async generatePOExcel(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Purchase Orders');

    sheet.columns = [
      { header: 'PO Number', key: 'poNumber', width: 18 },
      { header: 'Supplier', key: 'supplier', width: 28 },
      { header: 'Order Date', key: 'orderDate', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Subtotal ($)', key: 'subTotal', width: 14 },
      { header: 'Tax ($)', key: 'tax', width: 12 },
      { header: 'Grand Total ($)', key: 'grandTotal', width: 16 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };

    const pos = await this.prisma.purchaseOrder.findMany({
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
    });

    pos.forEach((p) => {
      sheet.addRow({
        poNumber: p.poNumber,
        supplier: p.supplier.name,
        orderDate: p.orderDate.toISOString().slice(0, 10),
        status: p.status,
        subTotal: p.totalAmount,
        tax: p.taxAmount,
        grandTotal: p.grandTotal,
      });
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  async generateDispatchPDF(dispatchId: string): Promise<Buffer> {
    const dispatch = await this.prisma.dispatch.findUnique({
      where: { id: dispatchId },
      include: {
        customer: true,
        invoice: true,
        transporter: true,
        boxes: { include: { box: { include: { items: { include: { part: true } } } } } },
      },
    });

    return new Promise((resolve) => {
      const doc = new (PDFDocument as any)({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      // Header
      doc.fontSize(22).fillColor('#0f766e').text('MANUFACTURING ERP 2.0', { align: 'center' });
      doc.fontSize(14).fillColor('#334155').text('DISPATCH CHALLAN & GATE PASS', { align: 'center' });
      doc.moveDown(1.5);

      // Manifest Meta
      doc.fontSize(10).fillColor('#1e293b');
      doc.text(`Dispatch Number: ${dispatch.dispatchNumber}`, { bold: true });
      doc.text(`Date: ${dispatch.dispatchDate.toISOString().slice(0, 10)}`);
      doc.text(`Status: ${dispatch.status}`);
      doc.text(`Customer: ${dispatch.customer.name}`);
      doc.text(`Invoice Ref: ${dispatch.invoice.invoiceNumber}`);
      doc.text(`Transporter: ${dispatch.transporter?.name || 'Self Pickup'}`);
      doc.text(`Vehicle Number: ${dispatch.vehicleNumber || 'N/A'}`);
      doc.text(`Driver Name / Phone: ${dispatch.driverName || 'N/A'} / ${dispatch.driverPhone || 'N/A'}`);
      doc.moveDown(1.5);

      // Boxes Table
      doc.fontSize(12).fillColor('#0f766e').text('Verified Boxes on Shipment:');
      doc.moveDown(0.5);

      dispatch.boxes.forEach((db, idx) => {
        doc.fontSize(10).fillColor('#000000').text(
          `${idx + 1}. Box: ${db.box.boxNumber} | Barcode: ${db.box.barcode} | Verified: ${db.verifiedAt ? 'YES' : 'PENDING'}`,
        );
        db.box.items.forEach((item) => {
          doc.fontSize(9).fillColor('#64748b').text(
            `    - ${item.part.name} (Qty: ${item.quantity})`,
          );
        });
      });

      doc.moveDown(3);
      doc.fontSize(10).fillColor('#334155').text('Authorized Dispatch Signatory: ________________________', { align: 'right' });
      doc.text('Security Gate Out Stamp: ________________________', { align: 'left' });

      doc.end();
    });
  }
}
