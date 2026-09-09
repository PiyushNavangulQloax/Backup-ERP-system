import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { status?: string; supplierId?: string }) {
    const where: any = {};
    if (params?.status) where.status = params.status;
    if (params?.supplierId) where.supplierId = params.supplierId;

    return this.prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        createdBy: { select: { firstName: true, lastName: true, email: true } },
        approvedBy: { select: { firstName: true, lastName: true, email: true } },
        items: { include: { part: { include: { unit: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        items: {
          include: {
            part: { include: { unit: true } },
          },
        },
        grns: {
          include: {
            items: true,
            receivedBy: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async create(userId: string, data: {
    supplierId: string;
    deliveryDate?: string;
    notes?: string;
    items: Array<{
      partId: string;
      orderedQty: number;
      unitPrice: number;
      taxRate: number;
    }>;
  }) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    // Auto-generate PO number
    const count = await this.prisma.purchaseOrder.count();
    const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    let totalAmount = 0;
    let taxAmount = 0;

    const itemsToCreate = data.items.map((item) => {
      const lineSub = item.orderedQty * item.unitPrice;
      const lineTax = lineSub * ((item.taxRate || 0) / 100);
      const lineTotal = lineSub + lineTax;
      totalAmount += lineSub;
      taxAmount += lineTax;

      return {
        partId: item.partId,
        orderedQty: item.orderedQty,
        receivedQty: 0,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate || 0,
        lineTotal,
      };
    });

    const grandTotal = totalAmount + taxAmount;

    return this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: data.supplierId,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
        notes: data.notes,
        status: 'SUBMITTED',
        totalAmount,
        taxAmount,
        grandTotal,
        createdById: userId,
        items: {
          create: itemsToCreate,
        },
      },
      include: {
        supplier: true,
        items: { include: { part: true } },
      },
    });
  }

  async approve(id: string, userId: string) {
    const po = await this.findOne(id);
    if (po.status !== 'SUBMITTED' && po.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot approve PO in ${po.status} status`);
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: userId,
        approvedAt: new Date(),
      },
    });
  }

  async reject(id: string, userId: string, reason: string) {
    const po = await this.findOne(id);
    if (po.status !== 'SUBMITTED' && po.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot reject PO in ${po.status} status`);
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: userId,
        rejectionReason: reason,
        approvedAt: new Date(),
      },
    });
  }
}
