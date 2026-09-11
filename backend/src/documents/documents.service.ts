import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { entityType?: string; entityId?: string; search?: string }) {
    const where: any = {};
    if (params?.entityType) where.entityType = params.entityType;
    if (params?.entityId) where.entityId = params.entityId;
    if (params?.search) {
      where.OR = [
        { title: { contains: params.search } },
        { fileName: { contains: params.search } },
      ];
    }

    return this.prisma.document.findMany({
      where,
      orderBy: [{ entityType: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async create(userId: string, data: {
    title: string;
    entityType: string;
    entityId: string;
    fileName: string;
    fileUrl?: string;
    fileSize?: number;
    mimeType?: string;
  }) {
    // Check if previous version exists for this entity to auto-increment version
    const previous = await this.prisma.document.findFirst({
      where: { entityType: data.entityType, entityId: data.entityId, title: data.title },
      orderBy: { version: 'desc' },
    });

    const version = previous ? previous.version + 1 : 1;
    const fileUrl = data.fileUrl || `/storage/uploads/docs/${data.fileName}`;
    const fileSize = data.fileSize || 1024 * 1024;
    const mimeType = data.mimeType || 'application/pdf';

    return this.prisma.document.create({
      data: {
        title: data.title,
        entityType: data.entityType,
        entityId: data.entityId,
        fileName: data.fileName,
        fileUrl,
        fileSize,
        mimeType,
        version,
        uploadedById: userId,
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.document.delete({ where: { id } });
  }

  async getReferences(id: string) {
    // 1. Check if ID is a Dispatch
    const dispatch = await this.prisma.dispatch.findFirst({
      where: { OR: [{ id }, { dispatchNumber: id }] },
      include: {
        customer: true,
        invoice: true,
        deliveryChallan: true,
        gatePass: true,
      },
    });

    if (dispatch) {
      return {
        sourceEntity: 'DISPATCH',
        sourceId: dispatch.id,
        sourceNumber: dispatch.dispatchNumber,
        references: [
          { type: 'Sales Order', number: dispatch.referenceNumber || `SO-${dispatch.dispatchNumber.replace('DSP-', '')}`, status: 'CONFIRMED' },
          { type: 'Dispatch Manifest', number: dispatch.dispatchNumber, status: dispatch.status },
          { type: 'Delivery Challan', number: dispatch.deliveryChallan?.challanNumber || `DC-${dispatch.dispatchNumber.replace('DSP-', '')}`, status: dispatch.deliveryChallan?.status || 'GENERATED' },
          dispatch.invoice ? { type: 'Tax Invoice', number: dispatch.invoice.invoiceNumber, status: dispatch.invoice.status } : null,
          dispatch.ewayBillNumber ? { type: 'E-Way Bill', number: dispatch.ewayBillNumber, status: 'ACTIVE' } : null,
          dispatch.lrNumber ? { type: 'Transport LR', number: dispatch.lrNumber, status: 'BOOKED' } : null,
          dispatch.gatePass ? { type: 'Security Gate Pass', number: dispatch.gatePass.gatePassNumber, status: dispatch.gatePass.status } : null,
        ].filter(Boolean),
      };
    }

    // 2. Check if ID is a DeliveryChallan
    const challan = await this.prisma.deliveryChallan.findFirst({
      where: { OR: [{ id }, { challanNumber: id }] },
      include: {
        dispatch: {
          include: { customer: true, invoice: true, gatePass: true },
        },
        gatePass: true,
      },
    });

    if (challan) {
      return {
        sourceEntity: 'DELIVERY_CHALLAN',
        sourceId: challan.id,
        sourceNumber: challan.challanNumber,
        references: [
          { type: 'Sales Order', number: challan.referenceNumber || 'SO-2026-00125', status: 'CONFIRMED' },
          { type: 'Dispatch Manifest', number: challan.dispatch.dispatchNumber, status: challan.dispatch.status },
          { type: 'Delivery Challan', number: challan.challanNumber, status: challan.status },
          challan.dispatch.invoice ? { type: 'Tax Invoice', number: challan.dispatch.invoice.invoiceNumber, status: challan.dispatch.invoice.status } : null,
          challan.ewayBillNumber ? { type: 'E-Way Bill', number: challan.ewayBillNumber, status: 'ACTIVE' } : null,
          challan.gatePass ? { type: 'Security Gate Pass', number: challan.gatePass.gatePassNumber, status: challan.gatePass.status } : null,
        ].filter(Boolean),
      };
    }

    // Fallback: standard Document search
    const doc = await this.prisma.document.findUnique({ where: { id } });
    return {
      sourceEntity: doc?.entityType || 'DOCUMENT',
      sourceId: id,
      sourceNumber: doc?.title || id,
      references: [],
    };
  }
}
