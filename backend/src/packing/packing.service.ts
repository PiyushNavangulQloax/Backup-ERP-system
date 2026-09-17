import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PackingService {
  constructor(private prisma: PrismaService) {}

  private get db(): any {
    return this.prisma;
  }

  async getBoxes(params?: { status?: string; packingOrderId?: string }) {
    const where: any = {};
    if (params?.status) where.status = params.status;
    if (params?.packingOrderId) where.packingOrderId = params.packingOrderId;

    return this.prisma.box.findMany({
      where,
      include: {
        items: { include: { part: { include: { unit: true } } } },
        sealedBy: { select: { firstName: true, lastName: true, email: true } },
        packingOrder: { select: { id: true, orderNumber: true, status: true } },
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
        packingOrder: {
          include: {
            salesOrder: { include: { customer: true } },
            items: { include: { part: true } },
          },
        },
      },
    });
    if (!box) throw new NotFoundException('Box not found');
    return box;
  }

  async createBox(data: {
    notes?: string;
    netWeight?: number;
    grossWeight?: number;
    packingOrderId?: string;
  }) {
    if (data.packingOrderId) {
      const pOrder = await this.db.packingOrder.findUnique({
        where: { id: data.packingOrderId },
        include: { salesOrder: true },
      });
      if (!pOrder) {
        throw new NotFoundException('Packing Order not found');
      }
      if (pOrder.status === 'COMPLETED' || pOrder.status === 'CANCELLED') {
        throw new BadRequestException(
          `Cannot create box against a ${pOrder.status} Packing Order`,
        );
      }
      if (
        pOrder.salesOrder &&
        pOrder.salesOrder.status !== 'APPROVED' &&
        pOrder.salesOrder.status !== 'PARTIALLY_FULFILLED'
      ) {
        throw new BadRequestException(
          `Sales Order is not approved (status: ${pOrder.salesOrder.status})`,
        );
      }
    }

    const count = await this.prisma.box.count();
    const boxNumber = `BOX-${String(count + 1).padStart(4, '0')}`;
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const barcode = `BOX-${todayStr}-${String(count + 1).padStart(4, '0')}`;

    const createData: any = {
      boxNumber,
      barcode,
      qrCode: `QR-${barcode}`,
      status: 'OPEN',
      netWeight: data.netWeight,
      grossWeight: data.grossWeight,
      notes: data.notes,
    };
    if (data.packingOrderId) {
      createData.packingOrderId = data.packingOrderId;
    }

    const box = await (this.prisma.box.create as any)({
      data: createData,
      include: {
        packingOrder: { select: { id: true, orderNumber: true } },
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
    if (!data.quantity || data.quantity <= 0) {
      throw new BadRequestException('Packing quantity must be greater than 0');
    }

    const box = await this.getBox(boxId);
    if (box.status !== 'OPEN') {
      throw new BadRequestException(`Cannot add items to a box in ${box.status} state`);
    }

    // 1. Mandatory stock validation: Cannot pack more than available finished goods stock
    const stockAgg = await this.prisma.stock.aggregate({
      where: { partId: data.partId },
      _sum: { quantityOnHand: true },
    });
    const available = stockAgg._sum.quantityOnHand || 0;

    if (available < data.quantity) {
      const part = await this.prisma.part.findUnique({ where: { id: data.partId } });
      throw new BadRequestException(
        `Insufficient finished-goods stock for part '${part?.name || data.partId}'. Available: ${available}, requested: ${data.quantity}. Packing rejected.`,
      );
    }

    const boxAny = box as any;
    // 2. If box belongs to a PackingOrder, ensure part is authorized and doesn't exceed requiredQty
    if (boxAny.packingOrderId) {
      const pItem = await this.db.packingOrderItem.findFirst({
        where: { packingOrderId: boxAny.packingOrderId, partId: data.partId },
      });
      if (!pItem) {
        throw new BadRequestException(
          `Part is not authorized for Packing Order '${boxAny.packingOrderId}'.`,
        );
      }
      if (pItem.packedQty + data.quantity > pItem.requiredQty) {
        throw new BadRequestException(
          `Packing quantity (${data.quantity}) exceeds remaining order requirement (${pItem.pendingQty}).`,
        );
      }
    }

    return this.prisma.$transaction(async (tx: any) => {
      const boxItem = await tx.boxItem.create({
        data: {
          boxId,
          partId: data.partId,
          quantity: data.quantity,
          batchNumber: data.batchNumber,
          jobCardId: data.jobCardId,
        },
        include: { part: true },
      });

      // Update PackingOrderItem if linked
      if (boxAny.packingOrderId) {
        const pItem = await tx.packingOrderItem.findFirst({
          where: { packingOrderId: boxAny.packingOrderId, partId: data.partId },
        });
        if (pItem) {
          const newPacked = pItem.packedQty + data.quantity;
          await tx.packingOrderItem.update({
            where: { id: pItem.id },
            data: {
              packedQty: newPacked,
              pendingQty: Math.max(0, pItem.requiredQty - newPacked),
            },
          });

          await tx.packingOrder.update({
            where: { id: boxAny.packingOrderId },
            data: { status: 'IN_PROGRESS' },
          });
        }
      }

      return boxItem;
    });
  }

  async removeItemFromBox(boxId: string, itemId: string) {
    const box = await this.getBox(boxId);
    if (box.status !== 'OPEN') {
      throw new BadRequestException(`Cannot remove items from a box in ${box.status} state`);
    }

    const item = await this.prisma.boxItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Box item not found');

    const boxAny = box as any;
    return this.prisma.$transaction(async (tx: any) => {
      if (boxAny.packingOrderId) {
        const pItem = await tx.packingOrderItem.findFirst({
          where: { packingOrderId: boxAny.packingOrderId, partId: item.partId },
        });
        if (pItem) {
          const newPacked = Math.max(0, pItem.packedQty - item.quantity);
          await tx.packingOrderItem.update({
            where: { id: pItem.id },
            data: {
              packedQty: newPacked,
              pendingQty: pItem.requiredQty - newPacked,
            },
          });
        }
      }

      return tx.boxItem.delete({ where: { id: itemId } });
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

    const boxAny = box as any;
    return this.prisma.$transaction(async (tx: any) => {
      const updatedBox = await tx.box.update({
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

      // If linked to packing order, check if packing order is completed
      if (boxAny.packingOrderId) {
        const orderItems = await tx.packingOrderItem.findMany({
          where: { packingOrderId: boxAny.packingOrderId },
        });
        const allPacked = orderItems.every((oi: any) => oi.pendingQty <= 0);
        if (allPacked) {
          await tx.packingOrder.update({
            where: { id: boxAny.packingOrderId },
            data: { status: 'COMPLETED' },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'SEAL',
          module: 'PACKING',
          entityName: 'Box',
          entityId: boxId,
          oldData: JSON.stringify({ status: box.status }),
          newData: JSON.stringify({
            status: 'SEALED',
            boxNumber: box.boxNumber,
            itemCount: box.items.length,
          }),
        },
      });

      return updatedBox;
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

  // ---------------------------------------------------------------------------
  // Packing Orders
  // ---------------------------------------------------------------------------
  async getPackingOrders(params?: { salesOrderId?: string; status?: string }) {
    const where: any = {};
    if (params?.salesOrderId) where.salesOrderId = params.salesOrderId;
    if (params?.status) where.status = params.status;

    return this.db.packingOrder.findMany({
      where,
      include: {
        salesOrder: { include: { customer: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        items: { include: { part: { include: { unit: true } } } },
        boxes: { include: { items: { include: { part: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPackingOrder(id: string) {
    const order = await this.db.packingOrder.findUnique({
      where: { id },
      include: {
        salesOrder: { include: { customer: true } },
        createdBy: { select: { firstName: true, lastName: true, email: true } },
        items: { include: { part: { include: { unit: true } } } },
        boxes: { include: { items: { include: { part: true } } } },
      },
    });
    if (!order) throw new NotFoundException('Packing Order not found');
    return order;
  }

  async createPackingOrder(userId: string, data: {
    salesOrderId?: string;
    notes?: string;
    items: Array<{ partId: string; requiredQty: number }>;
  }) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Packing order requires at least one line item');
    }

    const count = await this.db.packingOrder.count();
    const orderNumber = `PKO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    return this.db.packingOrder.create({
      data: {
        orderNumber,
        salesOrderId: data.salesOrderId,
        notes: data.notes,
        status: 'RELEASED',
        createdById: userId,
        items: {
          create: data.items.map((i) => ({
            partId: i.partId,
            requiredQty: i.requiredQty,
            packedQty: 0,
            pendingQty: i.requiredQty,
          })),
        },
      },
      include: { items: { include: { part: true } } },
    });
  }
}
