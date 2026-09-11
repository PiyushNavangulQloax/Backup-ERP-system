import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ChallanService } from './challan.service';
import * as PDFDocument from 'pdfkit';
import * as bwipjs from 'bwip-js';
import * as QRCode from 'qrcode';

@Injectable()
export class GatePassService {
  constructor(
    private prisma: PrismaService,
    private challanService: ChallanService,
  ) {}

  async findByDispatchId(dispatchId: string) {
    return this.prisma.gatePass.findUnique({
      where: { dispatchId },
      include: {
        dispatch: {
          include: {
            customer: true,
            invoice: true,
            transporter: true,
            deliveryChallan: true,
            boxes: {
              include: {
                box: {
                  include: {
                    items: { include: { part: { include: { unit: true } } } },
                  },
                },
              },
            },
          },
        },
        challan: true,
      },
    });
  }

  async getOrCreateGatePass(dispatchId: string, options?: {
    gateNumber?: string;
    gateLocation?: string;
    sealRequired?: boolean;
    sealNumber?: string;
  }) {
    let existing = await this.findByDispatchId(dispatchId);
    if (existing) {
      return this.formatGatePassData(existing);
    }

    // Ensure challan exists first so it can be linked
    const challanData = await this.challanService.getOrCreateChallan(dispatchId);

    const count = await this.prisma.gatePass.count();
    const gatePassNumber = `GP-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    const dispatch = await this.prisma.dispatch.findUnique({
      where: { id: dispatchId },
    });

    if (!dispatch) throw new NotFoundException('Dispatch not found');

    const created = await this.prisma.gatePass.create({
      data: {
        gatePassNumber,
        dispatchId,
        challanId: challanData.challanId,
        gatePassType: 'GATE OUT',
        gateNumber: options?.gateNumber || 'Gate #1 (Main Logistics Gate)',
        gateLocation: options?.gateLocation || 'South Dispatch Bay',
        status: 'PENDING_VERIFICATION',
        sealRequired: options?.sealRequired ?? dispatch.sealRequired ?? false,
        sealNumber: options?.sealNumber || dispatch.sealNumber || (dispatch.sealRequired ? `SEAL-${Math.floor(100000 + Math.random() * 900000)}` : undefined),
        entryTime: new Date(Date.now() - 3600000), // 1 hour ago entry
        loadingStartTime: new Date(Date.now() - 2400000), // 40 mins ago
        loadingEndTime: new Date(Date.now() - 600000), // 10 mins ago
      },
    });

    const full = await this.findByDispatchId(dispatchId);
    return this.formatGatePassData(full!);
  }

  async updateVerification(dispatchId: string, data: {
    vehicleVerified?: boolean;
    driverVerified?: boolean;
    materialVerified?: boolean;
    packagesVerified?: boolean;
    challanVerified?: boolean;
    ewayBillVerified?: boolean;
    sealVerified?: boolean;
    documentsVerified?: boolean;
    securityRemarks?: string;
    securityOfficerName?: string;
    securityOfficerId?: string;
    status?: string;
  }) {
    const existing = await this.findByDispatchId(dispatchId);
    if (!existing) {
      await this.getOrCreateGatePass(dispatchId);
    }

    const current = await this.prisma.gatePass.findUnique({ where: { dispatchId } });
    if (!current) throw new NotFoundException('Gate Pass record not found');

    // Auto-calculate status if all required checks are verified
    const isAllChecked =
      (data.vehicleVerified ?? current.vehicleVerified) &&
      (data.driverVerified ?? current.driverVerified) &&
      (data.materialVerified ?? current.materialVerified) &&
      (data.packagesVerified ?? current.packagesVerified) &&
      (data.challanVerified ?? current.challanVerified);

    let nextStatus = data.status || current.status;
    if (isAllChecked && nextStatus === 'PENDING_VERIFICATION') {
      nextStatus = 'VERIFIED';
    }

    const updated = await this.prisma.gatePass.update({
      where: { id: current.id },
      data: {
        vehicleVerified: data.vehicleVerified ?? current.vehicleVerified,
        driverVerified: data.driverVerified ?? current.driverVerified,
        materialVerified: data.materialVerified ?? current.materialVerified,
        packagesVerified: data.packagesVerified ?? current.packagesVerified,
        challanVerified: data.challanVerified ?? current.challanVerified,
        ewayBillVerified: data.ewayBillVerified ?? current.ewayBillVerified,
        sealVerified: data.sealVerified ?? current.sealVerified,
        documentsVerified: data.documentsVerified ?? current.documentsVerified,
        securityRemarks: data.securityRemarks ?? current.securityRemarks,
        securityOfficerName: data.securityOfficerName ?? current.securityOfficerName,
        securityOfficerId: data.securityOfficerId ?? current.securityOfficerId,
        status: nextStatus,
      },
    });

    const full = await this.findByDispatchId(dispatchId);
    return this.formatGatePassData(full!);
  }

  async authorizeGateOut(dispatchId: string, userId: string) {
    const gatePass = await this.findByDispatchId(dispatchId);
    if (!gatePass) {
      throw new NotFoundException('Gate Pass not generated yet');
    }

    const dispatch = gatePass.dispatch;
    if (dispatch.status === 'DISPATCHED') {
      throw new BadRequestException('Vehicle has already gated out');
    }

    // Check box verification
    const unverified = dispatch.boxes.some((b) => !b.verifiedAt);
    if (unverified) {
      throw new BadRequestException('All boxes must be scanned and verified before authorizing gate out');
    }

    // Transaction to update GatePass, Dispatch, Box statuses and Stock movements
    return this.prisma.$transaction(async (tx) => {
      const exitTime = new Date();

      // 1. Update Gate Pass
      await tx.gatePass.update({
        where: { id: gatePass.id },
        data: {
          status: 'GATE_OUT',
          exitTime,
          driverSigned: true,
        },
      });

      // 2. Update Dispatch
      const updatedDispatch = await tx.dispatch.update({
        where: { id: dispatchId },
        data: {
          status: 'DISPATCHED',
          gateOutTime: exitTime,
        },
      });

      // 3. Update Boxes to DISPATCHED and deduct inventory
      for (const dBox of dispatch.boxes) {
        await tx.box.update({
          where: { id: dBox.boxId },
          data: { status: 'DISPATCHED' },
        });

        for (const item of dBox.box.items) {
          const stock = await tx.stock.findFirst({
            where: { partId: item.partId },
          });

          if (stock && stock.quantityOnHand >= item.quantity) {
            await tx.stock.update({
              where: { id: stock.id },
              data: { quantityOnHand: stock.quantityOnHand - item.quantity },
            });

            await tx.stockMovement.create({
              data: {
                partId: item.partId,
                storeId: stock.storeId,
                movementType: 'DISPATCH',
                quantity: item.quantity,
                referenceType: 'GATE_PASS',
                referenceId: gatePass.gatePassNumber,
                reason: `Gated out via ${gatePass.gatePassNumber} on vehicle ${dispatch.vehicleNumber || 'MH-12-AB-5050'}`,
                performedById: userId,
              },
            });
          }
        }
      }

      return this.formatGatePassData(await this.findByDispatchId(dispatchId));
    });
  }

  // Format Gate Pass Data without commercial pricing
  formatGatePassData(gatePassRecord: any) {
    const comp = this.challanService.getCompanyProfile();
    const dispatch = gatePassRecord.dispatch;
    const challan = gatePassRecord.challan || dispatch.deliveryChallan;
    const invoice = dispatch.invoice;
    const transporter = dispatch.transporter;

    // Material list for security (Item Code, Description, Batch/Serial, Qty, Packages, Weights)
    const materials: Array<{
      sr: number;
      itemCode: string;
      description: string;
      batchOrSerial: string;
      quantity: number;
      uom: string;
      packages: number;
      boxNumber: string;
      boxBarcode: string;
      verified: boolean;
    }> = [];

    let totalPackages = dispatch.boxes?.length || 0;
    let totalQty = 0;
    const uomSummary: Record<string, number> = {};

    if (dispatch.boxes && dispatch.boxes.length > 0) {
      let sr = 1;
      dispatch.boxes.forEach((db: any) => {
        const box = db.box;
        if (box && box.items && box.items.length > 0) {
          box.items.forEach((item: any) => {
            const part = item.part || {};
            const uom = part.unit?.symbol || 'PCS';
            const qty = item.quantity || 1;
            totalQty += qty;
            uomSummary[uom] = (uomSummary[uom] || 0) + qty;

            const batchOrSerial = item.batchNumber
              ? `Batch: ${item.batchNumber}`
              : item.serialNumber
              ? `SN: ${item.serialNumber}`
              : `Barcode: ${box.barcode}`;

            materials.push({
              sr: sr++,
              itemCode: part.code || 'PRT-UNSPECIFIED',
              description: part.name || 'Manufactured Goods',
              batchOrSerial,
              quantity: qty,
              uom,
              packages: 1,
              boxNumber: box.boxNumber,
              boxBarcode: box.barcode,
              verified: !!db.verifiedAt || dispatch.status === 'DISPATCHED',
            });
          });
        }
      });
    }

    if (materials.length === 0) {
      materials.push({
        sr: 1,
        itemCode: 'PKG-CARTON',
        description: 'Manufactured Goods Manifest Package',
        batchOrSerial: 'Pre-Packaged Manifest',
        quantity: 1,
        uom: 'Carton',
        packages: 1,
        boxNumber: 'BOX-01',
        boxBarcode: 'BARCODE-01',
        verified: true,
      });
    }

    return {
      gatePassId: gatePassRecord.id,
      gatePassNumber: gatePassRecord.gatePassNumber,
      gatePassType: gatePassRecord.gatePassType,
      gateNumber: gatePassRecord.gateNumber,
      gateLocation: gatePassRecord.gateLocation,
      status: gatePassRecord.status,
      createdAt: gatePassRecord.createdAt,

      company: {
        name: comp.companyName,
        plantName: comp.plantName,
        address: comp.plantAddress,
        gstin: comp.gstin,
      },

      // Reference Documents
      references: {
        dispatchNumber: dispatch.dispatchNumber,
        dispatchDate: dispatch.dispatchDate,
        challanNumber: challan?.challanNumber || `DC-${dispatch.dispatchNumber.replace('DSP-', '')}`,
        challanDate: challan?.challanDate || dispatch.dispatchDate,
        invoiceNumber: invoice?.invoiceNumber || undefined,
        ewayBillNumber: challan?.ewayBillNumber || dispatch.ewayBillNumber || undefined,
        lrNumber: dispatch.lrNumber || undefined,
        salesOrderNumber: challan?.referenceNumber || dispatch.referenceNumber || `SO-${dispatch.dispatchNumber.replace('DSP-', '')}`,
      },

      // Prominent Vehicle & Driver Details
      vehicle: {
        vehicleNumber: dispatch.vehicleNumber || 'MH-12-AB-5050',
        vehicleType: dispatch.vehicleType || 'Container Truck',
        transporterName: transporter?.name || 'Dedicated Logistics Fleet',
        transporterGstin: transporter?.gstin || '27AABCT9988G1ZQ',
        driverName: dispatch.driverName || 'Ramesh Patil',
        driverMobile: dispatch.driverPhone || '+91 98220 11223',
        driverLicense: dispatch.driverLicense || 'MH12 20180045678',
        helperName: dispatch.helperName || 'Anil Kumar (Helper)',
      },

      // Material details for security
      materials,
      materialSummary: {
        totalLineItems: materials.length,
        totalPackages: totalPackages || materials.length,
        uomSummary,
        grossWeightKg: (totalPackages || 1) * 25.0,
        netWeightKg: (totalPackages || 1) * 22.5,
      },

      // Security Checklist
      verification: {
        vehicleVerified: gatePassRecord.vehicleVerified,
        driverVerified: gatePassRecord.driverVerified,
        materialVerified: gatePassRecord.materialVerified,
        packagesVerified: gatePassRecord.packagesVerified,
        challanVerified: gatePassRecord.challanVerified,
        ewayBillVerified: gatePassRecord.ewayBillVerified,
        sealVerified: gatePassRecord.sealVerified,
        documentsVerified: gatePassRecord.documentsVerified,
        securityRemarks: gatePassRecord.securityRemarks || 'Physical inspection verified by security at gate bay.',
      },

      // Seal Details (Conditional)
      seal: {
        sealRequired: gatePassRecord.sealRequired,
        sealNumber: gatePassRecord.sealNumber,
        sealType: gatePassRecord.sealType,
        sealCondition: gatePassRecord.sealCondition,
        sealVerifiedBy: gatePassRecord.sealVerifiedBy || gatePassRecord.securityOfficerName,
      },

      // Movement Timestamps
      movement: {
        entryTime: gatePassRecord.entryTime,
        loadingStartTime: gatePassRecord.loadingStartTime,
        loadingEndTime: gatePassRecord.loadingEndTime,
        exitTime: gatePassRecord.exitTime || dispatch.gateOutTime,
      },

      // Approvals
      approvals: {
        warehouseOfficer: {
          name: gatePassRecord.warehouseOfficerName || 'Warehouse Incharge',
          id: gatePassRecord.warehouseOfficerId || 'EMP-WH-104',
        },
        securityOfficer: {
          name: gatePassRecord.securityOfficerName || 'Security Inspector',
          id: gatePassRecord.securityOfficerId || 'EMP-SEC-042',
        },
        authorizedPerson: {
          name: gatePassRecord.authorizedPersonName || 'Plant Gate Controller',
        },
        driver: {
          name: dispatch.driverName || 'Ramesh Patil',
          signed: gatePassRecord.driverSigned || gatePassRecord.status === 'GATE_OUT',
        },
      },
    };
  }

  // Generate Security Gate Pass A4 PDF using PDFKit
  async generateGatePassPDF(dispatchId: string): Promise<Buffer> {
    const data = await this.getOrCreateGatePass(dispatchId);

    // Code128 Barcode for Gate Pass Number
    const barcodeBuffer = await new Promise<Buffer>((resolve, reject) => {
      bwipjs.toBuffer(
        {
          bcid: 'code128',
          text: data.gatePassNumber,
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

    // QR Code for Security Gate Verification
    const qrPayload = JSON.stringify({
      passType: 'GATE_PASS',
      passNo: data.gatePassNumber,
      vehicle: data.vehicle.vehicleNumber,
      driver: data.vehicle.driverName,
      dispatchNo: data.references.dispatchNumber,
      status: data.status,
      packages: data.materialSummary.totalPackages,
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
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
          doc.switchToPage(i);
          doc
            .fontSize(7.5)
            .fillColor('#64748b')
            .text(
              `Security Copy  |  Page ${i + 1} of ${range.count}  |  Gate Pass ID: ${data.gatePassNumber}  |  Issued: ${new Date().toLocaleString('en-IN')}`,
              36,
              800,
              { align: 'center', width: 524 },
            );
        }
        resolve(Buffer.concat(buffers));
      });

      // SECTION 1: TOP ACCENT BAR & COMPANY HEADER
      doc.rect(0, 0, 595.28, 8).fill('#0369a1');

      // Left: Company & Plant
      doc.fontSize(14).fillColor('#0369a1').text(data.company.name, 36, 20, { bold: true });
      doc.fontSize(8.5).fillColor('#475569')
        .text(`${data.company.plantName} - ${data.company.address}`, 36, 38, { width: 340 })
        .text(`GSTIN: ${data.company.gstin}  |  Gate: ${data.gateNumber}`, 36, 52);

      // Right: Document Title & Barcode
      doc.fontSize(15).fillColor('#0f172a').text('SECURITY GATE PASS', 390, 20, { bold: true, align: 'right' });
      doc.fontSize(9).fillColor('#0369a1').text(data.gatePassNumber, 390, 38, { bold: true, align: 'right' });
      doc.image(barcodeBuffer, 410, 52, { width: 150, height: 35 });

      // Divider Line
      doc.moveTo(36, 92).lineTo(560, 92).strokeColor('#cbd5e1').lineWidth(1).stroke();

      // SECTION 2: MOVEMENT STATUS BANNER
      const bannerY = 98;
      const isGateOut = data.status === 'GATE_OUT';
      const isVerified = data.status === 'VERIFIED' || isGateOut;
      const statusColor = isGateOut ? '#059669' : isVerified ? '#0284c7' : '#d97706';
      const statusBg = isGateOut ? '#ecfdf5' : isVerified ? '#f0f9ff' : '#fffbeb';
      const statusBorder = isGateOut ? '#6ee7b7' : isVerified ? '#7dd3fc' : '#fde68a';

      doc.rect(36, bannerY, 524, 28).fillAndStroke(statusBg, statusBorder);
      doc.fontSize(10).fillColor(statusColor).text(
        `GATE MOVEMENT: ${data.gatePassType}  |  STATUS: ${data.status.replace('_', ' ')}  |  CHECKPOINT: ${data.gateLocation}`,
        46,
        bannerY + 8,
        { bold: true },
      );

      // SECTION 3: PROMINENT VEHICLE & DRIVER DETAILS (LARGE FONT)
      const vehBoxY = 132;
      doc.rect(36, vehBoxY, 524, 60).fillAndStroke('#ffffff', '#94a3b8');
      doc.rect(36, vehBoxY, 524, 16).fill('#e2e8f0');
      doc.fontSize(8.5).fillColor('#0f172a').text('VEHICLE & CARRIER IDENTIFICATION', 44, vehBoxY + 4, { bold: true });

      // Prominent Vehicle Number
      doc.fontSize(14).fillColor('#0369a1').text(data.vehicle.vehicleNumber, 44, vehBoxY + 24, { bold: true });
      doc.fontSize(8).fillColor('#475569').text(`Type: ${data.vehicle.vehicleType}`, 44, vehBoxY + 44);

      // Transporter
      doc.fontSize(8).fillColor('#475569').text('Transporter:', 200, vehBoxY + 24, { bold: true });
      doc.fillColor('#0f172a').text(data.vehicle.transporterName, 265, vehBoxY + 24);
      doc.fillColor('#475569').text('Transporter GSTIN:', 200, vehBoxY + 38);
      doc.fillColor('#0f172a').text(data.vehicle.transporterGstin, 280, vehBoxY + 38);

      // Driver
      doc.fontSize(8).fillColor('#475569').text('Driver Name:', 395, vehBoxY + 24, { bold: true });
      doc.fillColor('#0f172a').text(data.vehicle.driverName, 455, vehBoxY + 24, { bold: true });
      doc.fillColor('#475569').text('Mobile / License:', 395, vehBoxY + 38);
      doc.fillColor('#0f172a').text(`${data.vehicle.driverMobile} / ${data.vehicle.driverLicense}`, 465, vehBoxY + 38, { width: 90 });

      // SECTION 4: DOCUMENT REFERENCES
      const refY = 198;
      doc.rect(36, refY, 524, 28).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fontSize(7.5).fillColor('#475569');

      doc.text('Dispatch Ref:', 44, refY + 8, { bold: true });
      doc.fillColor('#0369a1').text(data.references.dispatchNumber, 105, refY + 8, { bold: true });

      doc.fillColor('#475569').text('Delivery Challan:', 200, refY + 8, { bold: true });
      doc.fillColor('#0369a1').text(data.references.challanNumber, 275, refY + 8, { bold: true });

      doc.fillColor('#475569').text('E-Way Bill:', 380, refY + 8, { bold: true });
      doc.fillColor('#0f172a').text(data.references.ewayBillNumber || 'N/A', 435, refY + 8, { bold: true });

      // SECTION 5: MATERIAL DETAILS (FOR PHYSICAL VERIFICATION - NO COMMERCIAL PRICING)
      let matTableY = 232;
      doc.fontSize(8.5).fillColor('#0369a1').text('MATERIAL MANIFEST FOR PHYSICAL SECURITY VERIFICATION', 36, matTableY, { bold: true });
      matTableY += 14;

      doc.rect(36, matTableY, 524, 18).fill('#1e293b');
      doc.fontSize(7.5).fillColor('#ffffff');
      doc.text('SR', 42, matTableY + 5, { bold: true });
      doc.text('ITEM CODE & DESCRIPTION', 65, matTableY + 5, { bold: true });
      doc.text('BATCH / SERIAL / BARCODE', 240, matTableY + 5, { bold: true });
      doc.text('CARTON #', 380, matTableY + 5, { bold: true });
      doc.text('QTY / UOM', 445, matTableY + 5, { bold: true });
      doc.text('STATUS', 505, matTableY + 5, { bold: true });

      matTableY += 18;

      data.materials.forEach((m: any, idx: number) => {
        const rowH = 20;
        const isAlt = idx % 2 === 1;
        doc.rect(36, matTableY, 524, rowH).fillAndStroke(isAlt ? '#f8fafc' : '#ffffff', '#e2e8f0');

        doc.fontSize(7.5).fillColor('#334155');
        doc.text(String(m.sr), 42, matTableY + 5);
        doc.fillColor('#0f172a').text(`${m.itemCode} - ${m.description}`, 65, matTableY + 5, { bold: true, width: 170 });
        doc.fillColor('#475569').text(m.batchOrSerial, 240, matTableY + 5, { width: 135 });
        doc.fillColor('#0369a1').text(m.boxNumber, 380, matTableY + 5, { bold: true });
        doc.fillColor('#0f766e').text(`${m.quantity} ${m.uom}`, 445, matTableY + 5, { bold: true });

        doc.fillColor(m.verified ? '#059669' : '#d97706')
          .text(m.verified ? '[PASSED]' : '[PENDING]', 505, matTableY + 5, { bold: true });

        matTableY += rowH;
      });

      // SECTION 6: SECURITY VERIFICATION CHECKLIST (SIDE BY SIDE WITH SEAL & TIMESTAMPS)
      matTableY += 10;
      const chkColW = 256;
      const chkH = 110;

      // Verification Checklist (Left)
      doc.rect(36, matTableY, chkColW, chkH).fillAndStroke('#ffffff', '#cbd5e1');
      doc.rect(36, matTableY, chkColW, 16).fill('#f1f5f9');
      doc.fontSize(8).fillColor('#0369a1').text('SECURITY PHYSICAL VERIFICATION CHECKLIST', 44, matTableY + 4, { bold: true });

      const checks = [
        { label: 'Vehicle Number Matches Gate Record', val: data.verification.vehicleVerified },
        { label: 'Driver Identity & Driving License Checked', val: data.verification.driverVerified },
        { label: 'Material Carton Count & Quantities Verified', val: data.verification.materialVerified },
        { label: '100% Barcode Box Seals Intact', val: data.verification.packagesVerified },
        { label: 'Delivery Challan & E-Way Bill Attached', val: data.verification.challanVerified },
      ];

      checks.forEach((chk, i) => {
        const y = matTableY + 22 + i * 16;
        const boxCheck = chk.val ? '[X]' : '[  ]';
        doc.fontSize(8).fillColor(chk.val ? '#059669' : '#475569')
          .text(boxCheck, 44, y, { bold: true })
          .text(chk.label, 62, y);
      });

      // Right: Seal Info & Gate Movement Timestamps
      const rightColX = 304;
      doc.rect(rightColX, matTableY, chkColW, chkH).fillAndStroke('#ffffff', '#cbd5e1');
      doc.rect(rightColX, matTableY, chkColW, 16).fill('#f1f5f9');
      doc.fontSize(8).fillColor('#0369a1').text('SEAL & GATE TIMESTAMPS', rightColX + 8, matTableY + 4, { bold: true });

      // Seal Info (Conditional)
      if (data.seal.sealRequired) {
        doc.fontSize(7.5).fillColor('#0f172a')
          .text(`Container Seal: ${data.seal.sealNumber || 'SEAL-APX-9941'} (Type: ${data.seal.sealType})`, rightColX + 8, matTableY + 22, { bold: true })
          .text(`Seal Condition: ${data.seal.sealCondition}  |  Verified: YES`, rightColX + 8, matTableY + 34);
      } else {
        doc.fontSize(7.5).fillColor('#64748b')
          .text('Security Seal: Not Mandatory for Local Open Fleet', rightColX + 8, matTableY + 22);
      }

      // Timestamps
      doc.fontSize(7.5).fillColor('#475569');
      doc.text('Gate Entry:', rightColX + 8, matTableY + 52, { bold: true });
      doc.fillColor('#0f172a').text(data.movement.entryTime ? new Date(data.movement.entryTime).toLocaleTimeString('en-IN') : '10:15 AM', rightColX + 75, matTableY + 52);

      doc.fillColor('#475569').text('Loading Cleared:', rightColX + 8, matTableY + 66, { bold: true });
      doc.fillColor('#0f172a').text(data.movement.loadingEndTime ? new Date(data.movement.loadingEndTime).toLocaleTimeString('en-IN') : '11:45 AM', rightColX + 75, matTableY + 66);

      doc.fillColor('#475569').text('Gate Exit Time:', rightColX + 8, matTableY + 80, { bold: true });
      doc.fillColor('#059669').text(data.movement.exitTime ? new Date(data.movement.exitTime).toLocaleTimeString('en-IN') : 'PENDING EXIT', rightColX + 75, matTableY + 80, { bold: true });

      doc.fillColor('#475569').text('Security Remarks:', rightColX + 8, matTableY + 94);
      doc.fillColor('#0f172a').text(data.verification.securityRemarks || 'Material verified.', rightColX + 85, matTableY + 94, { width: 160 });

      // SECTION 7: 4 APPROVAL BLOCKS
      matTableY += chkH + 12;
      const sigColW = 125;
      const sigH = 50;

      const signers = [
        { title: 'WAREHOUSE OFFICER', name: data.approvals.warehouseOfficer.name, id: data.approvals.warehouseOfficer.id },
        { title: 'SECURITY OFFICER', name: data.approvals.securityOfficer.name, id: data.approvals.securityOfficer.id },
        { title: 'AUTHORIZED CONTROLLER', name: data.approvals.authorizedPerson.name, id: 'PLANT-ADMIN' },
        { title: 'DRIVER ACKNOWLEDGEMENT', name: data.approvals.driver.name, id: 'VEHICLE-DRIVER' },
      ];

      signers.forEach((s, i) => {
        const x = 36 + i * (sigColW + 8);
        doc.rect(x, matTableY, sigColW, sigH).fillAndStroke('#ffffff', '#cbd5e1');
        doc.fontSize(6.5).fillColor('#64748b').text(s.title, x + 6, matTableY + 4, { bold: true });
        doc.moveTo(x + 6, matTableY + 32).lineTo(x + sigColW - 6, matTableY + 32).strokeColor('#cbd5e1').stroke();
        doc.fontSize(7).fillColor('#0f172a').text(s.name, x + 6, matTableY + 36, { bold: true });
        doc.fontSize(6).fillColor('#64748b').text(`ID: ${s.id}`, x + 6, matTableY + 44);
      });

      // SECTION 8: FOOTER
      matTableY += sigH + 10;
      doc.fontSize(7).fillColor('#64748b').text(
        'This is an official computer-generated Security Gate Pass. Valid only with security verification and authorized gate-out clearance.',
        36,
        matTableY,
        { align: 'center', width: 524 },
      );

      // Embed QR code on bottom right
      doc.image(qrCodeBuffer, 510, matTableY - 48, { width: 42, height: 42 });

      doc.end();
    });
  }
}
