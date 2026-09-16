import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GrnService } from '../grn/grn.service';
import { PurchaseOrdersService } from '../purchase-orders/purchase-orders.service';
import { InventoryService } from '../inventory/inventory.service';
import { ProductionService } from '../production/production.service';
import { PackingService } from '../packing/packing.service';
import { SalesOrdersService } from '../sales-orders/sales-orders.service';
import { InvoicesService } from '../invoices/invoices.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { GatePassService } from '../dispatch/gate-pass.service';
import { ChallanService } from '../dispatch/challan.service';

describe('Manufacturing ERP 2.0 — Phase 3.2 Regression Suite (TEST-22 to TEST-42)', () => {
  let grnService: GrnService;
  let poService: PurchaseOrdersService;
  let inventoryService: InventoryService;
  let productionService: ProductionService;
  let packingService: PackingService;
  let salesOrdersService: SalesOrdersService;
  let invoicesService: InvoicesService;
  let dispatchService: DispatchService;
  let gatePassService: GatePassService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      $transaction: jest.fn((cb) => cb(mockPrisma)),
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      purchaseOrder: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      purchaseOrderItem: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      gRN: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      stock: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        aggregate: jest.fn().mockResolvedValue({ _sum: { quantityOnHand: 500 } }),
      },
      stockMovement: {
        create: jest.fn(),
      },
      part: {
        findUnique: jest.fn(),
      },
      jobCard: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      productionPlan: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      packingOrder: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      packingOrderItem: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      box: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      boxItem: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      barcode: {
        create: jest.fn(),
      },
      salesOrder: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      invoice: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      dispatch: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(0),
      },
      dispatchBox: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      gatePass: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(0),
      },
      store: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GrnService,
        PurchaseOrdersService,
        InventoryService,
        ProductionService,
        PackingService,
        SalesOrdersService,
        InvoicesService,
        DispatchService,
        GatePassService,
        ChallanService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    grnService = module.get<GrnService>(GrnService);
    poService = module.get<PurchaseOrdersService>(PurchaseOrdersService);
    inventoryService = module.get<InventoryService>(InventoryService);
    productionService = module.get<ProductionService>(ProductionService);
    packingService = module.get<PackingService>(PackingService);
    salesOrdersService = module.get<SalesOrdersService>(SalesOrdersService);
    invoicesService = module.get<InvoicesService>(InvoicesService);
    dispatchService = module.get<DispatchService>(DispatchService);
    gatePassService = module.get<GatePassService>(GatePassService);
  });

  // ===========================================================================
  // SECTION 1: OBJECTIVE 1 — GRN & PO STATUS SYNCHRONIZATION (TEST-22 to TEST-24)
  // ===========================================================================

  describe('Objective 1: GRN & PO Status Synchronization', () => {
    it('TEST-22: 100% rejected GRN does not advance PO status to PARTIAL', async () => {
      mockPrisma.gRN.findUnique.mockResolvedValue({
        id: 'grn-1',
        grnNumber: 'GRN-2026-0001',
        status: 'DRAFT',
        purchaseOrderId: 'po-1',
        purchaseOrder: { id: 'po-1', status: 'APPROVED', supplierId: 'sup-1', supplier: { name: 'Supplier' } },
        items: [
          {
            id: 'gi-1',
            poItemId: 'poi-1',
            partId: 'part-1',
            receivedQty: 50,
            acceptedQty: 0,
            rejectedQty: 50,
            storeId: 'store-1',
          },
        ],
      });

      mockPrisma.gRN.update.mockResolvedValue({ id: 'grn-1', status: 'REJECTED' });
      mockPrisma.purchaseOrderItem.findMany.mockResolvedValue([
        { id: 'poi-1', orderedQty: 50, receivedQty: 0 },
      ]);
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({ id: 'po-1', status: 'APPROVED' });

      await grnService.verify('grn-1', 'user-1');

      // PO status update must NOT be called to set 'PARTIAL'
      expect(mockPrisma.purchaseOrder.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'po-1' },
          data: { status: 'PARTIAL' },
        }),
      );
      // Stock must not be touched
      expect(mockPrisma.stock.create).not.toHaveBeenCalled();
      expect(mockPrisma.stock.update).not.toHaveBeenCalled();
    });

    it('TEST-23: Partial accepted/rejected GRN correctly updates PO status to PARTIAL', async () => {
      mockPrisma.gRN.findUnique.mockResolvedValue({
        id: 'grn-2',
        grnNumber: 'GRN-2026-0002',
        status: 'DRAFT',
        purchaseOrderId: 'po-1',
        purchaseOrder: { id: 'po-1', status: 'APPROVED', supplierId: 'sup-1', supplier: { name: 'Supplier' } },
        items: [
          {
            id: 'gi-2',
            poItemId: 'poi-1',
            partId: 'part-1',
            receivedQty: 50,
            acceptedQty: 30,
            rejectedQty: 20,
            storeId: 'store-1',
          },
        ],
      });

      mockPrisma.gRN.update.mockResolvedValue({ id: 'grn-2', status: 'PARTIALLY_ACCEPTED' });
      mockPrisma.stock.findFirst.mockResolvedValue(null);
      mockPrisma.purchaseOrderItem.findMany.mockResolvedValue([
        { id: 'poi-1', orderedQty: 50, receivedQty: 30 },
      ]);
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({ id: 'po-1', status: 'APPROVED' });

      await grnService.verify('grn-2', 'user-1');

      expect(mockPrisma.purchaseOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-1' },
        data: { status: 'PARTIAL' },
      });
      expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            movementType: 'GRN_RECEIPT',
            quantity: 30,
          }),
        }),
      );
    });

    it('TEST-24: Multiple GRNs cumulative status moves to COMPLETED when fully fulfilled', async () => {
      mockPrisma.gRN.findUnique.mockResolvedValue({
        id: 'grn-3',
        grnNumber: 'GRN-2026-0003',
        status: 'DRAFT',
        purchaseOrderId: 'po-1',
        purchaseOrder: { id: 'po-1', status: 'PARTIAL', supplierId: 'sup-1', supplier: { name: 'Supplier' } },
        items: [
          {
            id: 'gi-3',
            poItemId: 'poi-1',
            partId: 'part-1',
            receivedQty: 20,
            acceptedQty: 20,
            rejectedQty: 0,
            storeId: 'store-1',
          },
        ],
      });

      mockPrisma.gRN.update.mockResolvedValue({ id: 'grn-3', status: 'VERIFIED' });
      mockPrisma.stock.findFirst.mockResolvedValue({ id: 'st-1', quantityOnHand: 30 });
      // After adding 20, total received reaches 50/50
      mockPrisma.purchaseOrderItem.findMany.mockResolvedValue([
        { id: 'poi-1', orderedQty: 50, receivedQty: 50 },
      ]);
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({ id: 'po-1', status: 'PARTIAL' });

      await grnService.verify('grn-3', 'user-1');

      expect(mockPrisma.purchaseOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-1' },
        data: { status: 'COMPLETED' },
      });
    });
  });

  // ===========================================================================
  // SECTION 2: OBJECTIVE 2 — UNIVERSAL AUDIT LOGGING (TEST-25 to TEST-32)
  // ===========================================================================

  describe('Objective 2: Universal Audit Logging', () => {
    it('TEST-25: PO approval creates audit event', async () => {
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({
        id: 'po-100',
        status: 'SUBMITTED',
        supplier: {},
        items: [],
      });
      mockPrisma.purchaseOrder.update.mockResolvedValue({ id: 'po-100', status: 'APPROVED' });

      await poService.approve('po-100', 'approver-1');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'approver-1',
            action: 'APPROVE',
            module: 'PO',
            entityName: 'PurchaseOrder',
            entityId: 'po-100',
          }),
        }),
      );
    });

    it('TEST-26: GRN verification creates audit event', async () => {
      mockPrisma.gRN.findUnique.mockResolvedValue({
        id: 'grn-100',
        status: 'DRAFT',
        grnNumber: 'GRN-100',
        purchaseOrderId: 'po-1',
        purchaseOrder: { id: 'po-1', supplierId: 'sup-1', supplier: {} },
        items: [{ poItemId: 'poi-1', partId: 'p-1', receivedQty: 10, acceptedQty: 10, rejectedQty: 0, storeId: 'st-1' }],
      });
      mockPrisma.gRN.update.mockResolvedValue({ id: 'grn-100', status: 'VERIFIED' });
      mockPrisma.purchaseOrderItem.findMany.mockResolvedValue([{ id: 'poi-1', orderedQty: 10, receivedQty: 10 }]);
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({ id: 'po-1', status: 'APPROVED' });

      await grnService.verify('grn-100', 'verifier-1');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'verifier-1',
            action: 'VERIFY',
            module: 'GRN',
            entityName: 'GRN',
            entityId: 'grn-100',
          }),
        }),
      );
    });

    it('TEST-27: Stock adjustment creates audit event', async () => {
      mockPrisma.stock.findFirst.mockResolvedValue({ id: 'stock-1', quantityOnHand: 50 });
      mockPrisma.stockMovement.create.mockResolvedValue({ id: 'mv-1', movementType: 'ADJUSTMENT_ADD' });

      await inventoryService.adjustStock('user-adj', {
        partId: 'part-1',
        storeId: 'store-1',
        quantity: 15,
        reason: 'Cycle count correction',
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-adj',
            action: 'ADJUST',
            module: 'STOCK',
            entityName: 'Stock',
          }),
        }),
      );
    });

    it('TEST-28: Job Card completion creates audit event', async () => {
      mockPrisma.jobCard.findUnique.mockResolvedValue({
        id: 'jc-1',
        jobCardNumber: 'JC-2026-0001',
        status: 'IN_PROGRESS',
        targetQty: 100,
        partId: 'part-fg',
      });
      mockPrisma.jobCard.update.mockResolvedValue({ id: 'jc-1', status: 'COMPLETED' });

      await productionService.completeJobCard('user-prod', 'jc-1', {
        producedQty: 95,
        rejectedQty: 5,
        storeId: 'store-fg',
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-prod',
            action: 'COMPLETE',
            module: 'PRODUCTION',
            entityName: 'JobCard',
            entityId: 'jc-1',
          }),
        }),
      );
    });

    it('TEST-29: Packing seal creates audit event', async () => {
      mockPrisma.box.findUnique.mockResolvedValue({
        id: 'box-1',
        boxNumber: 'BOX-0001',
        barcode: 'BOX-20260916-0001',
        status: 'OPEN',
        items: [{ id: 'bi-1', partId: 'p-1', quantity: 10 }],
      });
      mockPrisma.box.update.mockResolvedValue({ id: 'box-1', status: 'SEALED' });

      await packingService.closeAndSealBox('user-pack', 'box-1');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-pack',
            action: 'SEAL',
            module: 'PACKING',
            entityName: 'Box',
            entityId: 'box-1',
          }),
        }),
      );
    });

    it('TEST-30: Sales Order approval creates audit event', async () => {
      mockPrisma.salesOrder.findUnique.mockResolvedValue({
        id: 'so-1',
        orderNumber: 'SO-0001',
        status: 'SUBMITTED',
        customer: {},
        items: [],
      });
      mockPrisma.salesOrder.update.mockResolvedValue({ id: 'so-1', status: 'APPROVED' });

      await salesOrdersService.approve('so-1', 'user-sales-mgr');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-sales-mgr',
            action: 'APPROVE',
            module: 'SALES',
            entityName: 'SalesOrder',
            entityId: 'so-1',
          }),
        }),
      );
    });

    it('TEST-31: Invoice approval/payment audit event', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-0001',
        status: 'APPROVED',
        items: [],
        customer: {},
      });
      mockPrisma.invoice.update.mockResolvedValue({ id: 'inv-1', status: 'PAID' });

      await invoicesService.confirmPayment('inv-1', 'user-billing', {
        paymentMethod: 'NEFT',
        transactionRef: 'TXN-999',
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-billing',
            action: 'PAYMENT_CONFIRM',
            module: 'INVOICE',
            entityName: 'Invoice',
            entityId: 'inv-1',
          }),
        }),
      );
    });

    it('TEST-32: Gate-Out audit event remains present', async () => {
      const mockDispatch = {
        id: 'dsp-1',
        dispatchNumber: 'DSP-0001',
        status: 'READY_FOR_GATE_OUT',
        boxes: [
          {
            verifiedAt: new Date(),
            box: {
              id: 'box-1',
              boxNumber: 'BOX-0001',
              status: 'SEALED',
              items: [{ partId: 'part-fg', quantity: 20 }],
            },
          },
        ],
      };
      mockPrisma.dispatch.findUnique.mockResolvedValue(mockDispatch);
      mockPrisma.store.findFirst.mockResolvedValue({ id: 'store-fg', type: 'FINISHED' });
      mockPrisma.stock.findFirst.mockResolvedValue({ id: 'stock-fg-1', quantityOnHand: 100 });
      const mockGp = {
        id: 'gp-1',
        dispatchId: 'dsp-1',
        status: 'VERIFIED',
        dispatch: mockDispatch,
      };
      mockPrisma.gatePass.findUnique.mockResolvedValue(mockGp);
      mockPrisma.gatePass.findFirst.mockResolvedValue(mockGp);

      await gatePassService.authorizeGateOut('dsp-1', 'user-guard');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-guard',
            action: 'GATE_OUT',
            module: 'DISPATCH',
            entityName: 'GatePass',
          }),
        }),
      );
    });
  });

  // ===========================================================================
  // SECTION 3: OBJECTIVE 3 — PACKING ORDER INTEGRATION (TEST-33 to TEST-36)
  // ===========================================================================

  describe('Objective 3: PackingOrder Integration', () => {
    it('TEST-33: Box can be created against valid PackingOrder', async () => {
      mockPrisma.packingOrder.findUnique.mockResolvedValue({
        id: 'pko-1',
        orderNumber: 'PKO-0001',
        status: 'RELEASED',
        salesOrder: { id: 'so-1', status: 'APPROVED' },
      });
      mockPrisma.box.create.mockResolvedValue({
        id: 'box-pko-1',
        boxNumber: 'BOX-0001',
        packingOrderId: 'pko-1',
      });

      const box = await packingService.createBox({ packingOrderId: 'pko-1' });

      expect(mockPrisma.box.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            packingOrderId: 'pko-1',
          }),
        }),
      );
      expect(box.packingOrderId).toBe('pko-1');
    });

    it('TEST-34: Box creation rejects unapproved Sales Order on PackingOrder', async () => {
      mockPrisma.packingOrder.findUnique.mockResolvedValue({
        id: 'pko-draft',
        orderNumber: 'PKO-DRAFT',
        status: 'DRAFT',
        salesOrder: { id: 'so-draft', status: 'DRAFT' },
      });

      await expect(packingService.createBox({ packingOrderId: 'pko-draft' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('TEST-35: Unauthorized PackingOrder quantity or unlisted part is rejected', async () => {
      mockPrisma.box.findUnique.mockResolvedValue({
        id: 'box-pko-1',
        status: 'OPEN',
        packingOrderId: 'pko-1',
      });
      // Part not on packing order
      mockPrisma.packingOrderItem.findFirst.mockResolvedValue(null);

      await expect(
        packingService.addItemToBox('box-pko-1', { partId: 'unauthorized-part', quantity: 10 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('TEST-36: Sealed box cannot be modified', async () => {
      mockPrisma.box.findUnique.mockResolvedValue({
        id: 'box-sealed-1',
        status: 'SEALED',
      });

      await expect(
        packingService.addItemToBox('box-sealed-1', { partId: 'part-1', quantity: 5 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===========================================================================
  // SECTION 4: OBJECTIVE 4 — DISPATCH MANIFEST VALIDATION (TEST-37 to TEST-42)
  // ===========================================================================

  describe('Objective 4: Dispatch Manifest Validation', () => {
    it('TEST-37: Valid box/invoice combination is accepted', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-valid',
        invoiceNumber: 'INV-2026-0001',
        customerId: 'cust-1',
        salesOrderId: 'so-1',
        items: [{ partId: 'part-a', quantity: 100, part: { name: 'Part A' } }],
        salesOrder: {
          id: 'so-1',
          customerId: 'cust-1',
          orderNumber: 'SO-0001',
          items: [{ partId: 'part-a', part: { name: 'Part A' } }],
        },
      });

      mockPrisma.box.findMany.mockResolvedValue([
        {
          id: 'box-1',
          boxNumber: 'BOX-0001',
          status: 'SEALED',
          items: [{ partId: 'part-a', quantity: 50, part: { name: 'Part A' } }],
          packingOrder: { salesOrderId: 'so-1' },
          dispatchBoxes: [],
        },
        {
          id: 'box-2',
          boxNumber: 'BOX-0002',
          status: 'SEALED',
          items: [{ partId: 'part-a', quantity: 50, part: { name: 'Part A' } }],
          packingOrder: { salesOrderId: 'so-1' },
          dispatchBoxes: [],
        },
      ]);

      mockPrisma.dispatch.create.mockResolvedValue({
        id: 'dsp-valid',
        dispatchNumber: 'DSP-0001',
        invoiceId: 'inv-valid',
      });

      const dsp = await dispatchService.create('user-dispatch', {
        invoiceId: 'inv-valid',
        boxIds: ['box-1', 'box-2'],
      });

      expect(dsp).toBeDefined();
      expect(mockPrisma.dispatch.create).toHaveBeenCalled();
    });

    it('TEST-38: Box containing unauthorized part not on invoice is rejected', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-0001',
        customerId: 'cust-1',
        items: [{ partId: 'part-a', quantity: 100, part: { name: 'Part A' } }],
      });

      mockPrisma.box.findMany.mockResolvedValue([
        {
          id: 'box-c',
          boxNumber: 'BOX-UNAUTH',
          status: 'SEALED',
          items: [{ partId: 'part-c', quantity: 10, part: { name: 'Part C' } }],
          dispatchBoxes: [],
        },
      ]);

      await expect(
        dispatchService.create('user-1', { invoiceId: 'inv-1', boxIds: ['box-c'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('TEST-39: Single box quantity exceeding invoice quantity is rejected', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-0001',
        customerId: 'cust-1',
        items: [{ partId: 'part-a', quantity: 50, part: { name: 'Part A' } }],
      });

      mockPrisma.box.findMany.mockResolvedValue([
        {
          id: 'box-huge',
          boxNumber: 'BOX-HUGE',
          status: 'SEALED',
          items: [{ partId: 'part-a', quantity: 60, part: { name: 'Part A' } }],
          dispatchBoxes: [],
        },
      ]);

      await expect(
        dispatchService.create('user-1', { invoiceId: 'inv-1', boxIds: ['box-huge'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('TEST-40: Cumulative box quantity exceeding invoice quantity is rejected', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-0001',
        customerId: 'cust-1',
        items: [{ partId: 'part-a', quantity: 100, part: { name: 'Part A' } }],
      });

      mockPrisma.box.findMany.mockResolvedValue([
        {
          id: 'b-1',
          boxNumber: 'BOX-1',
          status: 'SEALED',
          items: [{ partId: 'part-a', quantity: 40, part: { name: 'Part A' } }],
          dispatchBoxes: [],
        },
        {
          id: 'b-2',
          boxNumber: 'BOX-2',
          status: 'SEALED',
          items: [{ partId: 'part-a', quantity: 60, part: { name: 'Part A' } }],
          dispatchBoxes: [],
        },
        {
          id: 'b-3',
          boxNumber: 'BOX-3',
          status: 'SEALED',
          items: [{ partId: 'part-a', quantity: 10, part: { name: 'Part A' } }],
          dispatchBoxes: [],
        },
      ]);

      await expect(
        dispatchService.create('user-1', { invoiceId: 'inv-1', boxIds: ['b-1', 'b-2', 'b-3'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('TEST-41: Already dispatched box is rejected from new manifest', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-0001',
        customerId: 'cust-1',
        items: [{ partId: 'part-a', quantity: 100, part: { name: 'Part A' } }],
      });

      mockPrisma.box.findMany.mockResolvedValue([
        {
          id: 'box-disp',
          boxNumber: 'BOX-DISP',
          status: 'SEALED',
          items: [{ partId: 'part-a', quantity: 50, part: { name: 'Part A' } }],
          dispatchBoxes: [
            { dispatch: { id: 'dsp-old', status: 'DISPATCHED' } },
          ],
        },
      ]);

      await expect(
        dispatchService.create('user-1', { invoiceId: 'inv-1', boxIds: ['box-disp'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('TEST-42: Box linked to wrong Sales Order is rejected', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-so1',
        invoiceNumber: 'INV-0001',
        customerId: 'cust-1',
        salesOrderId: 'so-1',
        items: [{ partId: 'part-a', quantity: 100, part: { name: 'Part A' } }],
      });

      mockPrisma.box.findMany.mockResolvedValue([
        {
          id: 'box-so2',
          boxNumber: 'BOX-SO2',
          status: 'SEALED',
          items: [{ partId: 'part-a', quantity: 50, part: { name: 'Part A' } }],
          packingOrder: {
            salesOrderId: 'so-2',
            salesOrder: { orderNumber: 'SO-0002' },
          },
          dispatchBoxes: [],
        },
      ]);

      await expect(
        dispatchService.create('user-1', { invoiceId: 'inv-so1', boxIds: ['box-so2'] }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
