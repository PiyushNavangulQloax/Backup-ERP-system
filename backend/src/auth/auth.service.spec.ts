import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    jwt = {
      sign: jest.fn().mockReturnValue('mock_token'),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: JwtService,
          useValue: jwt,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should logout user and clear refresh token', async () => {
    prisma.user.update.mockResolvedValue({ id: 'user-1', refreshToken: null });
    const res = await service.logout('user-1');
    expect(res).toEqual({ message: 'Logged out successfully' });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { refreshToken: null },
    });
  });

  it('should return user profile with mapped permissions', async () => {
    const mockUser = {
      id: 'u-1',
      email: 'admin@erp.local',
      firstName: 'Admin',
      lastName: 'User',
      phone: '1234567890',
      role: {
        name: 'Administrator',
        permissions: [
          { permission: { code: 'po.view' } },
          { permission: { code: 'inventory.view' } },
        ],
      },
    };
    prisma.user.findUnique.mockResolvedValue(mockUser);

    const profile = await service.getProfile('u-1');
    expect(profile.email).toBe('admin@erp.local');
    expect(profile.role).toBe('Administrator');
    expect(profile.permissions).toEqual(['po.view', 'inventory.view']);
  });

  it('should throw UnauthorizedException if user not found on getProfile', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.getProfile('unknown')).rejects.toThrow(UnauthorizedException);
  });
});
