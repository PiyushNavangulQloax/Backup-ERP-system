import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { module?: string; userId?: string; limit?: number }) {
    const where: any = {};
    if (params?.module) where.module = params.module;
    if (params?.userId) where.userId = params.userId;

    return this.prisma.auditLog.findMany({
      where,
      take: params?.limit || 100,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async logEvent(data: {
    userId?: string;
    action: string;
    module: string;
    entityName: string;
    entityId?: string;
    oldData?: any;
    newData?: any;
    ipAddress?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        module: data.module,
        entityName: data.entityName,
        entityId: data.entityId,
        oldData: data.oldData ? JSON.stringify(data.oldData) : null,
        newData: data.newData ? JSON.stringify(data.newData) : null,
        ipAddress: data.ipAddress,
      },
    });
  }
}
