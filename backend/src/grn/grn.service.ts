import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class GrnService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { poId?: string; status?: string }) {
    const where: any = {};
    if (params?.poId) where.purchaseOrderId = params.poId;
    if (params?.status) where.status = params.status;

    return this.prisma.gRN.findMany({
      where,
      include: {
        purchaseOrder: { include: { supplier: true } },
        receivedBy: { select: { firstName: true, lastName: true, email: true } },
        items: {
          include: {
            part: { include: { unit: true } },
            store: true,
            location: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const grn = await this.prisma.gRN.findUnique({
      where: { id },
      include: {
        purchaseOrder: {
          include: {
            supplier: true,
            items: { include: { part: true } },
          },
        },
        receivedBy: { select: { firstName: true, lastName: true, email: true } },
        items: {
          include: {
            part: { include: { unit: true } },
            store: true,
            location: true,
          },
        },
      },
    });
    if (!grn) throw new NotFoundException('GRN not found');
    return grn;
  }

  async create(userId: string, data: {
    purchaseOrderId: string;
    supplierInvoiceNo?: string;
    invoiceDate?: string;
    remarks?: string;
    items: Array<{
      poItemId: string;
      partId: string;
      receivedQty: number;
      acceptedQty: number;
      rejectedQty?: number;
      damagedQty?: number;
      storeId: string;
      locationId?: string;
      batchNumber?: string;
      rejectionReason?: string;
    }>;
  }) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: data.purchaseOrderId },
      include: { items: true },
    });

    if (!po) throw new NotFoundException('Purchase Order not found');
    if (po.status !== 'APPROVED' && po.status !== 'PARTIAL') {
      throw new BadRequestException('PO must be approved before receiving materials');
    }

    // Validate quantities against PO limits
    for (const item of data.items) {
      if (item.receivedQty <= 0) {
        throw new BadRequestException('Received quantity must be greater than 0');
      }
      const poItem = po.items.find((pi) => pi.id === item.poItemId);
      if (!poItem) {
        throw new BadRequestException(`Invalid PO item reference: ${item.poItemId}`);
      }
      const remainingQty = Math.max(0, poItem.orderedQty - poItem.receivedQty);
      if (item.receivedQty > remainingQty) {
        throw new BadRequestException(
          `Received quantity (${item.receivedQty}) exceeds remaining PO quantity (${remainingQty}) for part.`,
        );
      }
      const rejQty = item.rejectedQty || 0;
      if (item.acceptedQty + rejQty > item.receivedQty) {
        throw new BadRequestException(
          `Sum of accepted (${item.acceptedQty}) and rejected (${rejQty}) quantities cannot exceed received quantity (${item.receivedQty}).`,
        );
      }
      if (rejQty > 0 && !item.rejectionReason) {
        throw new BadRequestException('A rejection reason is mandatory when rejected quantity is greater than 0.');
      }
    }

    const count = await this.prisma.gRN.count();
    const grnNumber = `GRN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const grn = await tx.gRN.create({
        data: {
          grnNumber,
          purchaseOrderId: data.purchaseOrderId,
          supplierInvoiceNo: data.supplierInvoiceNo,
          invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
          remarks: data.remarks,
          status: 'DRAFT',
          receivedById: userId,
          items: {
            create: data.items.map((item) => ({
              poItemId: item.poItemId,
              partId: item.partId,
              receivedQty: item.receivedQty,
              acceptedQty: item.acceptedQty,
              rejectedQty: item.rejectedQty || 0,
              damagedQty: item.damagedQty || 0,
              storeId: item.storeId,
              locationId: item.locationId,
              batchNumber: item.batchNumber || `BATCH-${Date.now()}`,
              rejectionReason: item.rejectionReason,
            })),
          },
        },
        include: { items: true },
      });

      return grn;
    });
  }

  async verify(id: string, userId: string) {
    const grn = await this.findOne(id);
    if (grn.status === 'VERIFIED') {
      throw new BadRequestException('GRN is already verified');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Calculate overall verification status
      const hasAccepted = grn.items.some((i) => i.acceptedQty > 0);
      const hasRejected = grn.items.some((i) => (i.rejectedQty || 0) > 0);
      let newStatus = 'VERIFIED';
      if (!hasAccepted && hasRejected) {
        newStatus = 'REJECTED';
      } else if (hasAccepted && hasRejected) {
        newStatus = 'PARTIALLY_ACCEPTED';
      }

      const updatedGrn = await tx.gRN.update({
        where: { id },
        data: {
          status: newStatus,
          verifiedAt: new Date(),
        },
      });

      // 2. Post accepted quantities to Stock & StockMovement
      const supplierId = grn.purchaseOrder.supplierId;

      for (const item of grn.items) {
        if (item.acceptedQty > 0) {
          // Update or create stock balance
          const existingStock = await tx.stock.findFirst({
            where: {
              partId: item.partId,
              storeId: item.storeId,
              locationId: item.locationId || null,
              batchNumber: item.batchNumber || null,
            },
          });

          if (existingStock) {
            await tx.stock.update({
              where: { id: existingStock.id },
              data: {
                quantityOnHand: existingStock.quantityOnHand + item.acceptedQty,
                supplierId: supplierId || existingStock.supplierId,
                lastInwardAt: new Date(),
              },
            });
          } else {
            await tx.stock.create({
              data: {
                partId: item.partId,
                storeId: item.storeId,
                locationId: item.locationId || null,
                batchNumber: item.batchNumber || null,
                quantityOnHand: item.acceptedQty,
                supplierId,
                lastInwardAt: new Date(),
              },
            });
          }

          // Immutable StockMovement ledger
          await tx.stockMovement.create({
            data: {
              partId: item.partId,
              storeId: item.storeId,
              locationId: item.locationId || null,
              movementType: 'GRN_RECEIPT',
              quantity: item.acceptedQty,
              referenceType: 'GRN',
              referenceId: grn.id,
              batchNumber: item.batchNumber,
              supplierId,
              reason: `Material inwarded via GRN #${grn.grnNumber} from ${grn.purchaseOrder.supplier?.name || 'Supplier'}`,
              performedById: userId,
            },
          });

          // Update PO item received quantity
          await tx.purchaseOrderItem.update({
            where: { id: item.poItemId },
            data: { receivedQty: { increment: item.acceptedQty } },
          });
        }
      }

      // 3. Check if all PO items are fulfilled
      const poItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: grn.purchaseOrderId },
      });

      const allFulfilled = poItems.every((item) => item.receivedQty >= item.orderedQty);
      await tx.purchaseOrder.update({
        where: { id: grn.purchaseOrderId },
        data: { status: allFulfilled ? 'COMPLETED' : 'PARTIAL' },
      });

      return updatedGrn;
    });
  }
}
