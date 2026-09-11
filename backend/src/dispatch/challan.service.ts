import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as PDFDocument from 'pdfkit';
import * as bwipjs from 'bwip-js';
import * as QRCode from 'qrcode';

// Number to Words in Indian Rupees
export function numberToWordsRupees(num: number): string {
  if (num === 0) return 'Rupees Zero Only';

  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const b = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  function inWords(n: number): string {
    let str = '';
    if (n > 9999999) {
      str += inWords(Math.floor(n / 10000000)) + ' Crore ';
      n %= 10000000;
    }
    if (n > 99999) {
      str += inWords(Math.floor(n / 100000)) + ' Lakh ';
      n %= 100000;
    }
    if (n > 999) {
      str += inWords(Math.floor(n / 1000)) + ' Thousand ';
      n %= 1000;
    }
    if (n > 99) {
      str += inWords(Math.floor(n / 100)) + ' Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (str !== '') str += 'and ';
      if (n < 20) {
        str += a[n];
      } else {
        str += b[Math.floor(n / 10)];
        if (n % 10 > 0) str += ' ' + a[n % 10];
      }
    }
    return str.trim();
  }

  const parts = num.toFixed(2).split('.');
  const whole = parseInt(parts[0], 10);
  const fraction = parseInt(parts[1], 10);

  let result = 'Rupees ' + inWords(whole);
  if (fraction > 0) {
    result += ' and ' + inWords(fraction) + ' Paise';
  }
  result += ' Only';
  return result;
}

@Injectable()
export class ChallanService {
  constructor(private prisma: PrismaService) {}

  // Standard Company / Plant Information
  getCompanyProfile() {
    return {
      companyName: 'APEX MANUFACTURING & ADVANCED LOGISTICS LTD.',
      registeredAddress: 'Plot 42-45, Phase II, Chakan Industrial Area, Pune, Maharashtra 410501, India',
      plantName: 'Plant #01 - Finished Goods & Barcode Fulfillment Center',
      plantAddress: 'Bay 4-7, North Logistics Park, Chakan MIDC, Pune - 410501',
      gstin: '27AABCA1234F1Z5',
      pan: 'AABCA1234F',
      state: 'Maharashtra',
      stateCode: '27',
      cin: 'U29100MH2020PLC123456',
      contactPhone: '+91 (020) 6789-0100',
      contactEmail: 'dispatch@apexmanufacturing.com',
      website: 'www.apexmanufacturing.com',
    };
  }

  async findByDispatchId(dispatchId: string) {
    const challan = await this.prisma.deliveryChallan.findUnique({
      where: { dispatchId },
      include: {
        dispatch: {
          include: {
            customer: true,
            invoice: { include: { items: { include: { part: { include: { unit: true } } } } } },
            transporter: true,
            boxes: {
              include: {
                box: {
                  include: {
                    items: { include: { part: { include: { unit: true } } } },
                  },
                },
              },
            },
            createdBy: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        gatePass: true,
      },
    });
    return challan;
  }

  async getOrCreateChallan(dispatchId: string, options?: {
    documentType?: string;
    movementType?: string;
    reasonForTransport?: string;
    referenceType?: string;
    referenceNumber?: string;
    specialInstructions?: string;
    remarks?: string;
  }) {
    let existing = await this.findByDispatchId(dispatchId);
    if (existing) {
      return this.formatChallanData(existing);
    }

    const dispatch = await this.prisma.dispatch.findUnique({
      where: { id: dispatchId },
      include: { customer: true, invoice: true },
    });

    if (!dispatch) {
      throw new NotFoundException(`Dispatch with ID ${dispatchId} not found`);
    }

    const count = await this.prisma.deliveryChallan.count();
    const challanNumber = `DC-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    const created = await this.prisma.deliveryChallan.create({
      data: {
        challanNumber,
        dispatchId,
        documentType: options?.documentType || 'DELIVERY CHALLAN',
        movementType: options?.movementType || dispatch.movementType || 'Customer Delivery',
        reasonForTransport: options?.reasonForTransport || dispatch.reasonForTransport || 'Supply',
        referenceType: options?.referenceType || dispatch.referenceType || 'Sales Order',
        referenceNumber: options?.referenceNumber || dispatch.referenceNumber || `SO-${dispatch.dispatchNumber.replace('DSP-', '')}`,
        referenceDate: dispatch.referenceDate || dispatch.dispatchDate,
        ewayBillNumber: dispatch.ewayBillNumber || `18${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        ewayBillDate: dispatch.ewayBillDate || dispatch.dispatchDate,
        ewayBillValidUntil: dispatch.ewayBillValidUntil || new Date(Date.now() + 86400000 * 3),
        specialInstructions: options?.specialInstructions || dispatch.specialInstructions || 'Handle with extreme care. Keep dry. Deliver before 6 PM.',
        remarks: options?.remarks || dispatch.remarks || 'Standard verified dispatch. Retain original challan for gate-in and accounts reconciliation.',
        status: 'CONFIRMED',
      },
    });

    const full = await this.findByDispatchId(dispatchId);
    return this.formatChallanData(full!);
  }

