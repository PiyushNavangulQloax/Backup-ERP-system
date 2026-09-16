import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getStock(params?: { partId?: string; storeId?: string }) {
    const where: any = {};
    if (params?.partId) where.partId = params.partId;
    if (params?.storeId) where.storeId = params.storeId;

    return this.prisma.stock.findMany({
      where,
      include: {
        part: { include: { unit: true, supplier: true } },
        store: true,
        location: true,
        supplier: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getLedger(params?: { partId?: string; storeId?: string; limit?: number }) {
    const where: any = {};
    if (params?.partId) where.partId = params.partId;
    if (params?.storeId) where.storeId = params.storeId;

    return this.prisma.stockMovement.findMany({
      where,
      take: params?.limit || 100,
      include: {
        part: { include: { unit: true, supplier: true } },
        store: true,
        location: true,
        supplier: true,
        performedBy: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async adjustStock(userId: string, data: {
    partId: string;
    storeId: string;
    locationId?: string;
    quantity: number; // positive to add, negative to deduct
    reason: string;
    batchNumber?: string;
    supplierId?: string;
  }) {
    if (!data.quantity || data.quantity === 0) {
      throw new BadRequestException('Adjustment quantity must be non-zero');
    }
    if (!data.reason) {
      throw new BadRequestException('A reason is mandatory for stock adjustment');
    }

    return this.prisma.$transaction(async (tx) => {
      const existingStock = await tx.stock.findFirst({
        where: {
          partId: data.partId,
          storeId: data.storeId,
          locationId: data.locationId || null,
          batchNumber: data.batchNumber || null,
        },
      });

      // Resolve supplier if not directly provided
      let effectiveSupplierId = data.supplierId || null;
      if (!effectiveSupplierId) {
        const part = await tx.part.findUnique({ where: { id: data.partId } });
        effectiveSupplierId = part?.supplierId || existingStock?.supplierId || null;
      }

      const currentQty = existingStock?.quantityOnHand || 0;
      const newQty = currentQty + data.quantity;

      if (newQty < 0) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${currentQty}, Requested adjustment: ${data.quantity}`,
        );
      }

      const isAddition = data.quantity > 0;

      if (existingStock) {
        await tx.stock.update({
          where: { id: existingStock.id },
          data: {
            quantityOnHand: newQty,
            ...(isAddition && effectiveSupplierId ? { supplierId: effectiveSupplierId } : {}),
            ...(isAddition ? { lastInwardAt: new Date() } : {}),
          },
        });
      } else {
        await tx.stock.create({
          data: {
            partId: data.partId,
            storeId: data.storeId,
            locationId: data.locationId || null,
            batchNumber: data.batchNumber || null,
            quantityOnHand: newQty,
            supplierId: effectiveSupplierId,
            lastInwardAt: isAddition ? new Date() : null,
          },
        });
      }

      const movement = await tx.stockMovement.create({
        data: {
          partId: data.partId,
          storeId: data.storeId,
          locationId: data.locationId || null,
          movementType: data.quantity > 0 ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_SUB',
          quantity: Math.abs(data.quantity),
          referenceType: 'MANUAL',
          batchNumber: data.batchNumber,
          supplierId: effectiveSupplierId,
          reason: data.reason,
          performedById: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'ADJUST',
          module: 'STOCK',
          entityName: 'Stock',
          entityId: existingStock?.id || movement.id,
          oldData: JSON.stringify({ quantityOnHand: currentQty }),
          newData: JSON.stringify({
            quantityOnHand: newQty,
            delta: data.quantity,
            reason: data.reason,
            movementType: movement.movementType,
          }),
        },
      });

      return movement;
    });
  }

  async transferStock(userId: string, data: {
    partId: string;
    sourceStoreId: string;
    sourceLocationId?: string;
    targetStoreId: string;
    targetLocationId?: string;
    quantity: number;
    batchNumber?: string;
  }) {
    if (data.quantity <= 0) {
      throw new BadRequestException('Transfer quantity must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      // Deduct from source
      const sourceStock = await tx.stock.findFirst({
        where: {
          partId: data.partId,
          storeId: data.sourceStoreId,
          locationId: data.sourceLocationId || null,
          batchNumber: data.batchNumber || null,
        },
      });

      if (!sourceStock || sourceStock.quantityOnHand < data.quantity) {
        throw new BadRequestException('Insufficient stock at source warehouse');
      }

      await tx.stock.update({
        where: { id: sourceStock.id },
        data: { quantityOnHand: sourceStock.quantityOnHand - data.quantity },
      });

      await tx.stockMovement.create({
        data: {
          partId: data.partId,
          storeId: data.sourceStoreId,
          locationId: data.sourceLocationId || null,
          movementType: 'TRANSFER_OUT',
          quantity: data.quantity,
          referenceType: 'MANUAL',
          batchNumber: data.batchNumber,
          reason: `Internal transfer to target store`,
          performedById: userId,
        },
      });

      // Add to target
      const targetStock = await tx.stock.findFirst({
        where: {
          partId: data.partId,
          storeId: data.targetStoreId,
          locationId: data.targetLocationId || null,
          batchNumber: data.batchNumber || null,
        },
      });

      if (targetStock) {
        await tx.stock.update({
          where: { id: targetStock.id },
          data: { quantityOnHand: targetStock.quantityOnHand + data.quantity },
        });
      } else {
        await tx.stock.create({
          data: {
            partId: data.partId,
            storeId: data.targetStoreId,
            locationId: data.targetLocationId || null,
            batchNumber: data.batchNumber || null,
            quantityOnHand: data.quantity,
          },
        });
      }

      await tx.stockMovement.create({
        data: {
          partId: data.partId,
          storeId: data.targetStoreId,
          locationId: data.targetLocationId || null,
          movementType: 'TRANSFER_IN',
          quantity: data.quantity,
          referenceType: 'MANUAL',
          batchNumber: data.batchNumber,
          reason: `Internal transfer from source store`,
          performedById: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'TRANSFER',
          module: 'STOCK',
          entityName: 'Stock',
          entityId: data.partId,
          newData: JSON.stringify({
            partId: data.partId,
            sourceStoreId: data.sourceStoreId,
            targetStoreId: data.targetStoreId,
            quantity: data.quantity,
          }),
        },
      });

      return { success: true, message: 'Stock transferred successfully' };
    });
  }
}
