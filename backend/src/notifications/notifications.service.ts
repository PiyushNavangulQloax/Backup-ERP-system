import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getUserNotifications(userId: string) {
    // Check if user has notifications; if fewer than 3, auto-generate contextual alerts from live ERP state
    const existingCount = await this.prisma.notification.count({ where: { userId } });
    if (existingCount < 2) {
      // Check for pending PO approvals
      const pendingPOs = await this.prisma.purchaseOrder.findMany({
        where: { status: 'SUBMITTED' },
        take: 1,
      });
      if (pendingPOs.length > 0) {
        await this.prisma.notification.create({
          data: {
            userId,
            title: 'Purchase Order Approval Needed',
            message: `PO #${pendingPOs[0].poNumber} is waiting for executive review.`,
            type: 'WARNING',
            isRead: false,
          },
        });
      }

      // Check for low stock
      const lowStock = await this.prisma.stock.findFirst({
        where: { quantityOnHand: { lte: 200 } },
        include: { part: true },
      });
      if (lowStock) {
        await this.prisma.notification.create({
          data: {
            userId,
            title: 'Low Stock Alert',
            message: `${lowStock.part?.name} has only ${lowStock.quantityOnHand} units remaining.`,
            type: 'INFO',
            isRead: false,
          },
        });
      }
    }

    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return { items, unreadCount };
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async create(data: {
    userId: string;
    title: string;
    message: string;
    type?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type || 'INFO',
        isRead: false,
      },
    });
  }
}