  // Format Dynamic Data for Challan Rendering (Hiding empty columns, multi-UOM summaries, amount in words)
  formatChallanData(challanRecord: any) {
    const comp = this.getCompanyProfile();
    const dispatch = challanRecord.dispatch;
    const customer = dispatch?.customer || {};
    const invoice = dispatch?.invoice;

    // Collect all items from boxes or fallback to invoice
    const rawItems: Array<{
      itemCode: string;
      productName: string;
      description?: string;
      hsn?: string;
      batchNumber?: string;
      serialNumber?: string;
      manufacturingDate?: string;
      expiryDate?: string;
      quantity: number;
      uom: string;
      rate: number;
      discount: number;
      taxableValue: number;
      taxRate: number;
      cgst: number;
      sgst: number;
      igst: number;
      totalValue: number;
      warehouse: string;
      boxNumber?: string;
      boxBarcode?: string;
    }> = [];

    let hasBatch = false;
    let hasSerial = false;
    let hasExpiry = false;
    let hasTax = false;
    let totalTaxableValue = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let grandTotal = 0;
    let totalGrossWeight = 0;
    let totalNetWeight = 0;

    const uomQuantities: Record<string, number> = {};

    // 1. Check boxes items
    if (dispatch.boxes && dispatch.boxes.length > 0) {
      dispatch.boxes.forEach((db: any) => {
        const box = db.box;
        if (box) {
          totalGrossWeight += box.grossWeight || 12.5;
          totalNetWeight += box.netWeight || 10.0;

          if (box.items && box.items.length > 0) {
            box.items.forEach((item: any) => {
              const part = item.part || {};
              const uom = part.unit?.symbol || 'PCS';
              const qty = item.quantity || 1;
              const rate = part.standardCost || 500;
              const taxable = qty * rate;
              const taxRate = 18; // Default 18% GST for industrial parts
              const isInterstate = customer.state && customer.state.toLowerCase() !== 'maharashtra';
              const cgst = isInterstate ? 0 : (taxable * (taxRate / 2)) / 100;
              const sgst = isInterstate ? 0 : (taxable * (taxRate / 2)) / 100;
              const igst = isInterstate ? (taxable * taxRate) / 100 : 0;
              const lineTotal = taxable + cgst + sgst + igst;

              if (item.batchNumber) hasBatch = true;
              if (item.serialNumber || (part.partType === 'FINISHED_GOOD' && box.barcode)) {
                // Serial available
              }
              if (taxRate > 0) hasTax = true;

              uomQuantities[uom] = (uomQuantities[uom] || 0) + qty;
              totalTaxableValue += taxable;
              totalCgst += cgst;
              totalSgst += sgst;
              totalIgst += igst;
              grandTotal += lineTotal;

              rawItems.push({
                itemCode: part.code || 'PRT-UNSPECIFIED',
                productName: part.name || 'Manufactured Engineering Goods',
                description: part.description || undefined,
                hsn: part.hsnCode || '84834000',
                batchNumber: item.batchNumber || undefined,
                serialNumber: item.serialNumber || undefined,
                manufacturingDate: item.createdAt ? new Date(item.createdAt).toISOString().slice(0, 10) : undefined,
                expiryDate: undefined,
                quantity: qty,
                uom,
                rate,
                discount: 0,
                taxableValue: taxable,
                taxRate,
                cgst,
                sgst,
                igst,
                totalValue: lineTotal,
                warehouse: 'Main Finished Goods Warehouse',
                boxNumber: box.boxNumber,
                boxBarcode: box.barcode,
              });
            });
          }
        }
      });
    }

    // Fallback if no box items were expanded
    if (rawItems.length === 0 && invoice && invoice.items && invoice.items.length > 0) {
      invoice.items.forEach((item: any) => {
        const part = item.part || {};
        const uom = part.unit?.symbol || 'PCS';
        const qty = item.quantity || 1;
        const rate = item.unitPrice || part.standardCost || 500;
        const taxable = item.lineTotal || qty * rate;
        const taxRate = item.taxRate || 18;
        const isInterstate = customer.state && customer.state.toLowerCase() !== 'maharashtra';
        const cgst = isInterstate ? 0 : (taxable * (taxRate / 2)) / 100;
        const sgst = isInterstate ? 0 : (taxable * (taxRate / 2)) / 100;
        const igst = isInterstate ? (taxable * taxRate) / 100 : 0;
        const lineTotal = taxable + cgst + sgst + igst;

        if (taxRate > 0) hasTax = true;
        uomQuantities[uom] = (uomQuantities[uom] || 0) + qty;
        totalTaxableValue += taxable;
        totalCgst += cgst;
        totalSgst += sgst;
        totalIgst += igst;
        grandTotal += lineTotal;

        rawItems.push({
          itemCode: part.code || 'PRT-UNSPECIFIED',
          productName: part.name || 'Manufactured Item',
          description: part.description || undefined,
          hsn: part.hsnCode || '84834000',
          quantity: qty,
          uom,
          rate,
          discount: 0,
          taxableValue: taxable,
          taxRate,
          cgst,
          sgst,
          igst,
          totalValue: lineTotal,
          warehouse: 'Finished Goods Bay A',
        });
      });
    }

    // Default weight fallbacks
    if (totalGrossWeight === 0) totalGrossWeight = rawItems.length * 25.0;
    if (totalNetWeight === 0) totalNetWeight = rawItems.length * 22.5;

    // Check customer addresses
    const billingAddr = customer.billingAddress || customer.address || 'Registered Commercial Address, India';
    const shippingAddr = customer.shippingAddress || billingAddr;
    const isSameAddress = billingAddr.trim() === shippingAddr.trim();

    // Indian Rupee Amount in Words
    const roundOff = Math.round(grandTotal) - grandTotal;
    const finalAmount = Math.round(grandTotal);
    const amountInWords = numberToWordsRupees(finalAmount);

    return {
      challanId: challanRecord.id,
      challanNumber: challanRecord.challanNumber,
      documentType: challanRecord.documentType,
      challanDate: challanRecord.challanDate,
      status: challanRecord.status,
      version: challanRecord.version,

      // Company / Consignor
      consignor: {
        companyName: comp.companyName,
        registeredAddress: comp.registeredAddress,
        warehouseName: comp.plantName,
        warehouseAddress: comp.plantAddress,
        gstin: comp.gstin,
        pan: comp.pan,
        state: comp.state,
        stateCode: comp.stateCode,
        phone: comp.contactPhone,
        email: comp.contactEmail,
        website: comp.website,
      },

      // Consignee / Ship To
      consignee: {
        customerName: customer.name || 'Consignee Client',
        customerCode: customer.code || 'CUST-001',
        billingAddress: billingAddr,
        shippingAddress: shippingAddr,
        isSameAddress,
        gstin: customer.gstin || '27AABCU9876E1Z9',
        pan: customer.gstin ? customer.gstin.slice(2, 12) : 'AABCU9876E',
        state: customer.state || 'Maharashtra',
        stateCode: customer.stateCode || '27',
        phone: customer.phone || '+91 98765 43210',
        email: customer.email || 'purchase@client.com',
      },

      // Document / Transaction Information
      transaction: {
        dispatchNumber: dispatch.dispatchNumber,
        dispatchDate: dispatch.dispatchDate,
        movementType: challanRecord.movementType,
        reasonForTransport: challanRecord.reasonForTransport,
        referenceType: challanRecord.referenceType,
        referenceNumber: challanRecord.referenceNumber,
        referenceDate: challanRecord.referenceDate,
        invoiceNumber: invoice?.invoiceNumber || undefined,
        invoiceDate: invoice?.invoiceDate || undefined,
        ewayBillNumber: challanRecord.ewayBillNumber || undefined,
        ewayBillDate: challanRecord.ewayBillDate || undefined,
        ewayBillValidUntil: challanRecord.ewayBillValidUntil || undefined,
      },

      // Transport Details (Dynamic)
      transport: {
        transporterName: dispatch.transporter?.name || 'Dedicated Fleet Express',
        transporterGstin: dispatch.transporter?.gstin || '27AABCT9988G1ZQ',
        transporterPhone: dispatch.transporter?.phone || undefined,
        vehicleNumber: dispatch.vehicleNumber || 'MH-12-AB-5050',
        vehicleType: dispatch.vehicleType || 'Covered Container Truck (32 Ft)',
        driverName: dispatch.driverName || 'Ramesh Patil',
        driverPhone: dispatch.driverPhone || '+91 98220 11223',
        driverLicense: dispatch.driverLicense || 'MH12 20180045678',
        transportMode: 'Road',
        lrNumber: dispatch.lrNumber || `LR-${Math.floor(10000 + Math.random() * 90000)}`,
        lrDate: dispatch.dispatchDate,
        destination: customer.shippingAddress || customer.state || 'Pune Hub',
        approxDistanceKm: dispatch.approxDistanceKm || 145,
      },

      // Goods Details & Conditional Visibility Flags
      columnsVisible: {
        hasBatch,
        hasSerial,
        hasExpiry,
        hasTax,
      },
      items: rawItems,

      // Quantity / Weight Summary
      summary: {
        totalLineItems: rawItems.length,
        uomQuantities,
        totalPackages: dispatch.boxes?.length || rawItems.length,
        totalGrossWeightKg: parseFloat(totalGrossWeight.toFixed(2)),
        totalNetWeightKg: parseFloat(totalNetWeight.toFixed(2)),
      },

      // Value & Tax Summary
      taxSummary: {
        hasTax,
        totalTaxableValue: parseFloat(totalTaxableValue.toFixed(2)),
        cgst: parseFloat(totalCgst.toFixed(2)),
        sgst: parseFloat(totalSgst.toFixed(2)),
        igst: parseFloat(totalIgst.toFixed(2)),
        roundOff: parseFloat(roundOff.toFixed(2)),
        grandTotal: finalAmount,
        amountInWords,
      },

      // Document Chain References
      documentReferences: [
        { type: 'Sales Order', number: challanRecord.referenceNumber || 'SO-2026-00125', date: challanRecord.referenceDate },
        { type: 'Dispatch Manifest', number: dispatch.dispatchNumber, date: dispatch.dispatchDate },
        { type: 'Delivery Challan', number: challanRecord.challanNumber, date: challanRecord.challanDate },
        invoice?.invoiceNumber ? { type: 'Tax Invoice', number: invoice.invoiceNumber, date: invoice.invoiceDate } : null,
        challanRecord.ewayBillNumber ? { type: 'E-Way Bill', number: challanRecord.ewayBillNumber, date: challanRecord.ewayBillDate } : null,
        dispatch.lrNumber ? { type: 'Transporter LR/GR', number: dispatch.lrNumber, date: dispatch.dispatchDate } : null,
        challanRecord.gatePass ? { type: 'Security Gate Pass', number: challanRecord.gatePass.gatePassNumber, date: challanRecord.gatePass.createdAt } : null,
      ].filter(Boolean),

      // Instructions
      instructions: {
        specialInstructions: challanRecord.specialInstructions,
        remarks: challanRecord.remarks,
      },

      // Signatures
      signatures: {
        preparedBy: challanRecord.preparedByName || 'Dispatch Officer',
        checkedBy: challanRecord.checkedByName || 'Warehouse Manager',
        authorizedBy: challanRecord.authorizedByName || 'Operations Head',
        receivedBy: challanRecord.receivedByName || 'Authorized Receiver / Consignee',
      },

      // Connected Gate Pass
      gatePass: challanRecord.gatePass,
    };
  }

