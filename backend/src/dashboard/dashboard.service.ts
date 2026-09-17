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
      pendingInspections,
      invoices,
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
      this.prisma.qualityInspection.count({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.invoice.findMany({
        include: {
          customer: true,
          items: {
            include: { part: true },
          },
        },
      }),
    ]);

    // Calculate detailed revenue metrics
    let totalRevenue = 0;
    let paidRevenue = 0;
    let pendingRevenue = 0;
    let totalItemsBilled = 0;

    const customerMap = new Map<string, {
      customerId: string;
      customerName: string;
      customerCode: string;
      revenue: number;
      invoiceCount: number;
      itemsQuantity: number;
    }>();

    const productMap = new Map<string, {
      partId: string;
      partName: string;
      partCode: string;
      revenue: number;
      totalQty: number;
    }>();

    const statusCounts: Record<string, { count: number; totalAmount: number }> = {
      PAID: { count: 0, totalAmount: 0 },
      APPROVED: { count: 0, totalAmount: 0 },
      DRAFT: { count: 0, totalAmount: 0 },
      CANCELLED: { count: 0, totalAmount: 0 },
    };

    for (const inv of invoices) {
      totalRevenue += inv.grandTotal;
      if (inv.status === 'PAID') {
        paidRevenue += inv.grandTotal;
      } else if (inv.status !== 'CANCELLED') {
        pendingRevenue += inv.grandTotal;
      }

      if (!statusCounts[inv.status]) {
        statusCounts[inv.status] = { count: 0, totalAmount: 0 };
      }
      statusCounts[inv.status].count += 1;
      statusCounts[inv.status].totalAmount += inv.grandTotal;

      const custKey = inv.customerId;
      if (!customerMap.has(custKey)) {
        customerMap.set(custKey, {
          customerId: inv.customerId,
          customerName: inv.customer?.name || 'Unknown Client',
          customerCode: inv.customer?.code || 'N/A',
          revenue: 0,
          invoiceCount: 0,
          itemsQuantity: 0,
        });
      }
      const cData = customerMap.get(custKey)!;
      cData.revenue += inv.grandTotal;
      cData.invoiceCount += 1;

      for (const item of inv.items) {
        totalItemsBilled += item.quantity;
        cData.itemsQuantity += item.quantity;

        const partKey = item.partId;
        if (!productMap.has(partKey)) {
          productMap.set(partKey, {
            partId: item.partId,
            partName: item.part?.name || 'Item',
            partCode: item.part?.code || 'N/A',
            revenue: 0,
            totalQty: 0,
          });
        }
        const pData = productMap.get(partKey)!;
        pData.revenue += item.lineTotal;
        pData.totalQty += item.quantity;
      }
    }

    const palette = [
      '#3b82f6', // Blue
      '#10b981', // Emerald
      '#8b5cf6', // Violet
      '#f59e0b', // Amber
      '#ec4899', // Pink
      '#06b6d4', // Cyan
      '#f43f5e', // Rose
      '#84cc16', // Lime
    ];

    const byCustomer = Array.from(customerMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map((c, i) => ({
        ...c,
        revenue: Math.round(c.revenue * 100) / 100,
        percentage: totalRevenue > 0 ? parseFloat(((c.revenue / totalRevenue) * 100).toFixed(1)) : 0,
        color: palette[i % palette.length],
      }));

    const byProduct = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map((p, i) => ({
        ...p,
        revenue: Math.round(p.revenue * 100) / 100,
        percentage: totalRevenue > 0 ? parseFloat(((p.revenue / totalRevenue) * 100).toFixed(1)) : 0,
        color: palette[i % palette.length],
      }));

    const byStatus = Object.entries(statusCounts)
      .filter(([_, v]) => v.count > 0)
      .map(([status, val], i) => ({
        status,
        count: val.count,
        totalAmount: Math.round(val.totalAmount * 100) / 100,
        percentage: totalRevenue > 0 ? parseFloat(((val.totalAmount / totalRevenue) * 100).toFixed(1)) : 0,
        color: status === 'PAID' ? '#10b981' : status === 'APPROVED' ? '#3b82f6' : status === 'DRAFT' ? '#f59e0b' : '#94a3b8',
      }));

    const revenue = {
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        paidRevenue: Math.round(paidRevenue * 100) / 100,
        pendingRevenue: Math.round(pendingRevenue * 100) / 100,
        totalInvoicesCount: invoices.length,
        totalItemsBilled,
      },
      byCustomer,
      byProduct,
      byStatus,
    };

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
        pendingInspections,
      },
      revenue,
      recentMovements,
      recentAudits,
    };
  }
}
