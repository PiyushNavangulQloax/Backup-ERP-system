import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { customerId?: string; status?: string }) {
    const where: any = {};
    if (params?.customerId) where.customerId = params.customerId;
    if (params?.status) where.status = params.status;

    return this.prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        createdBy: { select: { firstName: true, lastName: true } },
        items: { include: { part: true } },
        dispatches: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { select: { firstName: true, lastName: true, email: true } },
        items: { include: { part: { include: { unit: true } } } },
        dispatches: {
          include: {
            transporter: true,
            boxes: { include: { box: { include: { items: { include: { part: true } } } } } },
          },
        },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async create(userId: string, data: {
    customerId: string;
    items: Array<{
      partId: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
    }>;
  }) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('At least one item is required for invoice');
    }

    const count = await this.prisma.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    let subTotal = 0;
    let taxAmount = 0;

    const itemsToCreate = data.items.map((i) => {
      const lineSub = i.quantity * i.unitPrice;
      const lineTax = lineSub * ((i.taxRate || 0) / 100);
      const lineTotal = lineSub + lineTax;
      subTotal += lineSub;
      taxAmount += lineTax;

      return {
        partId: i.partId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        taxRate: i.taxRate || 0,
        lineTotal,
      };
    });

    const grandTotal = subTotal + taxAmount;

    return this.prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: data.customerId,
        subTotal,
        taxAmount,
        grandTotal,
        status: 'DRAFT',
        createdById: userId,
        items: {
          create: itemsToCreate,
        },
      },
      include: { customer: true, items: true },
    });
  }

  async approve(id: string) {
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'APPROVED' },
      include: { customer: true },
    });
  }
}