  // Generate Professional Multi-page A4 PDF using PDFKit
  async generateChallanPDF(dispatchId: string): Promise<Buffer> {
    const data = await this.getOrCreateChallan(dispatchId);

    // Generate Code128 Barcode for Challan Number
    const barcodeBuffer = await new Promise<Buffer>((resolve, reject) => {
      bwipjs.toBuffer(
        {
          bcid: 'code128',
          text: data.challanNumber,
          scale: 3,
          height: 12,
          includetext: true,
          textxalign: 'center',
        },
        (err, png) => {
          if (err) reject(err);
          else resolve(png);
        },
      );
    });

    // Generate QR Code for Document Verification
    const qrPayload = JSON.stringify({
      docType: data.documentType,
      docNo: data.challanNumber,
      dspNo: data.transaction.dispatchNumber,
      customer: data.consignee.customerName,
      items: data.summary.totalLineItems,
      packages: data.summary.totalPackages,
      vehicle: data.transport.vehicleNumber,
      date: new Date(data.challanDate).toISOString().slice(0, 10),
    });

    const qrCodeBuffer = await QRCode.toBuffer(qrPayload, {
      width: 120,
      margin: 1,
      errorCorrectionLevel: 'M',
    });

    return new Promise((resolve) => {
      const doc = new (PDFDocument as any)({
        margin: 36,
        size: 'A4',
        bufferPages: true,
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        // Add page numbers on all buffered pages
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
          doc.switchToPage(i);
          doc
            .fontSize(7.5)
            .fillColor('#64748b')
            .text(
              `Page ${i + 1} of ${range.count}  |  Doc ID: ${data.challanNumber}  |  Generated on: ${new Date().toLocaleString('en-IN')}`,
              36,
              800,
              { align: 'center', width: 524 },
            );
        }
        resolve(Buffer.concat(buffers));
      });

      // SECTION 1: TOP ACCENT BAR & COMPANY HEADER
      doc.rect(0, 0, 595.28, 6).fill('#0f766e');

      // Left: Company Identity
      doc.fontSize(14).fillColor('#0f766e').text(data.consignor.companyName, 36, 20, { bold: true });
      doc.fontSize(8).fillColor('#475569')
        .text(data.consignor.registeredAddress, 36, 38, { width: 340 })
        .text(`Warehouse: ${data.consignor.warehouseName} - ${data.consignor.warehouseAddress}`, 36, 50, { width: 340 })
        .text(
          `GSTIN: ${data.consignor.gstin}  |  PAN: ${data.consignor.pan}  |  State: ${data.consignor.state} (Code: ${data.consignor.stateCode})`,
          36,
          64,
          { width: 340 },
        );

      // Right: Document Title & Barcode
      doc.fontSize(14).fillColor('#0f172a').text(data.documentType, 395, 20, { bold: true, align: 'right' });
      doc.fontSize(8.5).fillColor('#0369a1')
        .text(`Challan No: ${data.challanNumber}`, 395, 36, { bold: true, align: 'right' });
      doc.fillColor('#475569')
        .text(`Date: ${new Date(data.challanDate).toLocaleDateString('en-IN')}`, 395, 48, { align: 'right' });

      // Embed Barcode on top right
      doc.image(barcodeBuffer, 410, 62, { width: 150, height: 35 });

      // Divider Line
      doc.moveTo(36, 102).lineTo(560, 102).strokeColor('#cbd5e1').lineWidth(1).stroke();

      // SECTION 2: DOCUMENT & TRANSACTION INFORMATION BOX
      const infoBoxY = 108;
      doc.rect(36, infoBoxY, 524, 38).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fontSize(7.5).fillColor('#475569');

      // Col 1
      doc.text('Dispatch No:', 44, infoBoxY + 6, { bold: true });
      doc.fillColor('#0f172a').text(data.transaction.dispatchNumber, 105, infoBoxY + 6, { bold: true });
      doc.fillColor('#475569').text('Movement Type:', 44, infoBoxY + 20, { bold: true });
      doc.fillColor('#0f172a').text(data.transaction.movementType, 105, infoBoxY + 20);

      // Col 2
      doc.fillColor('#475569').text('Ref Type / No:', 195, infoBoxY + 6, { bold: true });
      doc.fillColor('#0369a1').text(`${data.transaction.referenceType}: ${data.transaction.referenceNumber}`, 255, infoBoxY + 6, { bold: true });
      doc.fillColor('#475569').text('Transport Reason:', 195, infoBoxY + 20, { bold: true });
      doc.fillColor('#0f172a').text(data.transaction.reasonForTransport, 255, infoBoxY + 20);

      // Col 3
      if (data.transaction.invoiceNumber) {
        doc.fillColor('#475569').text('Invoice Ref:', 390, infoBoxY + 6, { bold: true });
        doc.fillColor('#0369a1').text(data.transaction.invoiceNumber, 440, infoBoxY + 6, { bold: true });
      }
      if (data.transaction.ewayBillNumber) {
        doc.fillColor('#475569').text('E-Way Bill:', 390, infoBoxY + 20, { bold: true });
        doc.fillColor('#0f172a').text(data.transaction.ewayBillNumber, 440, infoBoxY + 20, { bold: true });
      }

      // SECTION 3: FROM / TO INFORMATION (SIDE BY SIDE)
      const fromToY = 152;
      const colW = 256;

      // Consignor (Dispatch From)
      doc.rect(36, fromToY, colW, 70).fillAndStroke('#ffffff', '#cbd5e1');
      doc.rect(36, fromToY, colW, 16).fill('#f1f5f9');
      doc.fontSize(8).fillColor('#0f766e').text('DISPATCH FROM (CONSIGNOR)', 44, fromToY + 4, { bold: true });

      doc.fontSize(7.5).fillColor('#0f172a').text(data.consignor.warehouseName, 44, fromToY + 20, { bold: true });
      doc.fillColor('#475569').text(data.consignor.warehouseAddress, 44, fromToY + 30, { width: 240 });
      doc.text(`GSTIN: ${data.consignor.gstin}  |  State Code: ${data.consignor.stateCode}`, 44, fromToY + 50);

      // Consignee (Ship To)
      const rightColX = 304;
      doc.rect(rightColX, fromToY, colW, 70).fillAndStroke('#ffffff', '#cbd5e1');
      doc.rect(rightColX, fromToY, colW, 16).fill('#f1f5f9');
      doc.fontSize(8).fillColor('#0f766e').text('SHIP TO / CONSIGNEE', rightColX + 8, fromToY + 4, { bold: true });

      doc.fontSize(7.5).fillColor('#0f172a').text(data.consignee.customerName, rightColX + 8, fromToY + 20, { bold: true });
      doc.fillColor('#475569').text(data.consignee.shippingAddress, rightColX + 8, fromToY + 30, { width: 240 });
      doc.text(`GSTIN: ${data.consignee.gstin}  |  State: ${data.consignee.state} (${data.consignee.stateCode})`, rightColX + 8, fromToY + 50);

      // SECTION 4: DYNAMIC ITEM / GOODS TABLE
      let tableY = 228;
      const { hasBatch, hasSerial, hasTax } = data.columnsVisible;

      // Table Header Function
      const renderTableHeader = (currY: number) => {
        doc.rect(36, currY, 524, 18).fill('#1e293b');
        doc.fontSize(7.5).fillColor('#ffffff');
        doc.text('SR', 42, currY + 5, { bold: true });
        doc.text('ITEM CODE & NAME', 65, currY + 5, { bold: true });
        doc.text('HSN', 215, currY + 5, { bold: true });
        if (hasBatch) doc.text('BATCH / LOT', 260, currY + 5, { bold: true });
        if (hasSerial) doc.text('SERIAL NO', 315, currY + 5, { bold: true });
        doc.text('QTY / UOM', 360, currY + 5, { bold: true });
        doc.text('RATE (Rs)', 425, currY + 5, { bold: true, align: 'right', width: 45 });
        doc.text('TOTAL VALUE', 480, currY + 5, { bold: true, align: 'right', width: 70 });
        return currY + 18;
      };

      tableY = renderTableHeader(tableY);

      // Render Table Rows
      data.items.forEach((item: any, idx: number) => {
        // Multi-page check: If table reaches near bottom, add page and repeat header
        if (tableY > 640) {
          doc.addPage();
          doc.rect(0, 0, 595.28, 6).fill('#0f766e');
          doc.fontSize(9).fillColor('#0f766e').text(`${data.documentType} (Contd.) - ${data.challanNumber}`, 36, 18, { bold: true });
          tableY = 36;
          tableY = renderTableHeader(tableY);
        }

        const rowHeight = 22;
        const isAlt = idx % 2 === 1;
        doc.rect(36, tableY, 524, rowHeight).fillAndStroke(isAlt ? '#f8fafc' : '#ffffff', '#e2e8f0');

        doc.fontSize(7.5).fillColor('#334155');
        doc.text(String(idx + 1), 42, tableY + 6);
        doc.fillColor('#0f172a').text(`${item.itemCode} - ${item.productName}`, 65, tableY + 6, { bold: true, width: 145 });
        doc.fillColor('#475569').text(item.hsn || '84834000', 215, tableY + 6);

        if (hasBatch) {
          doc.fillColor('#0f172a').text(item.batchNumber || 'N/A', 260, tableY + 6);
        }
        if (hasSerial) {
          doc.fillColor('#0f172a').text(item.serialNumber || 'N/A', 315, tableY + 6);
        }

        doc.fillColor('#0f766e').text(`${item.quantity} ${item.uom}`, 360, tableY + 6, { bold: true });
        doc.fillColor('#334155').text(`₹${item.rate.toLocaleString('en-IN')}`, 425, tableY + 6, { align: 'right', width: 45 });
        doc.fillColor('#0f172a').text(`₹${item.totalValue.toLocaleString('en-IN')}`, 480, tableY + 6, { bold: true, align: 'right', width: 70 });

        tableY += rowHeight;
      });

      // SECTION 5 & 6: QUANTITY SUMMARY & TAX/VALUE SUMMARY (SIDE BY SIDE)
      if (tableY > 580) {
        doc.addPage();
        doc.rect(0, 0, 595.28, 6).fill('#0f766e');
        tableY = 30;
      } else {
        tableY += 8;
      }

      const summaryBoxH = 76;
      // Quantity Summary (Left)
      doc.rect(36, tableY, colW, summaryBoxH).fillAndStroke('#f0fdf4', '#86efac');
      doc.fontSize(8).fillColor('#166534').text('QUANTITY & WEIGHT SUMMARY', 44, tableY + 6, { bold: true });

      const uomText = Object.entries(data.summary.uomQuantities)
        .map(([u, q]) => `${q} ${u}`)
        .join('  +  ');

      doc.fontSize(7.5).fillColor('#14532d')
        .text(`Total Items: ${data.summary.totalLineItems} Lines`, 44, tableY + 22, { bold: true })
        .text(`Total Dispatched: ${uomText}`, 44, tableY + 34, { bold: true })
        .text(`Total Packages / Boxes: ${data.summary.totalPackages} Units`, 44, tableY + 46)
        .text(`Total Gross Wt: ${data.summary.totalGrossWeightKg} KG  |  Net Wt: ${data.summary.totalNetWeightKg} KG`, 44, tableY + 58);

      // Value & Tax Summary (Right)
      doc.rect(rightColX, tableY, colW, summaryBoxH).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fontSize(8).fillColor('#0f766e').text('VALUE & TAX SUMMARY', rightColX + 8, tableY + 6, { bold: true });

      doc.fontSize(7.5).fillColor('#475569');
      doc.text('Taxable Value:', rightColX + 8, tableY + 20);
      doc.text(`₹${data.taxSummary.totalTaxableValue.toLocaleString('en-IN')}`, rightColX + 160, tableY + 20, { align: 'right', width: 80 });

      if (data.taxSummary.cgst > 0 || data.taxSummary.sgst > 0) {
        doc.text('CGST + SGST (9% + 9%):', rightColX + 8, tableY + 32);
        doc.text(`₹${(data.taxSummary.cgst + data.taxSummary.sgst).toLocaleString('en-IN')}`, rightColX + 160, tableY + 32, { align: 'right', width: 80 });
      } else if (data.taxSummary.igst > 0) {
        doc.text('IGST (18%):', rightColX + 8, tableY + 32);
        doc.text(`₹${data.taxSummary.igst.toLocaleString('en-IN')}`, rightColX + 160, tableY + 32, { align: 'right', width: 80 });
      } else {
        doc.text('Taxes (Non-Taxable Movement):', rightColX + 8, tableY + 32);
        doc.text('₹0.00', rightColX + 160, tableY + 32, { align: 'right', width: 80 });
      }

      doc.fillColor('#0f172a').text('Grand Total:', rightColX + 8, tableY + 50, { bold: true });
      doc.fillColor('#0369a1').text(`₹${data.taxSummary.grandTotal.toLocaleString('en-IN')}`, rightColX + 140, tableY + 50, { bold: true, align: 'right', width: 100 });

      // Amount in Words
      tableY += summaryBoxH + 6;
      doc.rect(36, tableY, 524, 18).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fontSize(7.5).fillColor('#0f172a').text(`Amount in Words: ${data.taxSummary.amountInWords}`, 44, tableY + 5, { bold: true });

      // SECTION 7: TRANSPORT INFORMATION BOX
      tableY += 24;
      doc.rect(36, tableY, 524, 48).fillAndStroke('#ffffff', '#cbd5e1');
      doc.rect(36, tableY, 524, 14).fill('#f1f5f9');
      doc.fontSize(7.5).fillColor('#0f766e').text('TRANSPORT & LOGISTICS INFORMATION', 44, tableY + 3, { bold: true });

      doc.fontSize(7.5).fillColor('#475569');
      // Line 1
      doc.text(`Transporter: `, 44, tableY + 18, { bold: true });
      doc.fillColor('#0f172a').text(data.transport.transporterName, 95, tableY + 18);
      doc.fillColor('#475569').text(`Vehicle No: `, 215, tableY + 18, { bold: true });
      doc.fillColor('#0f172a').text(data.transport.vehicleNumber, 265, tableY + 18, { bold: true });
      doc.fillColor('#475569').text(`Vehicle Type: `, 380, tableY + 18, { bold: true });
      doc.fillColor('#0f172a').text(data.transport.vehicleType, 435, tableY + 18);

      // Line 2
      doc.fillColor('#475569').text(`Driver: `, 44, tableY + 32, { bold: true });
      doc.fillColor('#0f172a').text(`${data.transport.driverName} (${data.transport.driverPhone})`, 80, tableY + 32);
      doc.fillColor('#475569').text(`LR / GR No: `, 215, tableY + 32, { bold: true });
      doc.fillColor('#0369a1').text(data.transport.lrNumber, 265, tableY + 32, { bold: true });
      doc.fillColor('#475569').text(`E-Way Bill: `, 380, tableY + 32, { bold: true });
      doc.fillColor('#0f172a').text(data.transaction.ewayBillNumber || 'N/A', 435, tableY + 32, { bold: true });

      // SECTION 8 & 9: CONNECTED DOCUMENTS & INSTRUCTIONS
      tableY += 54;
      const refBoxH = 34;
      doc.rect(36, tableY, 360, refBoxH).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fontSize(7).fillColor('#0f766e').text('CONNECTED DOCUMENT CHAIN', 44, tableY + 4, { bold: true });

      const chainStr = data.documentReferences.map((r: any) => `${r.type}: ${r.number}`).join('  ➔  ');
      doc.fontSize(6.8).fillColor('#334155').text(chainStr, 44, tableY + 16, { width: 345 });

      // Special Instructions
      doc.rect(404, tableY, 156, refBoxH).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fontSize(7).fillColor('#0f766e').text('SPECIAL INSTRUCTIONS', 412, tableY + 4, { bold: true });
      doc.fontSize(6.8).fillColor('#334155').text(data.instructions.specialInstructions || 'Handle with care.', 412, tableY + 15, { width: 140 });

      // SECTION 10: 4-TIER SIGNATURE SECTION
      tableY += refBoxH + 10;
      const sigColW = 125;
      const sigH = 46;

      const signers = [
        { title: 'PREPARED BY', name: data.signatures.preparedBy, role: 'Dispatch Executive' },
        { title: 'CHECKED BY', name: data.signatures.checkedBy, role: 'Warehouse Manager' },
        { title: 'AUTHORIZED BY', name: data.signatures.authorizedBy, role: 'Operations Incharge' },
        { title: 'RECEIVED BY', name: data.signatures.receivedBy, role: 'Consignee / Stamp' },
      ];

      signers.forEach((s, i) => {
        const x = 36 + i * (sigColW + 8);
        doc.rect(x, tableY, sigColW, sigH).fillAndStroke('#ffffff', '#cbd5e1');
        doc.fontSize(6.5).fillColor('#64748b').text(s.title, x + 6, tableY + 4, { bold: true });
        doc.moveTo(x + 6, tableY + 30).lineTo(x + sigColW - 6, tableY + 30).strokeColor('#cbd5e1').stroke();
        doc.fontSize(7).fillColor('#0f172a').text(s.name, x + 6, tableY + 34, { bold: true });
      });

      // SECTION 11: FOOTER & COMPUTER GENERATED NOTICE
      tableY += sigH + 8;
      doc.fontSize(7).fillColor('#64748b').text('This is a computer-generated Delivery / Dispatch Challan. Valid for Goods Movement under GST rules.', 36, tableY, { align: 'center', width: 524 });

      // Embed QR code on bottom right above footer
      doc.image(qrCodeBuffer, 510, tableY - 48, { width: 42, height: 42 });

      doc.end();
    });
  }
}
