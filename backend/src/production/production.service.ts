import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ProductionService {
  constructor(private prisma: PrismaService) {}

  // BOM
  async getBOMs() {
    return this.prisma.bOM.findMany({
      include: {
        part: { include: { unit: true } },
        items: { include: { part: { include: { unit: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBOM(id: string) {
    const bom = await this.prisma.bOM.findUnique({
      where: { id },
      include: {
        part: { include: { unit: true } },
        items: { include: { part: { include: { unit: true } } } },
      },
    });
    if (!bom) throw new NotFoundException('BOM not found');
    return bom;
  }

  async createBOM(data: {
    partId: string;
    bomCode: string;
    version?: string;
    notes?: string;
    items: Array<{
      partId: string;
      quantityRequired: number;
      scrapPercentage?: number;
    }>;
  }) {
    return this.prisma.bOM.create({
      data: {
        bomCode: data.bomCode,
        partId: data.partId,
        version: data.version || '1.0',
        notes: data.notes,
        items: {
          create: data.items.map((i) => ({
            partId: i.partId,
            quantityRequired: i.quantityRequired,
            scrapPercentage: i.scrapPercentage || 0,
          })),
        },
      },
      include: { items: true },
    });
  }

  // Operations
  async getOperations() {
    return this.prisma.operation.findMany({ orderBy: { code: 'asc' } });
  }

  async createOperation(data: any) {
    return this.prisma.operation.create({ data });
  }

  // Production Plans
  async getPlans() {
    return this.prisma.productionPlan.findMany({
      include: {
        part: { include: { unit: true } },
        jobCards: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPlan(data: {
    partId: string;
    plannedQty: number;
    startDate?: string;
    endDate?: string;
  }) {
    const count = await this.prisma.productionPlan.count();
    const planNumber = `PLAN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.productionPlan.create({
      data: {
        planNumber,
        partId: data.partId,
        plannedQty: data.plannedQty,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: 'PLANNED',
      },
      include: { part: true },
    });
  }

  // Job Cards
  async getJobCards(params?: { planId?: string; status?: string }) {
    const where: any = {};
    if (params?.planId) where.planId = params.planId;
    if (params?.status) where.status = params.status;

    return this.prisma.jobCard.findMany({
      where,
      include: {
        part: { include: { unit: true } },
        plan: true,
        materialIssues: { include: { part: true, store: true } },
        materialReturns: { include: { part: true, store: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createJobCard(data: {
    planId?: string;
    partId: string;
    targetQty: number;
  }) {
    const count = await this.prisma.jobCard.count();
    const jobCardNumber = `JOB-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.jobCard.create({
      data: {
        jobCardNumber,
        planId: data.planId,
        partId: data.partId,
        targetQty: data.targetQty,
        status: 'RELEASED',
      },
      include: { part: true },
    });
  }

  // Issue Materials to Job Card
  async issueMaterial(userId: string, data: {
    jobCardId: string;
    partId: string;
    quantityIssued: number;
    storeId: string;
    locationId?: string;
    batchNumber?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // Deduct from stock
      const stock = await tx.stock.findFirst({
        where: {
          partId: data.partId,
          storeId: data.storeId,
          locationId: data.locationId || null,
          batchNumber: data.batchNumber || null,
        },
      });

      if (!stock || stock.quantityOnHand < data.quantityIssued) {
        throw new BadRequestException('Insufficient inventory for material issue');
      }

      await tx.stock.update({
        where: { id: stock.id },
        data: { quantityOnHand: stock.quantityOnHand - data.quantityIssued },
      });

      const count = await tx.materialIssue.count();
      const issueNumber = `ISSUE-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      const issue = await tx.materialIssue.create({
        data: {
          issueNumber,
          jobCardId: data.jobCardId,
          partId: data.partId,
          quantityIssued: data.quantityIssued,
          storeId: data.storeId,
          issuedById: userId,
        },
      });

      await tx.stockMovement.create({
        data: {
          partId: data.partId,
          storeId: data.storeId,
          locationId: data.locationId || null,
          movementType: 'PROD_ISSUE',
          quantity: data.quantityIssued,
          referenceType: 'JOB_CARD',
          referenceId: data.jobCardId,
          batchNumber: data.batchNumber,
          reason: `Material issued for Job Card #${data.jobCardId}`,
          performedById: userId,
        },
      });

      await tx.jobCard.update({
        where: { id: data.jobCardId },
        data: { status: 'IN_PROGRESS' },
      });

      return issue;
    });
  }

  // Complete Job Card (Receipt finished good into stock)
  async completeJobCard(userId: string, id: string, data: {
    producedQty: number;
    rejectedQty: number;
    storeId: string;
    locationId?: string;
    batchNumber?: string;
  }) {
    const jobCard = await this.prisma.jobCard.findUnique({ where: { id } });
    if (!jobCard) throw new NotFoundException('Job Card not found');

    return this.prisma.$transaction(async (tx) => {
      const updatedJob = await tx.jobCard.update({
        where: { id },
        data: {
          producedQty: data.producedQty,
          rejectedQty: data.rejectedQty,
          status: 'COMPLETED',
          completedDate: new Date(),
        },
      });

      if (data.producedQty > 0) {
        // Deposit Finished Goods into Store
        const fgStock = await tx.stock.findFirst({
          where: {
            partId: jobCard.partId,
            storeId: data.storeId,
            locationId: data.locationId || null,
            batchNumber: data.batchNumber || null,
          },
        });

        if (fgStock) {
          await tx.stock.update({
            where: { id: fgStock.id },
            data: { quantityOnHand: fgStock.quantityOnHand + data.producedQty },
          });
        } else {
          await tx.stock.create({
            data: {
              partId: jobCard.partId,
              storeId: data.storeId,
              locationId: data.locationId || null,
              batchNumber: data.batchNumber || null,
              quantityOnHand: data.producedQty,
            },
          });
        }

        await tx.stockMovement.create({
          data: {
            partId: jobCard.partId,
            storeId: data.storeId,
            locationId: data.locationId || null,
            movementType: 'PROD_RECEIPT',
            quantity: data.producedQty,
            referenceType: 'JOB_CARD',
            referenceId: jobCard.id,
            batchNumber: data.batchNumber,
            reason: `Finished goods completed from Job Card #${jobCard.jobCardNumber}`,
            performedById: userId,
          },
        });
      }

      return updatedJob;
    });
  }
}
