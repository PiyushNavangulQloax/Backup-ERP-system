import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SalesOrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { customerId?: string; status?: string }) {
    const where: any = {};
    if (params?.customerId) where.customerId = params.customerId;
    if (params?.status) where.status = params.status;

    return this.prisma.salesOrder.findMany({
      where,
      include: {
        customer: true,
        createdBy: { select: { firstName: true, lastName: true, email: true } },
        approvedBy: { select: { firstName: true, lastName: true, email: true } },
        items: {
          include: {
            part: { include: { unit: true } },
          },
        },
        packingOrders: {
          include: {
            boxes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { select: { firstName: true, lastName: true, email: true } },
        approvedBy: { select: { firstName: true, lastName: true, email: true } },
        items: {
          include: {
            part: { include: { unit: true } },
          },
        },
        packingOrders: {
          include: {
            boxes: { include: { items: { include: { part: true } } } },
          },
        },
        invoices: true,
      },
    });
    if (!order) throw new NotFoundException('Sales Order not found');
    return order;
  }

  async create(userId: string, data: {
    customerId: string;
    requiredDate?: string;
    remarks?: string;
    items: Array<{
      partId: string;
      orderedQty: number;
      rate: number;
      taxRate?: number;
    }>;
  }) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('At least one item is required for a Sales Order');
    }

    const count = await this.prisma.salesOrder.count();
    const orderNumber = `SO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    let totalAmount = 0;
    let taxAmount = 0;

    const itemsToCreate = data.items.map((item) => {
      if (item.orderedQty <= 0) {
        throw new BadRequestException('Ordered quantity must be greater than 0');
      }
      const lineSub = item.orderedQty * item.rate;
      const lineTax = lineSub * ((item.taxRate || 0) / 100);
      const lineTotal = lineSub + lineTax;

      totalAmount += lineSub;
      taxAmount += lineTax;

      return {
        partId: item.partId,
        orderedQty: item.orderedQty,
        rate: item.rate,
        taxRate: item.taxRate || 0,
        lineTotal,
        dispatchedQty: 0,
        pendingQty: item.orderedQty,
      };
    });

    const grandTotal = totalAmount + taxAmount;

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.create({
        data: {
          orderNumber,
          customerId: data.customerId,
          requiredDate: data.requiredDate ? new Date(data.requiredDate) : null,
          remarks: data.remarks,
          totalAmount,
          taxAmount,
          grandTotal,
          status: 'DRAFT',
          createdById: userId,
          items: {
            create: itemsToCreate,
          },
        },
        include: {
          customer: true,
          items: { include: { part: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          module: 'SALES',
          entityName: 'SalesOrder',
          entityId: order.id,
          newData: JSON.stringify({
            orderNumber: order.orderNumber,
            customerId: order.customerId,
            grandTotal: order.grandTotal,
            status: order.status,
          }),
        },
      });

      return order;
    });
  }

  async submit(id: string) {
    const order = await this.findOne(id);
    if (order.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot submit order in ${order.status} state. Only DRAFT orders can be submitted.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.salesOrder.update({
        where: { id },
        data: { status: 'SUBMITTED' },
        include: { customer: true, items: true },
      });

      await tx.auditLog.create({
        data: {
          action: 'SUBMIT',
          module: 'SALES',
          entityName: 'SalesOrder',
          entityId: id,
          oldData: JSON.stringify({ status: order.status }),
          newData: JSON.stringify({ status: 'SUBMITTED' }),
        },
      });

      return updated;
    });
  }

  async approve(id: string, userId: string) {
    const order = await this.findOne(id);
    if (order.status !== 'SUBMITTED') {
      throw new BadRequestException(
        `Cannot approve order in ${order.status} status. Sales Order must be in SUBMITTED status before approval. Direct DRAFT approval is not permitted.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.salesOrder.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: userId,
          approvedAt: new Date(),
        },
        include: { customer: true, items: true },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'APPROVE',
          module: 'SALES',
          entityName: 'SalesOrder',
          entityId: id,
          oldData: JSON.stringify({ status: order.status }),
          newData: JSON.stringify({ status: 'APPROVED', approvedById: userId }),
        },
      });

      return updated;
    });
  }

  async reject(id: string, userId: string, reason?: string) {
    const order = await this.findOne(id);
    if (order.status === 'CANCELLED' || order.status === 'FULFILLED') {
      throw new BadRequestException(`Cannot reject order in ${order.status} state.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.salesOrder.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          remarks: reason ? `${order.remarks || ''} [Rejected: ${reason}]`.trim() : order.remarks,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CANCEL',
          module: 'SALES',
          entityName: 'SalesOrder',
          entityId: id,
          oldData: JSON.stringify({ status: order.status }),
          newData: JSON.stringify({ status: 'CANCELLED', reason }),
        },
      });

      return updated;
    });
  }
}
