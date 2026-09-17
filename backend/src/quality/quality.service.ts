import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { CompleteInspectionDto } from './dto/complete-inspection.dto';

@Injectable()
export class QualityService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    status?: string;
    decision?: string;
    sourceType?: string;
    partId?: string;
  }) {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.decision) where.decision = params.decision;
    if (params.sourceType) where.sourceType = params.sourceType;
    if (params.partId) where.partId = params.partId;

    return this.prisma.qualityInspection.findMany({
      where,
      include: {
        part: { include: { unit: true } },
        grn: true,
        grnItem: true,
        jobCard: true,
        inspectedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const inspection = await this.prisma.qualityInspection.findUnique({
      where: { id },
      include: {
        part: { include: { unit: true } },
        grn: true,
        grnItem: true,
        jobCard: true,
        inspectedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!inspection) {
      throw new NotFoundException(`Quality inspection with ID ${id} not found`);
    }

    return inspection;
  }

  async create(userId: string, data: CreateInspectionDto) {
    // Normalize source type
    const sourceType = String(data.sourceType || '').trim().toUpperCase() as 'INCOMING_GRN' | 'PRODUCTION_OUTPUT';
    if (sourceType !== 'INCOMING_GRN' && sourceType !== 'PRODUCTION_OUTPUT') {
      throw new BadRequestException(`Unsupported source type: ${data.sourceType}`);
    }

    // RULE-Q01: inspectedQty > 0
    if (!data.inspectedQty || data.inspectedQty <= 0) {
      throw new BadRequestException('Inspected quantity must be greater than 0');
    }

    let grnId: string | null = null;
    let grnItemId: string | null = null;
    let jobCardId: string | null = null;
    let resolvedPartId: string = data.partId || '';
    const sourceId = data.sourceId || data.grnId || data.jobCardId || null;

    // RULE-Q09: Source validation
    if (sourceType === 'INCOMING_GRN') {
      grnId = data.grnId || data.sourceId || null;
      if (!grnId) {
        throw new BadRequestException('GRN ID is required for INCOMING_GRN source type');
      }

      const grn = await this.prisma.gRN.findUnique({
        where: { id: grnId },
        include: { items: true },
      });
      if (!grn) {
        throw new NotFoundException(`GRN with ID ${grnId} not found`);
      }

      let grnItem: any = null;
      if (data.grnItemId) {
        grnItem = grn.items.find((item) => item.id === data.grnItemId);
        if (!grnItem) {
          throw new NotFoundException(`GRN item with ID ${data.grnItemId} not found in GRN ${grnId}`);
        }
      } else if (data.partId) {
        grnItem = grn.items.find((item) => item.partId === data.partId);
        if (!grnItem) {
          throw new BadRequestException(`No item found for Part ${data.partId} in GRN ${grnId}`);
        }
      } else if (grn.items.length === 1) {
        grnItem = grn.items[0];
      } else {
        throw new BadRequestException('Please specify a partId or grnItemId for the inspection');
      }

      resolvedPartId = grnItem.partId;
      if (data.partId && grnItem.partId !== data.partId) {
        throw new BadRequestException('Part ID does not match the GRN item part');
      }

      grnItemId = grnItem.id;

      // Check existing inspections for this GRN item
      const existingInspections = await this.prisma.qualityInspection.findMany({
        where: { grnItemId: grnItem.id },
      });
      const currentTotalInspected = existingInspections.reduce((sum, i) => sum + i.inspectedQty, 0);

      if (currentTotalInspected + data.inspectedQty > grnItem.receivedQty + 0.0001) {
        throw new BadRequestException(
          `Total inspected quantity (${currentTotalInspected + data.inspectedQty}) exceeds GRN item received quantity (${grnItem.receivedQty})`,
        );
      }
    } else if (sourceType === 'PRODUCTION_OUTPUT') {
      jobCardId = data.jobCardId || data.sourceId || null;
      if (!jobCardId) {
        throw new BadRequestException('Job card ID is required for PRODUCTION_OUTPUT source type');
      }

      const jobCard = await this.prisma.jobCard.findUnique({
        where: { id: jobCardId },
      });
      if (!jobCard) {
        throw new NotFoundException(`Job card with ID ${jobCardId} not found`);
      }

      resolvedPartId = resolvedPartId || jobCard.partId;
      if (data.partId && jobCard.partId !== data.partId) {
        throw new BadRequestException('Part ID does not match the Job card part');
      }

      const maxAllowed = jobCard.producedQty > 0 ? jobCard.producedQty : jobCard.targetQty;
      const existingInspections = await this.prisma.qualityInspection.findMany({
        where: { jobCardId: jobCard.id },
      });
      const currentTotalInspected = existingInspections.reduce((sum, i) => sum + i.inspectedQty, 0);

      if (currentTotalInspected + data.inspectedQty > maxAllowed + 0.0001) {
        throw new BadRequestException(
          `Total inspected quantity (${currentTotalInspected + data.inspectedQty}) exceeds Job card quantity (${maxAllowed})`,
        );
      }
    }

    // Part validation
    const part = await this.prisma.part.findUnique({
      where: { id: resolvedPartId },
    });
    if (!part) {
      throw new NotFoundException(`Part with ID ${resolvedPartId} not found`);
    }

    // Generate unique inspection number safely with collision loop
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    let seq = (await this.prisma.qualityInspection.count()) + 1;
    let inspectionNumber = `QI-${dateStr}-${String(seq).padStart(4, '0')}`;
    while (await this.prisma.qualityInspection.findUnique({ where: { inspectionNumber } })) {
      seq++;
      inspectionNumber = `QI-${dateStr}-${String(seq).padStart(4, '0')}`;
    }

    return this.prisma.$transaction(async (tx) => {
      const inspection = await tx.qualityInspection.create({
        data: {
          inspectionNumber,
          sourceType,
          sourceId: sourceId || grnId || jobCardId,
          grnId,
          grnItemId,
          jobCardId,
          partId: resolvedPartId,
          batchNumber: data.batchNumber || null,
          inspectedQty: data.inspectedQty,
          acceptedQty: 0,
          rejectedQty: 0,
          status: 'PENDING',
          decision: 'PENDING',
          remarks: data.remarks || null,
        },
        include: {
          part: { include: { unit: true } },
          grn: true,
          grnItem: true,
          jobCard: true,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          module: 'QUALITY',
          entityName: 'QualityInspection',
          entityId: inspection.id,
          newData: JSON.stringify({
            inspectionNumber: inspection.inspectionNumber,
            sourceType: inspection.sourceType,
            inspectedQty: inspection.inspectedQty,
            status: inspection.status,
          }),
        },
      });

      return inspection;
    });
  }

  async start(id: string, userId: string) {
    const inspection = await this.findOne(id);

    // RULE-Q08: Cannot start if already completed
    if (inspection.status === 'COMPLETED') {
      throw new BadRequestException('Cannot start an already completed inspection');
    }

    if (inspection.status === 'IN_PROGRESS') {
      return inspection;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.qualityInspection.update({
        where: { id },
        data: { status: 'IN_PROGRESS' },
        include: {
          part: { include: { unit: true } },
          grn: true,
          grnItem: true,
          jobCard: true,
          inspectedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'START',
          module: 'QUALITY',
          entityName: 'QualityInspection',
          entityId: id,
          oldData: JSON.stringify({ status: inspection.status }),
          newData: JSON.stringify({ status: 'IN_PROGRESS' }),
        },
      });

      return updated;
    });
  }

  async complete(id: string, userId: string, data: CompleteInspectionDto) {
    const inspection = await this.findOne(id);

    // RULE-Q07: Cannot complete if already completed
    if (inspection.status === 'COMPLETED') {
      throw new BadRequestException('Inspection is already completed');
    }

    const acceptedQty = Number(data.acceptedQty) || 0;
    const rejectedQty = Number(data.rejectedQty) || 0;

    // RULE-Q02 & RULE-Q03
    if (acceptedQty < 0) {
      throw new BadRequestException('Accepted quantity cannot be negative');
    }
    if (rejectedQty < 0) {
      throw new BadRequestException('Rejected quantity cannot be negative');
    }

    // RULE-Q04: acceptedQty + rejectedQty must equal inspectedQty (with float tolerance)
    if (Math.abs(acceptedQty + rejectedQty - inspection.inspectedQty) > 0.0001) {
      throw new BadRequestException(
        `Sum of accepted (${acceptedQty}) and rejected (${rejectedQty}) quantities must equal inspected quantity (${inspection.inspectedQty})`,
      );
    }

    // RULE-Q05: Rejection reason required if rejectedQty > 0
    if (rejectedQty > 0 && (!data.rejectionReason || !data.rejectionReason.trim())) {
      throw new BadRequestException('Rejection reason is mandatory when rejected quantity is greater than 0');
    }

    // RULE-Q06: Decision assignment
    let decision = 'ACCEPTED';
    if (rejectedQty === 0 && acceptedQty === inspection.inspectedQty) {
      decision = 'ACCEPTED';
    } else if (acceptedQty === 0 && rejectedQty === inspection.inspectedQty) {
      decision = 'REJECTED';
    } else {
      decision = 'PARTIALLY_ACCEPTED';
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.qualityInspection.update({
        where: { id },
        data: {
          acceptedQty,
          rejectedQty,
          status: 'COMPLETED',
          decision,
          rejectionReason: rejectedQty > 0 ? data.rejectionReason!.trim() : null,
          remarks: data.remarks || inspection.remarks,
          inspectedById: userId,
          inspectedAt: new Date(),
        },
        include: {
          part: { include: { unit: true } },
          grn: true,
          grnItem: true,
          jobCard: true,
          inspectedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Note: Zero duplicate stock mutations. Quality records the audit log and inspection verification.
      await tx.auditLog.create({
        data: {
          action: 'COMPLETE',
          module: 'QUALITY',
          entityName: 'QualityInspection',
          entityId: id,
          oldData: JSON.stringify({
            status: inspection.status,
            decision: inspection.decision,
            acceptedQty: inspection.acceptedQty,
            rejectedQty: inspection.rejectedQty,
          }),
          newData: JSON.stringify({
            status: 'COMPLETED',
            decision,
            acceptedQty,
            rejectedQty,
            rejectionReason: updated.rejectionReason,
            inspectedById: userId,
          }),
        },
      });

      return updated;
    });
  }

  async getStatistics() {
    const [total, pending, inProgress, completed, accepted, partiallyAccepted, rejected] =
      await Promise.all([
        this.prisma.qualityInspection.count(),
        this.prisma.qualityInspection.count({ where: { status: 'PENDING' } }),
        this.prisma.qualityInspection.count({ where: { status: 'IN_PROGRESS' } }),
        this.prisma.qualityInspection.count({ where: { status: 'COMPLETED' } }),
        this.prisma.qualityInspection.count({ where: { decision: 'ACCEPTED' } }),
        this.prisma.qualityInspection.count({ where: { decision: 'PARTIALLY_ACCEPTED' } }),
        this.prisma.qualityInspection.count({ where: { decision: 'REJECTED' } }),
      ]);

    return {
      total,
      pending,
      inProgress,
      completed,
      accepted,
      partiallyAccepted,
      rejected,
    };
  }
}
