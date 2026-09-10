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
}
