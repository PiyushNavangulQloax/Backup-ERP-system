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
        part: { include: { unit: true } },
        store: true,
        location: true,
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
        part: { include: { unit: true } },
        store: true,
        location: true,
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

      const currentQty = existingStock?.quantityOnHand || 0;
      const newQty = currentQty + data.quantity;

      if (newQty < 0) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${currentQty}, Requested adjustment: ${data.quantity}`,
        );
      }

      if (existingStock) {
        await tx.stock.update({
          where: { id: existingStock.id },
          data: { quantityOnHand: newQty },
        });
      } else {
        await tx.stock.create({
          data: {
            partId: data.partId,
            storeId: data.storeId,
            locationId: data.locationId || null,
            batchNumber: data.batchNumber || null,
            quantityOnHand: newQty,
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
          reason: data.reason,
          performedById: userId,
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

      return { success: true, message: 'Stock transferred successfully' };
    });
  }
}
