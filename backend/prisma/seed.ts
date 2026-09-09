import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Manufacturing ERP 2.0 database...');

  // 1. Permissions
  const permissionsList = [
    // Users & Roles
    { code: 'users.view', module: 'Users', description: 'View system users' },
    { code: 'users.create', module: 'Users', description: 'Create system users' },
    { code: 'users.edit', module: 'Users', description: 'Edit system users' },
    { code: 'roles.manage', module: 'Roles', description: 'Manage roles and permissions' },

    // Master Data
    { code: 'masters.view', module: 'Masters', description: 'View master data' },
    { code: 'masters.create', module: 'Masters', description: 'Create master records' },
    { code: 'masters.edit', module: 'Masters', description: 'Edit master records' },
    { code: 'masters.delete', module: 'Masters', description: 'Deactivate/delete master records' },

    // Purchase Orders
    { code: 'po.view', module: 'Purchase', description: 'View purchase orders' },
    { code: 'po.create', module: 'Purchase', description: 'Create purchase orders' },
    { code: 'po.edit', module: 'Purchase', description: 'Edit purchase orders' },
    { code: 'po.approve', module: 'Purchase', description: 'Approve or reject purchase orders' },

    // Inwarding / GRN
    { code: 'grn.view', module: 'Inwarding', description: 'View GRNs' },
    { code: 'grn.create', module: 'Inwarding', description: 'Create GRN and inward materials' },
    { code: 'grn.verify', module: 'Inwarding', description: 'Quality inspection and sign-off' },

    // Inventory
    { code: 'inventory.view', module: 'Inventory', description: 'View stock levels and movements' },
    { code: 'inventory.manage', module: 'Inventory', description: 'Stock transfers and general management' },
    { code: 'inventory.adjust', module: 'Inventory', description: 'Stock adjustments' },
    { code: 'inventory.issue', module: 'Inventory', description: 'Issue material to production' },
    { code: 'inventory.return', module: 'Inventory', description: 'Return material from production' },

    // Production & BOM
    { code: 'production.view', module: 'Production', description: 'View BOM, plans and job cards' },
    { code: 'production.manage', module: 'Production', description: 'Create BOM, plans and complete job cards' },

    // Packing & Boxes
    { code: 'packing.view', module: 'Packing', description: 'View packing records and boxes' },
    { code: 'packing.manage', module: 'Packing', description: 'Create boxes and pack items' },
    { code: 'packing.close', module: 'Packing', description: 'Close, seal or reopen boxes' },

    // Barcode Engine
    { code: 'barcode.scan', module: 'Barcode', description: 'Scan barcodes for operations' },
    { code: 'barcode.print', module: 'Barcode', description: 'Print barcode and box labels' },

    // Billing & Invoices
    { code: 'billing.view', module: 'Billing', description: 'View invoices' },
    { code: 'billing.manage', module: 'Billing', description: 'Create and edit invoices' },
    { code: 'billing.approve', module: 'Billing', description: 'Approve invoices' },

    // Dispatch
    { code: 'dispatch.view', module: 'Dispatch', description: 'View dispatches' },
    { code: 'dispatch.manage', module: 'Dispatch', description: 'Create dispatches and manifest' },
    { code: 'dispatch.gate_out', module: 'Dispatch', description: 'Authorize gate-out' },

    // Reports & Audit
    { code: 'reports.view', module: 'Reports', description: 'View business reports' },
    { code: 'reports.export', module: 'Reports', description: 'Export reports to Excel and PDF' },
    { code: 'audit.view', module: 'Audit', description: 'View system audit trails' },
    { code: 'documents.view', module: 'Documents', description: 'View documents and drawings' },
    { code: 'documents.upload', module: 'Documents', description: 'Upload documents' },
  ];

  const permissionsMap = new Map<string, string>();
  for (const p of permissionsList) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
    permissionsMap.set(p.code, perm.id);
  }

  // 2. Roles
  const rolesList = [
    { name: 'Administrator', description: 'Superuser with unrestricted access', isSystem: true },
    { name: 'Management', description: 'Executive dashboard, reporting and approval powers' },
    { name: 'Purchase User', description: 'Supplier management and purchase order operations' },
    { name: 'Stores User', description: 'Warehouse, stock inwarding, GRN and issues' },
    { name: 'Production User', description: 'BOM, production plans, and job card tracking' },
    { name: 'Quality User', description: 'Quality inspection and verification' },
    { name: 'Packing User', description: 'Box packing and barcode labeling' },
    { name: 'Billing User', description: 'Invoicing, taxes and billing verification' },
    { name: 'Dispatch User', description: 'Shipment manifest, box verification, and gate-out' },
  ];

  const rolesMap = new Map<string, string>();
  for (const r of rolesList) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: r,
    });
    rolesMap.set(r.name, role.id);
  }

  // Role Permissions Mapping
  const rolePermissionAssignments: Record<string, string[]> = {
    Administrator: permissionsList.map((p) => p.code),
    Management: [
      'users.view', 'masters.view', 'po.view', 'po.approve', 'grn.view',
      'inventory.view', 'production.view', 'packing.view', 'billing.view',
      'billing.approve', 'dispatch.view', 'dispatch.gate_out', 'reports.view',
      'reports.export', 'audit.view', 'documents.view'
    ],
    'Purchase User': ['masters.view', 'masters.create', 'masters.edit', 'po.view', 'po.create', 'po.edit', 'grn.view', 'inventory.view', 'reports.view'],
    'Stores User': ['masters.view', 'po.view', 'grn.view', 'grn.create', 'inventory.view', 'inventory.manage', 'inventory.adjust', 'inventory.issue', 'inventory.return', 'barcode.scan'],
    'Production User': ['masters.view', 'production.view', 'production.manage', 'inventory.view', 'inventory.issue', 'inventory.return', 'barcode.scan'],
    'Quality User': ['masters.view', 'po.view', 'grn.view', 'grn.verify', 'production.view', 'barcode.scan'],
    'Packing User': ['masters.view', 'packing.view', 'packing.manage', 'packing.close', 'barcode.scan', 'barcode.print'],
    'Billing User': ['masters.view', 'billing.view', 'billing.manage', 'billing.approve', 'packing.view', 'reports.view'],
    'Dispatch User': ['masters.view', 'dispatch.view', 'dispatch.manage', 'dispatch.gate_out', 'packing.view', 'barcode.scan'],
  };

  for (const [roleName, permCodes] of Object.entries(rolePermissionAssignments)) {
    const roleId = rolesMap.get(roleName);
    if (!roleId) continue;
    for (const code of permCodes) {
      const permissionId = permissionsMap.get(code);
      if (permissionId) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId, permissionId } },
          update: {},
          create: { roleId, permissionId },
        });
      }
    }
  }

  // 3. Users
  const defaultPassword = await bcrypt.hash('Admin@12345', 10);
  const usersList = [
    { email: 'admin@erp.local', firstName: 'System', lastName: 'Admin', roleName: 'Administrator', phone: '+1234567890' },
    { email: 'mgmt@erp.local', firstName: 'Sarah', lastName: 'Jenkins', roleName: 'Management', phone: '+1234567891' },
    { email: 'purchase@erp.local', firstName: 'David', lastName: 'Miller', roleName: 'Purchase User', phone: '+1234567892' },
    { email: 'stores@erp.local', firstName: 'Robert', lastName: 'Chen', roleName: 'Stores User', phone: '+1234567893' },
    { email: 'production@erp.local', firstName: 'Michael', lastName: 'Vance', roleName: 'Production User', phone: '+1234567894' },
    { email: 'quality@erp.local', firstName: 'Elena', lastName: 'Rostova', roleName: 'Quality User', phone: '+1234567895' },
    { email: 'packing@erp.local', firstName: 'Carlos', lastName: 'Gomez', roleName: 'Packing User', phone: '+1234567896' },
    { email: 'billing@erp.local', firstName: 'Anita', lastName: 'Deshmukh', roleName: 'Billing User', phone: '+1234567897' },
    { email: 'dispatch@erp.local', firstName: 'Thomas', lastName: 'Wright', roleName: 'Dispatch User', phone: '+1234567898' },
  ];

  const userMap = new Map<string, any>();
  for (const u of usersList) {
    const roleId = rolesMap.get(u.roleName)!;
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash: defaultPassword,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        roleId,
        isActive: true,
      },
    });
    userMap.set(u.email, user);
  }

  // 4. Units & Stores & Locations
  const units = [
    { name: 'Pieces', symbol: 'PCS' },
    { name: 'Kilograms', symbol: 'KG' },
    { name: 'Meters', symbol: 'MTR' },
    { name: 'Boxes', symbol: 'BOX' },
  ];
  const unitMap = new Map<string, any>();
  for (const u of units) {
    const unit = await prisma.unit.upsert({
      where: { symbol: u.symbol },
      update: {},
      create: u,
    });
    unitMap.set(u.symbol, unit);
  }

  const stores = [
    { code: 'RM-STORE', name: 'Raw Material Main Warehouse', type: 'RAW_MATERIALS' },
    { code: 'WIP-STORE', name: 'Work in Progress Holding', type: 'GENERAL' },
    { code: 'FG-STORE', name: 'Finished Goods Dispatch Hub', type: 'FINISHED_GOODS' },
  ];
  const storeMap = new Map<string, any>();
  for (const s of stores) {
    const store = await prisma.store.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
    storeMap.set(s.code, store);
  }

  const rmStore = storeMap.get('RM-STORE');
  const fgStore = storeMap.get('FG-STORE');

  const locations = [
    { storeId: rmStore.id, code: 'RACK-A1', name: 'RM Heavy Metals Bay', rack: 'A', bin: '1' },
    { storeId: rmStore.id, code: 'RACK-B2', name: 'RM Polymer & Fasteners', rack: 'B', bin: '2' },
    { storeId: fgStore.id, code: 'BAY-01', name: 'FG Packaging & Dispatch Staging', rack: 'FG-1', bin: 'A' },
  ];
  const locationMap = new Map<string, any>();
  for (const loc of locations) {
    const l = await prisma.location.upsert({
      where: { storeId_code: { storeId: loc.storeId, code: loc.code } },
      update: {},
      create: loc,
    });
    locationMap.set(loc.code, l);
  }

  // 5. Taxes & Transporters
  const taxes = [
    { name: 'GST 18%', rate: 18.0, type: 'GST' },
    { name: 'GST 12%', rate: 12.0, type: 'GST' },
    { name: 'GST 5%', rate: 5.0, type: 'GST' },
  ];
  for (const t of taxes) {
    await prisma.tax.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
  }

  const transporters = [
    { code: 'TRP-EXPRESS', name: 'FastTrack Logistics Ltd', contactPerson: 'John Walker', phone: '+1999888777', vehicleNumbers: 'MH-12-AB-1234, DL-01-XY-9876' },
    { code: 'TRP-GLOBAL', name: 'Apex Freight Carriers', contactPerson: 'Vikram Singh', phone: '+1999555444', vehicleNumbers: 'KA-04-EF-5678' },
  ];
  for (const trp of transporters) {
    await prisma.transporter.upsert({
      where: { code: trp.code },
      update: {},
      create: trp,
    });
  }

  // 6. Customers & Suppliers
  const customers = [
    { code: 'CUST-001', name: 'Nexus Automotive Corp', email: 'procurement@nexusauto.com', phone: '+1800111222', gstin: '27AABCU9603R1ZN', billingAddress: '100 Industrial Parkway, Detroit, MI', shippingAddress: '100 Industrial Parkway, Detroit, MI' },
    { code: 'CUST-002', name: 'Aerotech Precision Systems', email: 'orders@aerotech.io', phone: '+1800333444', gstin: '29AAACA9001P1Z8', billingAddress: '42 Aerospace Way, Seattle, WA', shippingAddress: '42 Aerospace Way, Seattle, WA' },
  ];
  const customerMap = new Map<string, any>();
  for (const c of customers) {
    const cust = await prisma.customer.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
    customerMap.set(c.code, cust);
  }

  const suppliers = [
    { code: 'SUPP-001', name: 'Apex Steel & Alloys', email: 'sales@apexsteel.com', phone: '+1777222333', gstin: '27AABCA1234R1ZM', address: '78 Foundry Road, Cleveland, OH', paymentTerms: 'Net 30' },
    { code: 'SUPP-002', name: 'Precision Fasteners & Polymers', email: 'supply@precisionfast.com', phone: '+1777444555', gstin: '27AABCP5678R1ZX', address: '12 Polymer Lane, Akron, OH', paymentTerms: 'Net 45' },
  ];
  const supplierMap = new Map<string, any>();
  for (const s of suppliers) {
    const supp = await prisma.supplier.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
    supplierMap.set(s.code, supp);
  }

  // 7. Parts (Raw Materials & Finished Goods)
  const parts = [
    // Raw Materials
    {
      code: 'PRT-RM-001',
      name: 'Cold Rolled Steel Coil 2mm',
      partType: 'RAW_MATERIAL',
      unitId: unitMap.get('KG')!.id,
      minStockLevel: 500,
      standardCost: 85.50,
      hsnCode: '7209',
      barcodeValue: 'PRT-RM-001-CODE128',
    },
    {
      code: 'PRT-RM-002',
      name: 'High Tensile Hex Bolt M8x40',
      partType: 'RAW_MATERIAL',
      unitId: unitMap.get('PCS')!.id,
      minStockLevel: 2000,
      standardCost: 4.25,
      hsnCode: '7318',
      barcodeValue: 'PRT-RM-002-CODE128',
    },
    // Finished Goods
    {
      code: 'PRT-FG-101',
      name: 'Automotive Engine Mounting Bracket',
      partType: 'FINISHED_GOOD',
      unitId: unitMap.get('PCS')!.id,
      minStockLevel: 100,
      standardCost: 350.00,
      hsnCode: '8708',
      barcodeValue: 'PRT-FG-101-CODE128',
    },
  ];

  const partMap = new Map<string, any>();
  for (const p of parts) {
    const part = await prisma.part.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
    partMap.set(p.code, part);

    // Register in Barcode master
    await prisma.barcode.upsert({
      where: { code: p.barcodeValue },
      update: {},
      create: {
        code: p.barcodeValue,
        symbology: 'CODE128',
        entityType: 'PART',
        entityId: part.id,
        metadata: JSON.stringify({ partCode: p.code, name: p.name }),
        status: 'ACTIVE',
      },
    });
  }

  // 8. Bill of Materials (BOM)
  const fgPart = partMap.get('PRT-FG-101');
  const rmSteel = partMap.get('PRT-RM-001');
  const rmBolt = partMap.get('PRT-RM-002');

  const bom = await prisma.bOM.upsert({
    where: { bomCode: 'BOM-BRKT-001' },
    update: {},
    create: {
      bomCode: 'BOM-BRKT-001',
      partId: fgPart.id,
      version: '1.0',
      notes: 'Standard engine mounting bracket assembly',
      items: {
        create: [
          { partId: rmSteel.id, quantityRequired: 1.8, scrapPercentage: 5.0 },
          { partId: rmBolt.id, quantityRequired: 4.0, scrapPercentage: 1.0 },
        ],
      },
    },
  });

  // 9. Initial Inventory & Stock Ledger
  const adminUser = userMap.get('admin@erp.local');
  const rackA1 = locationMap.get('RACK-A1');
  const rackB2 = locationMap.get('RACK-B2');
  const bay01 = locationMap.get('BAY-01');

  // Seed initial stock
  await prisma.stock.upsert({
    where: {
      partId_storeId_locationId_batchNumber: {
        partId: rmSteel.id,
        storeId: rmStore.id,
        locationId: rackA1.id,
        batchNumber: 'BATCH-202601-ST',
      },
    },
    update: { quantityOnHand: 2500 },
    create: {
      partId: rmSteel.id,
      storeId: rmStore.id,
      locationId: rackA1.id,
      quantityOnHand: 2500,
      batchNumber: 'BATCH-202601-ST',
    },
  });

  await prisma.stock.upsert({
    where: {
      partId_storeId_locationId_batchNumber: {
        partId: rmBolt.id,
        storeId: rmStore.id,
        locationId: rackB2.id,
        batchNumber: 'BATCH-202601-BL',
      },
    },
    update: { quantityOnHand: 10000 },
    create: {
      partId: rmBolt.id,
      storeId: rmStore.id,
      locationId: rackB2.id,
      quantityOnHand: 10000,
      batchNumber: 'BATCH-202601-BL',
    },
  });

  await prisma.stock.upsert({
    where: {
      partId_storeId_locationId_batchNumber: {
        partId: fgPart.id,
        storeId: fgStore.id,
        locationId: bay01.id,
        batchNumber: 'LOT-202609-FG',
      },
    },
    update: { quantityOnHand: 150 },
    create: {
      partId: fgPart.id,
      storeId: fgStore.id,
      locationId: bay01.id,
      quantityOnHand: 150,
      batchNumber: 'LOT-202609-FG',
    },
  });

  // 10. Sample Purchase Order & GRN
  const po1 = await prisma.purchaseOrder.upsert({
    where: { poNumber: 'PO-2026-0001' },
    update: {},
    create: {
      poNumber: 'PO-2026-0001',
      supplierId: supplierMap.get('SUPP-001')!.id,
      status: 'APPROVED',
      totalAmount: 42750.0,
      taxAmount: 7695.0,
      grandTotal: 50445.0,
      createdById: userMap.get('purchase@erp.local')!.id,
      approvedById: adminUser.id,
      approvedAt: new Date(),
      items: {
        create: [
          {
            partId: rmSteel.id,
            orderedQty: 500,
            receivedQty: 500,
            unitPrice: 85.50,
            taxRate: 18.0,
            lineTotal: 42750.0,
          },
        ],
      },
    },
    include: { items: true },
  });

  // Sample verified GRN
  await prisma.gRN.upsert({
    where: { grnNumber: 'GRN-2026-0001' },
    update: {},
    create: {
      grnNumber: 'GRN-2026-0001',
      purchaseOrderId: po1.id,
      supplierInvoiceNo: 'INV-APEX-9981',
      status: 'VERIFIED',
      receivedById: userMap.get('stores@erp.local')!.id,
      verifiedAt: new Date(),
      remarks: 'Goods inspected and confirmed 100% compliant',
      items: {
        create: [
          {
            poItemId: po1.items[0].id,
            partId: rmSteel.id,
            receivedQty: 500,
            acceptedQty: 500,
            rejectedQty: 0,
            damagedQty: 0,
            storeId: rmStore.id,
            locationId: rackA1.id,
            batchNumber: 'BATCH-202601-ST',
          },
        ],
      },
    },
  });

  // 11. Sample Packing Box with Barcode
  const boxBarcode = 'BOX-20260909-0001';
  const sampleBox = await prisma.box.upsert({
    where: { boxNumber: 'BOX-0001' },
    update: {},
    create: {
      boxNumber: 'BOX-0001',
      barcode: boxBarcode,
      qrCode: `QR-BOX-0001-AUTO`,
      status: 'SEALED',
      netWeight: 45.2,
      grossWeight: 47.0,
      sealedById: userMap.get('packing@erp.local')!.id,
      sealedAt: new Date(),
      items: {
        create: [
          {
            partId: fgPart.id,
            quantity: 20,
            batchNumber: 'LOT-202609-FG',
          },
        ],
      },
    },
  });

  await prisma.barcode.upsert({
    where: { code: boxBarcode },
    update: {},
    create: {
      code: boxBarcode,
      symbology: 'CODE128',
      entityType: 'BOX',
      entityId: sampleBox.id,
      metadata: JSON.stringify({ boxNumber: 'BOX-0001', itemsCount: 20 }),
      status: 'ACTIVE',
    },
  });

  console.log('Database seeded successfully!');
  console.log('Seed users available:');
  for (const u of usersList) {
    console.log(`- ${u.email} / Admin@12345 (${u.roleName})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
