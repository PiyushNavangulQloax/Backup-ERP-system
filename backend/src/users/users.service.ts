import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { search?: string; roleId?: string; page?: number; limit?: number }) {
    const { search, roleId, page = 1, limit = 50 } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (roleId) where.roleId = roleId;
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
          roleId: true,
          role: { select: { id: true, name: true } },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, refreshToken, ...rest } = user;
    return rest;
  }

  async create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    roleId: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        roleId: data.roleId,
      },
      include: { role: true },
    });

    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  async update(id: string, data: { firstName?: string; lastName?: string; phone?: string; roleId?: string; isActive?: boolean; password?: string }) {
    await this.findOne(id);
    const updateData: any = { ...data };
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
      delete updateData.password;
    }
    return this.prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });
  }

  async getRoles() {
    return this.prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  }

  async getPermissions() {
    return this.prisma.permission.findMany({
      orderBy: { module: 'asc' },
    });
  }
}
