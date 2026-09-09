import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics() {
    const [
      pendingPOs,
      pendingGRNs,
      openJobCards,
      sealedBoxes,
      pendingInvoices,
      pendingDispatches,
      recentScans,
      lowStockCount,
    ] = await Promise.all([
      this.prisma.purchaseOrder.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.gRN.count({ where: { status: 'DRAFT' } }),
      this.prisma.jobCard.count({ where: { status: { in: ['RELEASED', 'IN_PROGRESS'] } } }),
      this.prisma.box.count({ where: { status: 'SEALED' } }),
      this.prisma.invoice.count({ where: { status: 'DRAFT' } }),
      this.prisma.dispatch.count({ where: { status: 'PREPARED' } }),
      this.prisma.barcodeScanHistory.count({
        where: {
          scannedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.part.count({
        where: {
          stocks: {
            some: {
              quantityOnHand: { lte: 100 },
            },
          },
        },
      }),
    ]);

    const recentMovements = await this.prisma.stockMovement.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        part: true,
        store: true,
        performedBy: { select: { firstName: true, lastName: true } },
      },
    });

    const recentAudits = await this.prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    return {
      kpis: {
        pendingPOs,
        pendingGRNs,
        openJobCards,
        sealedBoxes,
        pendingInvoices,
        pendingDispatches,
        recentScans24h: recentScans,
        lowStockAlerts: lowStockCount,
      },
      recentMovements,
      recentAudits,
    };
  }
}
