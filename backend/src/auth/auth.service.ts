// Manufacturing ERP 2.0 - Authentication Service
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcryptjs';
import { LoginDto, RefreshTokenDto, ChangePasswordDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'super-secret-manufacturing-erp-jwt-key-change-in-production-2026',
      expiresIn: process.env.JWT_EXPIRATION || '3600s',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'super-refresh-token-manufacturing-erp-key-change-in-prod-2026',
      expiresIn: process.env.JWT_REFRESH_EXPIRATION || '604800s',
    });

    // Store hashed or direct refresh token
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    // Record login audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        module: 'AUTH',
        entityName: 'User',
        entityId: user.id,
        ipAddress: ipAddress || '127.0.0.1',
      },
    });

    const permissions = user.role.permissions.map((rp) => rp.permission.code);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role.name,
        permissions,
      },
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      const decoded = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'super-refresh-token-manufacturing-erp-key-change-in-prod-2026',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        include: { role: true },
      });

      if (!user || user.refreshToken !== refreshTokenDto.refreshToken || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role.name,
      };

      const accessToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET || 'super-secret-manufacturing-erp-jwt-key-change-in-production-2026',
        expiresIn: process.env.JWT_EXPIRATION || '3600s',
      });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Logged out successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role.name,
      permissions: user.role.permissions.map((rp) => rp.permission.code),
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isMatch = await bcrypt.compare(
      changePasswordDto.oldPassword,
      user.passwordHash,
    );

    if (!isMatch) {
      throw new BadRequestException('Current password does not match');
    }

    const passwordHash = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, refreshToken: null },
    });

    return { message: 'Password updated successfully' };
  }
}
