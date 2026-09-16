import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { InvoicesService } from '../invoices/invoices.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { PackingService } from '../packing/packing.service';
import { GrnService } from '../grn/grn.service';
import { ProductionService } from '../production/production.service';
import { SalesOrdersService } from '../sales-orders/sales-orders.service';
import { MastersService } from '../masters/masters.service';

describe('Manufacturing ERP 2.0 — Phase 2.1 & 2.3 Regression Tests (TEST-01 to TEST-21)', () => {
  let invoicesService: InvoicesService;
  let dispatchService: DispatchService;
  let packingService: PackingService;
  let grnService: GrnService;
  let productionService: ProductionService;
  let salesOrdersService: SalesOrdersService;
  let mastersService: MastersService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      $transaction: jest.fn((cb) => cb(mockPrisma)),
      invoice: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      stock: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        aggregate: jest.fn(),
      },
      stockMovement: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      dispatch: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      dispatchBox: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      gatePass: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      box: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      boxItem: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      part: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      store: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
      purchaseOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      purchaseOrderItem: {
        update: jest.fn(),
      },
      gRN: {
        create: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      jobCard: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      productionPlan: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      salesOrder: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      packingOrderItem: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      packingOrder: {
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        DispatchService,
        PackingService,
        GrnService,
        ProductionService,
        SalesOrdersService,
        MastersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    invoicesService = module.get<InvoicesService>(InvoicesService);
    dispatchService = module.get<DispatchService>(DispatchService);
    packingService = module.get<PackingService>(PackingService);
    grnService = module.get<GrnService>(GrnService);
    productionService = module.get<ProductionService>(ProductionService);
    salesOrdersService = module.get<SalesOrdersService>(SalesOrdersService);
    mastersService = module.get<MastersService>(MastersService);
  });

  // ===========================================================================
  // TEST-01: Invoice payment must NOT change Stock
  // ===========================================================================
  it('TEST-01: Invoice payment must NOT change Stock', async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue({
      id: 'inv-1',
      invoiceNumber: 'INV-2026-0001',
      status: 'APPROVED',
      items: [{ partId: 'part-1', quantity: 10, unitPrice: 100 }],
      customer: { id: 'cust-1', name: 'Acme Corp' },
    });
    mockPrisma.invoice.update.mockResolvedValue({ id: 'inv-1', status: 'PAID' });

    const result = await invoicesService.confirmPayment('inv-1', 'user-1', {
      paymentMethod: 'WIRE',
      transactionRef: 'TXN-999',
    });

    expect(result.status).toBe('PAID');
    expect(mockPrisma.stock.update).not.toHaveBeenCalled();
    expect(mockPrisma.stockMovement.create).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'PAYMENT_CONFIRM', module: 'INVOICE' }),
      }),
    );
  });

  // ===========================================================================
  // TEST-02: Gate-Out must deduct stock exactly once
  // ===========================================================================
  it('TEST-02: Gate-Out must deduct stock exactly once', async () => {
    mockPrisma.dispatch.findUnique.mockResolvedValue({
      id: 'disp-1',
      dispatchNumber: 'DSP-2026-0001',
      status: 'PENDING',
      boxes: [
        {
          id: 'dbox-1',
          boxId: 'box-1',
          verifiedAt: new Date(),
          box: {
            boxNumber: 'BOX-001',
            items: [{ partId: 'part-1', quantity: 5, part: { name: 'Part 1' } }],
          },
        },
      ],
      customer: { name: 'Acme Corp' },
    });

    mockPrisma.stock.findFirst.mockResolvedValue({
      id: 'stock-fg-1',
      partId: 'part-1',
      storeId: 'store-fg',
      quantityOnHand: 20,
      store: { type: 'FINISHED_GOODS' },
    });
    mockPrisma.dispatch.update.mockResolvedValue({ id: 'disp-1', status: 'DISPATCHED' });

    await dispatchService.gateOut('disp-1', 'user-1');

    expect(mockPrisma.stock.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          partId: 'part-1',
          store: { type: 'FINISHED_GOODS' },
        }),
      }),
    );
    expect(mockPrisma.stock.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.stock.update).toHaveBeenCalledWith({
      where: { id: 'stock-fg-1' },
      data: { quantityOnHand: 15 },
    });
    expect(mockPrisma.stockMovement.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          movementType: 'DISPATCH',
          quantity: 5,
        }),
      }),
    );
    expect(mockPrisma.dispatch.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'disp-1', status: { not: 'DISPATCHED' } }),
        data: expect.objectContaining({ status: 'DISPATCHED' }),
      }),
    );
  });

  // ===========================================================================
  // TEST-03: Second Gate-Out must fail
  // ===========================================================================
  it('TEST-03: Second Gate-Out must fail', async () => {
    mockPrisma.dispatch.findUnique.mockResolvedValue({
      id: 'disp-1',
      dispatchNumber: 'DSP-2026-0001',
      status: 'DISPATCHED', // already gated out
      boxes: [],
    });

    await expect(dispatchService.gateOut('disp-1', 'user-1')).rejects.toThrow(
      new BadRequestException('Dispatch has already been gated out.'),
    );
  });

  // ===========================================================================
  // TEST-04: Gate-Out must reject insufficient Finished Goods stock
  // ===========================================================================
  it('TEST-04: Gate-Out must reject insufficient Finished Goods stock', async () => {
    mockPrisma.dispatch.findUnique.mockResolvedValue({
      id: 'disp-1',
      dispatchNumber: 'DSP-2026-0001',
      status: 'PENDING',
      boxes: [
        {
          id: 'dbox-1',
          boxId: 'box-1',
          verifiedAt: new Date(),
          box: {
            boxNumber: 'BOX-001',
            items: [{ partId: 'part-1', quantity: 50, part: { name: 'Part 1' } }],
          },
        },
      ],
    });

    // Finished goods stock has only 10 on hand (requested 50)
    mockPrisma.stock.findFirst.mockResolvedValue(null);

    await expect(dispatchService.gateOut('disp-1', 'user-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(mockPrisma.stock.update).not.toHaveBeenCalled();
  });

  // ===========================================================================
  // TEST-05: Gate-Out must NEVER fall back to Raw Material/WIP/Scrap stores
  // ===========================================================================
  it('TEST-05: Gate-Out must NEVER fall back to Raw Material/WIP/Scrap stores', async () => {
    mockPrisma.dispatch.findUnique.mockResolvedValue({
      id: 'disp-1',
      dispatchNumber: 'DSP-2026-0001',
      status: 'PENDING',
      boxes: [
        {
          id: 'dbox-1',
          boxId: 'box-1',
          verifiedAt: new Date(),
          box: {
            boxNumber: 'BOX-001',
            items: [{ partId: 'part-1', quantity: 10, part: { name: 'Part 1' } }],
          },
        },
      ],
    });

    // FG store query returns null
    mockPrisma.stock.findFirst.mockImplementation(({ where }: any) => {
      if (where?.store?.type === 'FINISHED_GOODS') {
        return Promise.resolve(null);
      }
      // If a non-FG store query was attempted, it would return this raw materials stock
      return Promise.resolve({
        id: 'stock-rm-1',
        partId: 'part-1',
        storeId: 'store-rm',
        quantityOnHand: 100,
        store: { type: 'RAW_MATERIALS' },
      });
    });

    await expect(dispatchService.gateOut('disp-1', 'user-1')).rejects.toThrow(
      new BadRequestException(
        "Insufficient finished-goods stock for part 'Part 1'. Available in FINISHED_GOODS: 0, requested: 10. Gate-out blocked.",
      ),
    );

    // Verify stock was never deducted from RAW_MATERIALS
    expect(mockPrisma.stock.update).not.toHaveBeenCalled();
  });

  // ===========================================================================
  // TEST-06: Packing must reject quantities greater than available FG stock
  // ===========================================================================
  it('TEST-06: Packing must reject quantities greater than available FG stock', async () => {
    mockPrisma.box.findUnique.mockResolvedValue({
      id: 'box-1',
      status: 'OPEN',
      items: [],
    });
    mockPrisma.part.findUnique.mockResolvedValue({ id: 'part-1', name: 'Widget A' });
    mockPrisma.stock.aggregate.mockResolvedValue({
      _sum: { quantityOnHand: 5 }, // Only 5 available
    });

    await expect(
      packingService.addItemToBox('box-1', {
        partId: 'part-1',
        quantity: 10, // Requesting 10
      }),
    ).rejects.toThrow(
      new BadRequestException(
        "Insufficient finished-goods stock for part 'Widget A'. Available: 5, requested: 10. Packing rejected.",
      ),
    );
  });

  // ===========================================================================
  // TEST-07: GRN must reject quantities above remaining PO quantity
  // ===========================================================================
  it('TEST-07: GRN must reject quantities above remaining PO quantity', async () => {
    mockPrisma.purchaseOrder.findUnique.mockResolvedValue({
      id: 'po-1',
      status: 'APPROVED',
      items: [
        {
          id: 'poi-1',
          partId: 'part-1',
          orderedQty: 100,
          receivedQty: 90, // Remaining: 10
        },
      ],
    });

    await expect(
      grnService.create('user-1', {
        purchaseOrderId: 'po-1',
        items: [
          {
            poItemId: 'poi-1',
            partId: 'part-1',
            receivedQty: 15, // Exceeds remaining (10)
            acceptedQty: 15,
            storeId: 'store-1',
          },
        ],
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Received quantity (15) exceeds remaining PO quantity (10) for part.',
      ),
    );
  });

  // ===========================================================================
  // TEST-08: GRN rejected quantity requires rejectionReason
  // ===========================================================================
  it('TEST-08: GRN rejected quantity requires rejectionReason', async () => {
    mockPrisma.purchaseOrder.findUnique.mockResolvedValue({
      id: 'po-1',
      status: 'APPROVED',
      items: [
        {
          id: 'poi-1',
          partId: 'part-1',
          orderedQty: 100,
          receivedQty: 0,
        },
      ],
    });

    await expect(
      grnService.create('user-1', {
        purchaseOrderId: 'po-1',
        items: [
          {
            poItemId: 'poi-1',
            partId: 'part-1',
            receivedQty: 10,
            acceptedQty: 7,
            rejectedQty: 3,
            // rejectionReason missing
            storeId: 'store-1',
          },
        ],
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'A rejection reason is mandatory when rejected quantity is greater than 0.',
      ),
    );
  });

  // ===========================================================================
  // TEST-09: Production output cannot exceed target quantity
  // ===========================================================================
  it('TEST-09: Production output cannot exceed target quantity', async () => {
    mockPrisma.jobCard.findUnique.mockResolvedValue({
      id: 'job-1',
      jobCardNumber: 'JOB-2026-0001',
      targetQty: 50,
      status: 'IN_PROGRESS',
      partId: 'part-1',
    });

    await expect(
      productionService.completeJobCard('user-1', 'job-1', {
        producedQty: 40,
        rejectedQty: 15, // 40 + 15 = 55 > 50
        storeId: 'store-fg',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Total output (55 units: 40 produced + 15 rejected) exceeds job target quantity of 50 units.',
      ),
    );
  });

  // ===========================================================================
  // TEST-10: Completed Job Card cannot be completed again
  // ===========================================================================
  it('TEST-10: Completed Job Card cannot be completed again', async () => {
    mockPrisma.jobCard.findUnique.mockResolvedValue({
      id: 'job-1',
      jobCardNumber: 'JOB-2026-0001',
      targetQty: 50,
      status: 'COMPLETED', // Already completed
      partId: 'part-1',
    });

    await expect(
      productionService.completeJobCard('user-1', 'job-1', {
        producedQty: 50,
        rejectedQty: 0,
        storeId: 'store-fg',
      }),
    ).rejects.toThrow(
      new BadRequestException('Job Card #JOB-2026-0001 is already completed.'),
    );
  });

  // ===========================================================================
  // TEST-11: Sales Order DRAFT cannot be approved directly
  // ===========================================================================
  it('TEST-11: Sales Order DRAFT cannot be approved directly', async () => {
    mockPrisma.salesOrder.findUnique.mockResolvedValue({
      id: 'so-1',
      orderNumber: 'SO-2026-0001',
      status: 'DRAFT',
    });

    await expect(salesOrdersService.approve('so-1', 'user-1')).rejects.toThrow(
      new BadRequestException(
        'Cannot approve order in DRAFT status. Sales Order must be in SUBMITTED status before approval. Direct DRAFT approval is not permitted.',
      ),
    );
  });

  // ===========================================================================
  // TEST-12: Sales Order must follow: DRAFT → SUBMITTED → APPROVED
  // ===========================================================================
  it('TEST-12: Sales Order must follow: DRAFT → SUBMITTED → APPROVED', async () => {
    // 1. Submit from DRAFT
    mockPrisma.salesOrder.findUnique.mockResolvedValueOnce({
      id: 'so-1',
      orderNumber: 'SO-2026-0001',
      status: 'DRAFT',
    });
    mockPrisma.salesOrder.update.mockResolvedValueOnce({
      id: 'so-1',
      status: 'SUBMITTED',
    });

    const submitted = await salesOrdersService.submit('so-1');
    expect(submitted.status).toBe('SUBMITTED');

    // 2. Approve from SUBMITTED
    mockPrisma.salesOrder.findUnique.mockResolvedValueOnce({
      id: 'so-1',
      orderNumber: 'SO-2026-0001',
      status: 'SUBMITTED',
    });
    mockPrisma.salesOrder.update.mockResolvedValueOnce({
      id: 'so-1',
      status: 'APPROVED',
      approvedById: 'user-1',
    });

    const approved = await salesOrdersService.approve('so-1', 'user-1');
    expect(approved.status).toBe('APPROVED');
  });

  // ===========================================================================
  // TEST-13: Invoice can link to an APPROVED Sales Order
  // ===========================================================================
  it('TEST-13: Invoice can link to an APPROVED Sales Order', async () => {
    mockPrisma.salesOrder.findUnique.mockResolvedValue({
      id: 'so-1',
      orderNumber: 'SO-2026-0001',
      status: 'APPROVED',
      customerId: 'cust-1',
      items: [{ partId: 'part-1', orderedQty: 20 }],
      invoices: [],
    });

    mockPrisma.invoice.create.mockResolvedValue({
      id: 'inv-1',
      invoiceNumber: 'INV-2026-0001',
      salesOrderId: 'so-1',
      customerId: 'cust-1',
      status: 'DRAFT',
    });

    const invoice = await invoicesService.create('user-1', {
      customerId: 'cust-1',
      salesOrderId: 'so-1',
      items: [
        {
          partId: 'part-1',
          quantity: 10,
          unitPrice: 50,
          taxRate: 18,
        },
      ],
    });

    expect(invoice.salesOrderId).toBe('so-1');
    expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          salesOrderId: 'so-1',
          customerId: 'cust-1',
        }),
      }),
    );
  });

  // ===========================================================================
  // TEST-14: Invoice cannot link to an unapproved Sales Order
  // ===========================================================================
  it('TEST-14: Invoice cannot link to an unapproved Sales Order', async () => {
    mockPrisma.salesOrder.findUnique.mockResolvedValue({
      id: 'so-1',
      orderNumber: 'SO-2026-0001',
      status: 'SUBMITTED', // Not approved
      customerId: 'cust-1',
      items: [{ partId: 'part-1', orderedQty: 20 }],
      invoices: [],
    });

    await expect(
      invoicesService.create('user-1', {
        customerId: 'cust-1',
        salesOrderId: 'so-1',
        items: [
          {
            partId: 'part-1',
            quantity: 10,
            unitPrice: 50,
            taxRate: 18,
          },
        ],
      }),
    ).rejects.toThrow(
      new BadRequestException(
        "Cannot create invoice for Sales Order in 'SUBMITTED' status. Only APPROVED Sales Orders can be invoiced.",
      ),
    );
  });

  // ===========================================================================
  // TEST-15: Invoice quantity cannot exceed authorized Sales Order quantity
  // ===========================================================================
  it('TEST-15: Invoice quantity cannot exceed authorized Sales Order quantity', async () => {
    mockPrisma.salesOrder.findUnique.mockResolvedValue({
      id: 'so-1',
      orderNumber: 'SO-2026-0001',
      status: 'APPROVED',
      customerId: 'cust-1',
      items: [{ partId: 'part-1', orderedQty: 10 }],
      invoices: [
        {
          status: 'APPROVED',
          items: [{ partId: 'part-1', quantity: 7 }], // 7 already invoiced, 3 remaining
        },
      ],
    });

    await expect(
      invoicesService.create('user-1', {
        customerId: 'cust-1',
        salesOrderId: 'so-1',
        items: [
          {
            partId: 'part-1',
            quantity: 5, // 5 > remaining (3)
            unitPrice: 50,
            taxRate: 18,
          },
        ],
      }),
    ).rejects.toThrow(
      new BadRequestException(
        "Invoice quantity (5) exceeds remaining authorized Sales Order quantity (3) for part 'part-1'.",
      ),
    );
  });

  // ===========================================================================
  // TEST-16: Concurrent/atomic Gate-Out protection
  // ===========================================================================
  it('TEST-16: Concurrent/atomic Gate-Out protection rejects duplicate attempt when claim count is 0', async () => {
    mockPrisma.dispatch.findUnique.mockResolvedValue({
      id: 'disp-concurrent',
      dispatchNumber: 'DSP-2026-0002',
      status: 'VERIFIED',
      boxes: [
        {
          id: 'dbox-1',
          boxId: 'box-1',
          verifiedAt: new Date(),
          box: {
            boxNumber: 'BOX-001',
            items: [{ partId: 'part-1', quantity: 5, part: { name: 'Part 1' } }],
          },
        },
      ],
      customer: { name: 'Acme Corp' },
    });

    // Simulate another concurrent transaction already claiming/updating status to DISPATCHED
    mockPrisma.dispatch.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(dispatchService.gateOut('disp-concurrent', 'user-2')).rejects.toThrow(
      new BadRequestException('Dispatch has already been gated out or is not eligible for gate-out.'),
    );

    // Stock must NOT be deducted
    expect(mockPrisma.stock.update).not.toHaveBeenCalled();
    expect(mockPrisma.stockMovement.create).not.toHaveBeenCalled();
  });

  // ===========================================================================
  // TEST-17: Opening stock increase creates an ADJUSTMENT_ADD StockMovement
  // ===========================================================================
  it('TEST-17: Opening stock increase creates an ADJUSTMENT_ADD StockMovement', async () => {
    mockPrisma.part.update.mockResolvedValue({ id: 'part-1', name: 'Widget A' });
    mockPrisma.store.findFirst.mockResolvedValue({ id: 'store-1', name: 'Main Central Store' });
    mockPrisma.stock.findFirst.mockResolvedValue({
      id: 'stock-1',
      partId: 'part-1',
      storeId: 'store-1',
      quantityOnHand: 100,
    });
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-admin' });
    mockPrisma.part.findUnique.mockResolvedValue({ id: 'part-1', name: 'Widget A' });

    await mastersService.updatePart('part-1', { openingStock: 130 }, 'user-1');

    expect(mockPrisma.stock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'stock-1' },
        data: expect.objectContaining({ quantityOnHand: 130 }),
      }),
    );
    expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          partId: 'part-1',
          storeId: 'store-1',
          movementType: 'ADJUSTMENT_ADD',
          quantity: 30,
          performedById: 'user-1',
        }),
      }),
    );
  });

  // ===========================================================================
  // TEST-18: Opening stock decrease creates an ADJUSTMENT_SUB StockMovement
  // ===========================================================================
  it('TEST-18: Opening stock decrease creates an ADJUSTMENT_SUB StockMovement', async () => {
    mockPrisma.part.update.mockResolvedValue({ id: 'part-1', name: 'Widget A' });
    mockPrisma.store.findFirst.mockResolvedValue({ id: 'store-1', name: 'Main Central Store' });
    mockPrisma.stock.findFirst.mockResolvedValue({
      id: 'stock-1',
      partId: 'part-1',
      storeId: 'store-1',
      quantityOnHand: 100,
    });
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-admin' });
    mockPrisma.part.findUnique.mockResolvedValue({ id: 'part-1', name: 'Widget A' });

    await mastersService.updatePart('part-1', { openingStock: 80 }, 'user-1');

    expect(mockPrisma.stock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'stock-1' },
        data: expect.objectContaining({ quantityOnHand: 80 }),
      }),
    );
    expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          partId: 'part-1',
          storeId: 'store-1',
          movementType: 'ADJUSTMENT_SUB',
          quantity: 20,
          performedById: 'user-1',
        }),
      }),
    );
  });

  // ===========================================================================
  // TEST-19: Opening stock unchanged does not create unnecessary StockMovement
  // ===========================================================================
  it('TEST-19: Opening stock unchanged does not create unnecessary StockMovement', async () => {
    mockPrisma.part.update.mockResolvedValue({ id: 'part-1', name: 'Widget A' });
    mockPrisma.store.findFirst.mockResolvedValue({ id: 'store-1', name: 'Main Central Store' });
    mockPrisma.stock.findFirst.mockResolvedValue({
      id: 'stock-1',
      partId: 'part-1',
      storeId: 'store-1',
      quantityOnHand: 100,
    });
    mockPrisma.part.findUnique.mockResolvedValue({ id: 'part-1', name: 'Widget A' });

    await mastersService.updatePart('part-1', { openingStock: 100 }, 'user-1');

    expect(mockPrisma.stock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'stock-1' },
        data: expect.objectContaining({ quantityOnHand: 100 }),
      }),
    );
    expect(mockPrisma.stockMovement.create).not.toHaveBeenCalled();
  });

  // ===========================================================================
  // TEST-20: Invoice created with Sales Order persists salesOrderId
  // ===========================================================================
  it('TEST-20: Invoice created with Sales Order persists salesOrderId', async () => {
    mockPrisma.salesOrder.findUnique.mockResolvedValue({
      id: 'so-1',
      orderNumber: 'SO-2026-0001',
      status: 'APPROVED',
      customerId: 'cust-1',
      items: [{ partId: 'part-1', orderedQty: 20 }],
      invoices: [],
    });

    mockPrisma.invoice.create.mockResolvedValue({
      id: 'inv-1',
      invoiceNumber: 'INV-2026-0001',
      salesOrderId: 'so-1',
      customerId: 'cust-1',
      status: 'DRAFT',
    });

    const result = await invoicesService.create('user-1', {
      customerId: 'cust-1',
      salesOrderId: 'so-1',
      items: [{ partId: 'part-1', quantity: 15, unitPrice: 100, taxRate: 18 }],
    });

    expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerId: 'cust-1',
          salesOrderId: 'so-1',
        }),
      }),
    );
    expect(result.salesOrderId).toBe('so-1');
  });

  // ===========================================================================
  // TEST-21: Invoice creation payload with undefined salesOrderId is backward compatible
  // ===========================================================================
  it('TEST-21: Invoice creation payload with undefined salesOrderId is backward compatible', async () => {
    mockPrisma.invoice.create.mockResolvedValue({
      id: 'inv-direct',
      invoiceNumber: 'INV-2026-0002',
      salesOrderId: null,
      customerId: 'cust-1',
      status: 'DRAFT',
    });

    const result = await invoicesService.create('user-1', {
      customerId: 'cust-1',
      items: [{ partId: 'part-1', quantity: 10, unitPrice: 100, taxRate: 18 }],
    });

    expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerId: 'cust-1',
          salesOrderId: null,
        }),
      }),
    );
    expect(result.salesOrderId).toBeNull();
  });
});
