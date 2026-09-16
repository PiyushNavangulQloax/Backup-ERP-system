import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { QualityService } from '../quality/quality.service';

describe('Manufacturing ERP 2.0 — Phase 3.3 Quality Management Suite (TEST-Q01 to TEST-Q20)', () => {
  let qualityService: QualityService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      $transaction: jest.fn((cb) => cb(mockPrisma)),
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-q1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      part: {
        findUnique: jest.fn(),
      },
      gRN: {
        findUnique: jest.fn(),
      },
      jobCard: {
        findUnique: jest.fn(),
      },
      qualityInspection: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      stock: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      stockMovement: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QualityService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    qualityService = module.get<QualityService>(QualityService);
  });

  // TEST-Q01: Create inspection for INCOMING_GRN successfully
  it('TEST-Q01: should create an inspection for INCOMING_GRN successfully with PENDING status and decision', async () => {
    mockPrisma.part.findUnique.mockResolvedValue({ id: 'part-1', name: 'Alloy Rod' });
    mockPrisma.gRN.findUnique.mockResolvedValue({
      id: 'grn-1',
      grnNumber: 'GRN-20260916-0001',
      items: [{ id: 'grn-item-1', partId: 'part-1', receivedQty: 100, batchNumber: 'BAT-01' }],
    });
    mockPrisma.qualityInspection.findMany.mockResolvedValue([]);
    mockPrisma.qualityInspection.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'qi-1', ...data }),
    );

    const result = await qualityService.create('user-1', {
      sourceType: 'INCOMING_GRN',
      grnId: 'grn-1',
      grnItemId: 'grn-item-1',
      partId: 'part-1',
      inspectedQty: 50,
      batchNumber: 'BAT-01',
      remarks: 'Sample batch test',
    });

    expect(result.status).toBe('PENDING');
    expect(result.decision).toBe('PENDING');
    expect(result.inspectedQty).toBe(50);
    expect(result.acceptedQty).toBe(0);
    expect(result.rejectedQty).toBe(0);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'CREATE',
          module: 'QUALITY',
          entityName: 'QualityInspection',
        }),
      }),
    );
  });

  // TEST-Q02: Inspected quantity must be > 0 (RULE-Q01)
  it('TEST-Q02: should reject creation if inspectedQty <= 0 (RULE-Q01)', async () => {
    await expect(
      qualityService.create('user-1', {
        sourceType: 'INCOMING_GRN',
        grnId: 'grn-1',
        partId: 'part-1',
        inspectedQty: 0,
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      qualityService.create('user-1', {
        sourceType: 'INCOMING_GRN',
        grnId: 'grn-1',
        partId: 'part-1',
        inspectedQty: -5,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // TEST-Q03: Inspected quantity cannot exceed GRN item received quantity
  it('TEST-Q03: should reject creation if inspectedQty exceeds GRN item received quantity', async () => {
    mockPrisma.part.findUnique.mockResolvedValue({ id: 'part-1' });
    mockPrisma.gRN.findUnique.mockResolvedValue({
      id: 'grn-1',
      items: [{ id: 'grn-item-1', partId: 'part-1', receivedQty: 100 }],
    });
    mockPrisma.qualityInspection.findMany.mockResolvedValue([]);

    await expect(
      qualityService.create('user-1', {
        sourceType: 'INCOMING_GRN',
        grnId: 'grn-1',
        grnItemId: 'grn-item-1',
        partId: 'part-1',
        inspectedQty: 150,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // TEST-Q04: Inspected quantity cannot exceed GRN item remaining available quantity (cumulative)
  it('TEST-Q04: should reject creation if cumulative inspectedQty exceeds GRN item received quantity', async () => {
    mockPrisma.part.findUnique.mockResolvedValue({ id: 'part-1' });
    mockPrisma.gRN.findUnique.mockResolvedValue({
      id: 'grn-1',
      items: [{ id: 'grn-item-1', partId: 'part-1', receivedQty: 100 }],
    });
    // Existing inspection for 70 units
    mockPrisma.qualityInspection.findMany.mockResolvedValue([{ inspectedQty: 70 }]);

    await expect(
      qualityService.create('user-1', {
        sourceType: 'INCOMING_GRN',
        grnId: 'grn-1',
        grnItemId: 'grn-item-1',
        partId: 'part-1',
        inspectedQty: 40, // 70 + 40 = 110 > 100
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // TEST-Q05: Rejects creation if Part does not match GRN item part
  it('TEST-Q05: should reject creation if partId does not match GRN item part', async () => {
    mockPrisma.part.findUnique.mockResolvedValue({ id: 'part-2' });
    mockPrisma.gRN.findUnique.mockResolvedValue({
      id: 'grn-1',
      items: [{ id: 'grn-item-1', partId: 'part-1', receivedQty: 100 }],
    });

    await expect(
      qualityService.create('user-1', {
        sourceType: 'INCOMING_GRN',
        grnId: 'grn-1',
        grnItemId: 'grn-item-1',
        partId: 'part-2',
        inspectedQty: 10,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // TEST-Q06: Create inspection for PRODUCTION_OUTPUT successfully
  it('TEST-Q06: should create an inspection for PRODUCTION_OUTPUT successfully', async () => {
    mockPrisma.part.findUnique.mockResolvedValue({ id: 'part-prod', name: 'Machined Shaft' });
    mockPrisma.jobCard.findUnique.mockResolvedValue({
      id: 'jc-1',
      jobCardNumber: 'JC-20260916-0001',
      partId: 'part-prod',
      targetQty: 50,
      producedQty: 50,
      batchNumber: 'PROD-BAT-01',
    });
    mockPrisma.qualityInspection.findMany.mockResolvedValue([]);
    mockPrisma.qualityInspection.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'qi-2', ...data }),
    );

    const result = await qualityService.create('user-1', {
      sourceType: 'PRODUCTION_OUTPUT',
      jobCardId: 'jc-1',
      partId: 'part-prod',
      inspectedQty: 50,
      batchNumber: 'PROD-BAT-01',
    });

    expect(result.sourceType).toBe('PRODUCTION_OUTPUT');
    expect(result.status).toBe('PENDING');
    expect(result.inspectedQty).toBe(50);
  });

  // TEST-Q07: Inspected quantity cannot exceed Job Card quantity
  it('TEST-Q07: should reject creation if inspectedQty exceeds Job Card quantity', async () => {
    mockPrisma.part.findUnique.mockResolvedValue({ id: 'part-prod' });
    mockPrisma.jobCard.findUnique.mockResolvedValue({
      id: 'jc-1',
      partId: 'part-prod',
      targetQty: 50,
      producedQty: 50,
    });
    mockPrisma.qualityInspection.findMany.mockResolvedValue([]);

    await expect(
      qualityService.create('user-1', {
        sourceType: 'PRODUCTION_OUTPUT',
        jobCardId: 'jc-1',
        partId: 'part-prod',
        inspectedQty: 60,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // TEST-Q08: Rejects creation if Part does not match Job Card part
  it('TEST-Q08: should reject creation if partId does not match Job Card part', async () => {
    mockPrisma.part.findUnique.mockResolvedValue({ id: 'part-wrong' });
    mockPrisma.jobCard.findUnique.mockResolvedValue({
      id: 'jc-1',
      partId: 'part-prod',
      targetQty: 50,
      producedQty: 50,
    });

    await expect(
      qualityService.create('user-1', {
        sourceType: 'PRODUCTION_OUTPUT',
        jobCardId: 'jc-1',
        partId: 'part-wrong',
        inspectedQty: 20,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // TEST-Q09: Start inspection transitions status from PENDING to IN_PROGRESS
  it('TEST-Q09: should transition status to IN_PROGRESS when starting inspection', async () => {
    mockPrisma.qualityInspection.findUnique.mockResolvedValue({
      id: 'qi-1',
      status: 'PENDING',
    });
    mockPrisma.qualityInspection.update.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'qi-1', ...data }),
    );

    const result = await qualityService.start('qi-1', 'user-1');
    expect(result.status).toBe('IN_PROGRESS');
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'START',
          module: 'QUALITY',
        }),
      }),
    );
  });

  // TEST-Q10: Start inspection on already COMPLETED inspection throws error (RULE-Q08)
  it('TEST-Q10: should reject starting an already COMPLETED inspection (RULE-Q08)', async () => {
    mockPrisma.qualityInspection.findUnique.mockResolvedValue({
      id: 'qi-1',
      status: 'COMPLETED',
    });

    await expect(qualityService.start('qi-1', 'user-1')).rejects.toThrow(BadRequestException);
  });

  // TEST-Q11: Complete inspection with 100% accepted (decision ACCEPTED)
  it('TEST-Q11: should set decision to ACCEPTED when 100% accepted and 0 rejected (RULE-Q06)', async () => {
    mockPrisma.qualityInspection.findUnique.mockResolvedValue({
      id: 'qi-1',
      inspectedQty: 50,
      status: 'IN_PROGRESS',
      decision: 'PENDING',
    });
    mockPrisma.qualityInspection.update.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'qi-1', ...data }),
    );

    const result = await qualityService.complete('qi-1', 'user-1', {
      acceptedQty: 50,
      rejectedQty: 0,
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.decision).toBe('ACCEPTED');
    expect(result.acceptedQty).toBe(50);
    expect(result.rejectedQty).toBe(0);
    expect(result.rejectionReason).toBeNull();
  });

  // TEST-Q12: Complete inspection with 100% rejected (decision REJECTED)
  it('TEST-Q12: should set decision to REJECTED when 100% rejected and 0 accepted (RULE-Q06)', async () => {
    mockPrisma.qualityInspection.findUnique.mockResolvedValue({
      id: 'qi-1',
      inspectedQty: 50,
      status: 'IN_PROGRESS',
      decision: 'PENDING',
    });
    mockPrisma.qualityInspection.update.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'qi-1', ...data }),
    );

    const result = await qualityService.complete('qi-1', 'user-1', {
      acceptedQty: 0,
      rejectedQty: 50,
      rejectionReason: 'Dimensional error exceeding tolerance',
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.decision).toBe('REJECTED');
    expect(result.acceptedQty).toBe(0);
    expect(result.rejectedQty).toBe(50);
    expect(result.rejectionReason).toBe('Dimensional error exceeding tolerance');
  });

  // TEST-Q13: Complete inspection with partial accepted and partial rejected (decision PARTIALLY_ACCEPTED)
  it('TEST-Q13: should set decision to PARTIALLY_ACCEPTED when both accepted and rejected are > 0 (RULE-Q06)', async () => {
    mockPrisma.qualityInspection.findUnique.mockResolvedValue({
      id: 'qi-1',
      inspectedQty: 50,
      status: 'IN_PROGRESS',
      decision: 'PENDING',
    });
    mockPrisma.qualityInspection.update.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'qi-1', ...data }),
    );

    const result = await qualityService.complete('qi-1', 'user-1', {
      acceptedQty: 40,
      rejectedQty: 10,
      rejectionReason: 'Minor surface burrs on 10 units',
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.decision).toBe('PARTIALLY_ACCEPTED');
    expect(result.acceptedQty).toBe(40);
    expect(result.rejectedQty).toBe(10);
  });

  // TEST-Q14: Complete inspection fails if accepted + rejected !== inspectedQty (RULE-Q04)
  it('TEST-Q14: should reject completion if accepted + rejected !== inspectedQty (RULE-Q04)', async () => {
    mockPrisma.qualityInspection.findUnique.mockResolvedValue({
      id: 'qi-1',
      inspectedQty: 50,
      status: 'IN_PROGRESS',
    });

    await expect(
      qualityService.complete('qi-1', 'user-1', {
        acceptedQty: 30,
        rejectedQty: 10, // sum = 40 !== 50
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // TEST-Q15: Complete inspection fails if acceptedQty < 0 (RULE-Q02)
  it('TEST-Q15: should reject completion if acceptedQty < 0 (RULE-Q02)', async () => {
    mockPrisma.qualityInspection.findUnique.mockResolvedValue({
      id: 'qi-1',
      inspectedQty: 50,
      status: 'IN_PROGRESS',
    });

    await expect(
      qualityService.complete('qi-1', 'user-1', {
        acceptedQty: -10,
        rejectedQty: 60,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // TEST-Q16: Complete inspection fails if rejectedQty < 0 (RULE-Q03)
  it('TEST-Q16: should reject completion if rejectedQty < 0 (RULE-Q03)', async () => {
    mockPrisma.qualityInspection.findUnique.mockResolvedValue({
      id: 'qi-1',
      inspectedQty: 50,
      status: 'IN_PROGRESS',
    });

    await expect(
      qualityService.complete('qi-1', 'user-1', {
        acceptedQty: 55,
        rejectedQty: -5,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // TEST-Q17: Complete inspection fails if rejectedQty > 0 and rejectionReason is missing (RULE-Q05)
  it('TEST-Q17: should reject completion if rejectedQty > 0 and rejectionReason is missing or empty (RULE-Q05)', async () => {
    mockPrisma.qualityInspection.findUnique.mockResolvedValue({
      id: 'qi-1',
      inspectedQty: 50,
      status: 'IN_PROGRESS',
    });

    await expect(
      qualityService.complete('qi-1', 'user-1', {
        acceptedQty: 45,
        rejectedQty: 5,
        rejectionReason: '',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      qualityService.complete('qi-1', 'user-1', {
        acceptedQty: 45,
        rejectedQty: 5,
        rejectionReason: '   ',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // TEST-Q18: Complete inspection on already COMPLETED inspection fails (RULE-Q07)
  it('TEST-Q18: should reject completion if inspection is already COMPLETED (RULE-Q07)', async () => {
    mockPrisma.qualityInspection.findUnique.mockResolvedValue({
      id: 'qi-1',
      inspectedQty: 50,
      status: 'COMPLETED',
    });

    await expect(
      qualityService.complete('qi-1', 'user-1', {
        acceptedQty: 50,
        rejectedQty: 0,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // TEST-Q19: Zero Duplicate Stock Mutations
  it('TEST-Q19: should guarantee Zero Duplicate Stock Mutations upon completing inspection', async () => {
    mockPrisma.qualityInspection.findUnique.mockResolvedValue({
      id: 'qi-1',
      inspectedQty: 50,
      status: 'IN_PROGRESS',
      decision: 'PENDING',
    });
    mockPrisma.qualityInspection.update.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'qi-1', ...data }),
    );

    await qualityService.complete('qi-1', 'user-1', {
      acceptedQty: 45,
      rejectedQty: 5,
      rejectionReason: 'Flange defect',
    });

    // Verify ZERO stock movements created
    expect(mockPrisma.stockMovement.create).not.toHaveBeenCalled();
    expect(mockPrisma.stock.update).not.toHaveBeenCalled();
    expect(mockPrisma.stock.create).not.toHaveBeenCalled();
  });

  // TEST-Q20: Audit logs created for CREATE, START, and COMPLETE lifecycle actions
  it('TEST-Q20: should record structured AuditLog for all lifecycle transitions', async () => {
    // 1. Create
    mockPrisma.part.findUnique.mockResolvedValue({ id: 'part-1' });
    mockPrisma.gRN.findUnique.mockResolvedValue({
      id: 'grn-1',
      items: [{ id: 'grn-item-1', partId: 'part-1', receivedQty: 100 }],
    });
    mockPrisma.qualityInspection.findMany.mockResolvedValue([]);
    mockPrisma.qualityInspection.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'qi-audit', ...data }),
    );

    await qualityService.create('user-1', {
      sourceType: 'INCOMING_GRN',
      grnId: 'grn-1',
      grnItemId: 'grn-item-1',
      partId: 'part-1',
      inspectedQty: 25,
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'CREATE',
          module: 'QUALITY',
          entityName: 'QualityInspection',
        }),
      }),
    );

    // 2. Start
    mockPrisma.qualityInspection.findUnique.mockResolvedValue({
      id: 'qi-audit',
      status: 'PENDING',
      inspectedQty: 25,
    });
    mockPrisma.qualityInspection.update.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'qi-audit', ...data }),
    );

    await qualityService.start('qi-audit', 'user-1');
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'START',
          module: 'QUALITY',
          entityName: 'QualityInspection',
        }),
      }),
    );

    // 3. Complete
    mockPrisma.qualityInspection.findUnique.mockResolvedValue({
      id: 'qi-audit',
      status: 'IN_PROGRESS',
      inspectedQty: 25,
    });

    await qualityService.complete('qi-audit', 'user-1', {
      acceptedQty: 25,
      rejectedQty: 0,
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'COMPLETE',
          module: 'QUALITY',
          entityName: 'QualityInspection',
        }),
      }),
    );
  });
});
