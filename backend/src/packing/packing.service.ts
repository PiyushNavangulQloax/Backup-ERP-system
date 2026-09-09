import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PackingService {
  constructor(private prisma: PrismaService) {}

  async getBoxes(params?: { status?: string }) {
    const where: any = {};
    if (params?.status) where.status = params.status;

    return this.prisma.box.findMany({
      where,
      include: {
        items: { include: { part: { include: { unit: true } } } },
        sealedBy: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBox(id: string) {
    const box = await this.prisma.box.findUnique({
      where: { id },
      include: {
        items: { include: { part: { include: { unit: true } } } },
        sealedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    if (!box) throw new NotFoundException('Box not found');
    return box;
  }

  async createBox(data: {
    notes?: string;
    netWeight?: number;
    grossWeight?: number;
  }) {
    const count = await this.prisma.box.count();
    const boxNumber = `BOX-${String(count + 1).padStart(4, '0')}`;
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const barcode = `BOX-${todayStr}-${String(count + 1).padStart(4, '0')}`;

    const box = await this.prisma.box.create({
      data: {
        boxNumber,
        barcode,
        qrCode: `QR-${barcode}`,
        status: 'OPEN',
        netWeight: data.netWeight,
        grossWeight: data.grossWeight,
        notes: data.notes,
      },
    });

    // Register into Barcode master table
    await this.prisma.barcode.create({
      data: {
        code: barcode,
        symbology: 'CODE128',
        entityType: 'BOX',
        entityId: box.id,
        metadata: JSON.stringify({ boxNumber, status: 'OPEN' }),
        status: 'ACTIVE',
      },
    });

    return box;
  }

  async addItemToBox(boxId: string, data: {
    partId: string;
    quantity: number;
    batchNumber?: string;
    jobCardId?: string;
  }) {
    const box = await this.getBox(boxId);
    if (box.status !== 'OPEN') {
      throw new BadRequestException(`Cannot add items to a box in ${box.status} state`);
    }

    return this.prisma.boxItem.create({
      data: {
        boxId,
        partId: data.partId,
        quantity: data.quantity,
        batchNumber: data.batchNumber,
        jobCardId: data.jobCardId,
      },
      include: { part: true },
    });
  }

  async removeItemFromBox(boxId: string, itemId: string) {
    const box = await this.getBox(boxId);
    if (box.status !== 'OPEN') {
      throw new BadRequestException(`Cannot remove items from a box in ${box.status} state`);
    }

    return this.prisma.boxItem.delete({
      where: { id: itemId },
    });
  }

  async closeAndSealBox(userId: string, boxId: string, data?: { netWeight?: number; grossWeight?: number }) {
    const box = await this.getBox(boxId);
    if (box.status !== 'OPEN') {
      throw new BadRequestException(`Box is already ${box.status}`);
    }
    if (box.items.length === 0) {
      throw new BadRequestException('Cannot seal an empty box');
    }

    return this.prisma.box.update({
      where: { id: boxId },
      data: {
        status: 'SEALED',
        sealedById: userId,
        sealedAt: new Date(),
        netWeight: data?.netWeight ?? box.netWeight,
        grossWeight: data?.grossWeight ?? box.grossWeight,
      },
      include: { items: { include: { part: true } } },
    });
  }

  async reopenBox(boxId: string) {
    const box = await this.getBox(boxId);
    if (box.status === 'DISPATCHED') {
      throw new BadRequestException('Cannot reopen an already dispatched box');
    }

    return this.prisma.box.update({
      where: { id: boxId },
      data: {
        status: 'OPEN',
        sealedById: null,
        sealedAt: null,
      },
    });
  }
}
