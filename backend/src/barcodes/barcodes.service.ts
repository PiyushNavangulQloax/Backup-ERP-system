import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as bwipjs from 'bwip-js';
import * as QRCode from 'qrcode';

@Injectable()
export class BarcodesService {
  constructor(private prisma: PrismaService) {}

  async generateBarcodeImage(text: string, bcid: string = 'code128'): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      bwipjs.toBuffer(
        {
          bcid,
          text,
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
  }

  async generateQRCodeImage(text: string): Promise<string> {
    return QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 250,
    });
  }

  async createBarcode(data: {
    code: string;
    symbology?: string;
    entityType: string;
    entityId?: string;
    metadata?: any;
  }) {
    const existing = await this.prisma.barcode.findUnique({
      where: { code: data.code },
    });
    if (existing) throw new BadRequestException(`Barcode ${data.code} already exists`);

    return this.prisma.barcode.create({
      data: {
        code: data.code,
        symbology: data.symbology || 'CODE128',
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        status: 'ACTIVE',
      },
    });
  }

  async findByCode(code: string) {
    const barcode = await this.prisma.barcode.findUnique({ where: { code } });
    if (!barcode) {
      // Check if it matches part or box directly
      const part = await this.prisma.part.findFirst({
        where: { OR: [{ code }, { barcodeValue: code }] },
      });
      if (part) {
        return {
          code,
          entityType: 'PART',
          entity: part,
          status: 'ACTIVE',
        };
      }

      const box = await this.prisma.box.findFirst({
        where: { OR: [{ boxNumber: code }, { barcode: code }] },
        include: { items: { include: { part: true } } },
      });
      if (box) {
        return {
          code,
          entityType: 'BOX',
          entity: box,
          status: box.status,
        };
      }

      throw new NotFoundException(`Barcode or identifier '${code}' not found in system`);
    }

    let entity: any = null;
    if (barcode.entityType === 'PART' && barcode.entityId) {
      entity = await this.prisma.part.findUnique({
        where: { id: barcode.entityId },
        include: { unit: true },
      });
    } else if (barcode.entityType === 'BOX' && barcode.entityId) {
      entity = await this.prisma.box.findUnique({
        where: { id: barcode.entityId },
        include: { items: { include: { part: true } } },
      });
    }

    return { ...barcode, entity };
  }

  async scanBarcode(userId: string, data: {
    code: string;
    scanAction: string; // BOX_PACK, BOX_VERIFY, DISPATCH_VERIFY, AUDIT
    deviceInfo?: string;
    targetBoxId?: string;
    targetDispatchId?: string;
    quantity?: number;
  }) {
    let isSuccess = false;
    let errorMessage: string | null = null;
    let resultData: any = null;

    try {
      const record = await this.findByCode(data.code);

      if (data.scanAction === 'BOX_PACK') {
        if (record.entityType !== 'PART') {
          throw new BadRequestException('Only Part barcodes can be scanned into a box');
        }
        if (!data.targetBoxId) {
          throw new BadRequestException('Target box ID required for packing scan');
        }

        const box = await this.prisma.box.findUnique({ where: { id: data.targetBoxId } });
        if (!box) throw new NotFoundException('Box not found');
        if (box.status !== 'OPEN') {
          throw new BadRequestException(`Cannot pack into a ${box.status} box`);
        }

        const qty = data.quantity || 1;
        const boxItem = await this.prisma.boxItem.create({
          data: {
            boxId: data.targetBoxId,
            partId: record.entity.id,
            quantity: qty,
          },
          include: { part: true },
        });

        resultData = { boxItem, message: `Added ${qty} ${record.entity.name} to box` };
        isSuccess = true;
      } else if (data.scanAction === 'DISPATCH_VERIFY') {
        if (record.entityType !== 'BOX') {
          throw new BadRequestException('Only Box barcodes can be verified for dispatch');
        }
        if (!data.targetDispatchId) {
          throw new BadRequestException('Target dispatch manifest required');
        }

        const dispatchBox = await this.prisma.dispatchBox.findFirst({
          where: { dispatchId: data.targetDispatchId, boxId: record.entity.id },
        });

        if (!dispatchBox) {
          throw new BadRequestException('This box is not assigned to this dispatch manifest');
        }

        await this.prisma.dispatchBox.update({
          where: { id: dispatchBox.id },
          data: { verifiedAt: new Date(), verifiedBy: userId },
        });

        resultData = { verified: true, boxNumber: record.entity.boxNumber };
        isSuccess = true;
      } else {
        // General lookup scan
        resultData = record;
        isSuccess = true;
      }
    } catch (err: any) {
      isSuccess = false;
      errorMessage = err.message || 'Unknown scan validation error';
      throw err;
    } finally {
      // Always persist in BarcodeScanHistory for traceability
      await this.prisma.barcodeScanHistory.create({
        data: {
          barcodeCode: data.code,
          scannedById: userId,
          deviceInfo: data.deviceInfo || 'Handheld Scanner',
          scanAction: data.scanAction,
          isSuccess,
          errorMessage,
        },
      });
    }

    return resultData;
  }

  async getHistory(params?: { code?: string; limit?: number }) {
    const where: any = {};
    if (params?.code) where.barcodeCode = params.code;

    return this.prisma.barcodeScanHistory.findMany({
      where,
      take: params?.limit || 50,
      include: {
        scannedBy: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { scannedAt: 'desc' },
    });
  }
}
