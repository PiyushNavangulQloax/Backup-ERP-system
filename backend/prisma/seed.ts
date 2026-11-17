import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Manufacturing ERP 2.0 database with full relational data...');

  // 1. Permissions (42 items)
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

    // Quality Management
    { code: 'quality.view', module: 'Quality', description: 'View quality inspections' },
    { code: 'quality.manage', module: 'Quality', description: 'Create and start quality inspections' },
    { code: 'quality.approve', module: 'Quality', description: 'Complete and approve quality inspections' },

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
    { code: 'documents.delete', module: 'Documents', description: 'Delete documents' },
  ];

  const permissionsMap = new Map<string, string>();
  for (const p of permissionsList) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: { description: p.description, module: p.module },
      create: p,
    });
    permissionsMap.set(p.code, perm.id);
  }

  // 2. Roles & Permissions Mapping
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
      update: { description: r.description },
      create: r,
    });
    rolesMap.set(r.name, role.id);
  }

  const rolePermissionAssignments: Record<string, string[]> = {
    Administrator: permissionsList.map((p) => p.code),
    Management: [
      'users.view', 'masters.view', 'po.view', 'po.approve', 'grn.view',
      'inventory.view', 'production.view', 'packing.view', 'billing.view',
      'billing.approve', 'dispatch.view', 'dispatch.gate_out', 'reports.view',
      'reports.export', 'audit.view', 'documents.view', 'quality.view', 'quality.approve'
    ],
    'Purchase User': ['masters.view', 'masters.create', 'masters.edit', 'po.view', 'po.create', 'po.edit', 'grn.view', 'inventory.view', 'reports.view'],
    'Stores User': ['masters.view', 'po.view', 'grn.view', 'grn.create', 'inventory.view', 'inventory.manage', 'inventory.adjust', 'inventory.issue', 'inventory.return', 'barcode.scan'],
    'Production User': ['masters.view', 'production.view', 'production.manage', 'inventory.view', 'inventory.issue', 'inventory.return', 'barcode.scan'],
    'Quality User': ['masters.view', 'po.view', 'grn.view', 'grn.verify', 'production.view', 'barcode.scan', 'quality.view', 'quality.manage', 'quality.approve'],
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

  // 3. Users (9 operational department users)
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
      update: { roleId },
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

  // 4. Units
  const units = [
    { name: 'Pieces', symbol: 'PCS' },
    { name: 'Kilograms', symbol: 'KG' },
    { name: 'Meters', symbol: 'MTR' },
    { name: 'Boxes', symbol: 'BOX' },
    { name: 'Liters', symbol: 'LTR' },
    { name: 'Sets', symbol: 'SET' },
  ];
  const unitMap = new Map<string, any>();
  for (const u of units) {
    const unit = await prisma.unit.upsert({
      where: { symbol: u.symbol },
      update: { name: u.name },
      create: u,
    });
    unitMap.set(u.symbol, unit);
  }

  // 5. Stores & Locations
  const stores = [
    { code: 'RM-STORE', name: 'Raw Material Main Warehouse', type: 'RAW_MATERIALS' },
    { code: 'WIP-STORE', name: 'Work in Progress Holding', type: 'GENERAL' },
    { code: 'FG-STORE', name: 'Finished Goods Dispatch Hub', type: 'FINISHED_GOODS' },
    { code: 'QC-STORE', name: 'Quality Inspection Quarantine', type: 'GENERAL' },
  ];
  const storeMap = new Map<string, any>();
  for (const s of stores) {
    const store = await prisma.store.upsert({
      where: { code: s.code },
      update: { name: s.name, type: s.type },
      create: s,
    });
    storeMap.set(s.code, store);
  }

  const rmStore = storeMap.get('RM-STORE');
  const wipStore = storeMap.get('WIP-STORE');
  const fgStore = storeMap.get('FG-STORE');
  const qcStore = storeMap.get('QC-STORE');

  const locations = [
    { storeId: rmStore.id, code: 'RACK-A1', name: 'RM Heavy Metals Bay', rack: 'A', bin: '1' },
    { storeId: rmStore.id, code: 'RACK-B2', name: 'RM Fasteners & Bolts', rack: 'B', bin: '2' },
    { storeId: rmStore.id, code: 'RACK-C3', name: 'RM Paints & Chemicals', rack: 'C', bin: '3' },
    { storeId: wipStore.id, code: 'WIP-BAY-01', name: 'WIP Stamping Stage', rack: 'WIP-1', bin: 'A' },
    { storeId: wipStore.id, code: 'WIP-BAY-02', name: 'WIP Sub-Assembly Hub', rack: 'WIP-2', bin: 'B' },
    { storeId: fgStore.id, code: 'BAY-01', name: 'FG Automotive Staging', rack: 'FG-1', bin: 'A' },
    { storeId: fgStore.id, code: 'BAY-02', name: 'FG Aerospace Staging', rack: 'FG-2', bin: 'B' },
    { storeId: qcStore.id, code: 'QC-HOLD-01', name: 'Quarantine Holding Bay', rack: 'QC', bin: '01' },
  ];
  const locationMap = new Map<string, any>();
  for (const loc of locations) {
    const l = await prisma.location.upsert({
      where: { storeId_code: { storeId: loc.storeId, code: loc.code } },
      update: { name: loc.name, rack: loc.rack, bin: loc.bin },
      create: loc,
    });
    locationMap.set(loc.code, l);
  }

  // 6. Taxes & Transporters
  const taxes = [
    { name: 'GST 18%', rate: 18.0, type: 'GST' },
    { name: 'GST 12%', rate: 12.0, type: 'GST' },
    { name: 'GST 5%', rate: 5.0, type: 'GST' },
    { name: 'GST 0% (Exempt)', rate: 0.0, type: 'GST' },
  ];
  for (const t of taxes) {
    await prisma.tax.upsert({
      where: { name: t.name },
      update: { rate: t.rate, type: t.type },
      create: t,
    });
  }

  const transporters = [
    { code: 'TRP-EXPRESS', name: 'FastTrack Logistics Ltd', contactPerson: 'John Walker', phone: '+1999888777', vehicleNumbers: 'MH-12-AB-1234, DL-01-XY-9876' },
    { code: 'TRP-GLOBAL', name: 'Apex Freight Carriers', contactPerson: 'Vikram Singh', phone: '+1999555444', vehicleNumbers: 'KA-04-EF-5678, MH-14-GH-4321' },
    { code: 'TRP-TRANS', name: 'TransGlobal Cargo Line', contactPerson: 'Marcus Vance', phone: '+1999222111', vehicleNumbers: 'GJ-01-KL-9012' },
  ];
  const transporterMap = new Map<string, any>();
  for (const trp of transporters) {
    const t = await prisma.transporter.upsert({
      where: { code: trp.code },
      update: { contactPerson: trp.contactPerson, phone: trp.phone, vehicleNumbers: trp.vehicleNumbers },
      create: trp,
    });
    transporterMap.set(trp.code, t);
  }

  // 7. Customers & Suppliers
  const customers = [
    { code: 'CUST-001', name: 'Nexus Automotive Corp', email: 'procurement@nexusauto.com', phone: '+1800111222', gstin: '27AABCU9603R1ZN', billingAddress: '100 Industrial Parkway, Detroit, MI', shippingAddress: '100 Industrial Parkway, Detroit, MI' },
    { code: 'CUST-002', name: 'Aerotech Precision Systems', email: 'orders@aerotech.io', phone: '+1800333444', gstin: '29AAACA9001P1Z8', billingAddress: '42 Aerospace Way, Seattle, WA', shippingAddress: '42 Aerospace Way, Seattle, WA' },
    { code: 'CUST-003', name: 'Titan Heavy Machinery Inc', email: 'supply@titanmach.com', phone: '+1800555666', gstin: '07AAACT1122Q1ZQ', billingAddress: '88 Foundry Blvd, Chicago, IL', shippingAddress: '88 Foundry Blvd, Chicago, IL' },
    { code: 'CUST-004', name: 'Orbit EV Technologies', email: 'parts@orbitev.com', phone: '+1800777888', gstin: '33AABCO3344R1ZM', billingAddress: '12 Clean Energy Way, San Jose, CA', shippingAddress: '12 Clean Energy Way, San Jose, CA' },
  ];
  const customerMap = new Map<string, any>();
  for (const c of customers) {
    const cust = await prisma.customer.upsert({
      where: { code: c.code },
      update: { name: c.name, email: c.email, phone: c.phone, gstin: c.gstin },
      create: c,
    });
    customerMap.set(c.code, cust);
  }

  const suppliers = [
    { code: 'SUPP-001', name: 'Apex Steel & Alloys', email: 'sales@apexsteel.com', phone: '+1777222333', gstin: '27AABCA1234R1ZM', address: '78 Foundry Road, Cleveland, OH', paymentTerms: 'Net 30' },
    { code: 'SUPP-002', name: 'Precision Fasteners & Polymers', email: 'supply@precisionfast.com', phone: '+1777444555', gstin: '27AABCP5678R1ZX', address: '12 Polymer Lane, Akron, OH', paymentTerms: 'Net 45' },
    { code: 'SUPP-003', name: 'DuraCoat Industrial Finishes', email: 'info@duracoat.com', phone: '+1777666777', gstin: '24AABCD9988K1ZP', address: '30 Chemical Park, Houston, TX', paymentTerms: 'Net 30' },
    { code: 'SUPP-004', name: 'ElectroSensors Pvt Ltd', email: 'orders@electrosensors.com', phone: '+1777888999', gstin: '29AABCE4455F1ZK', address: '55 Tech Zone, Austin, TX', paymentTerms: 'Net 15' },
  ];
  const supplierMap = new Map<string, any>();
  for (const s of suppliers) {
    const supp = await prisma.supplier.upsert({
      where: { code: s.code },
      update: { name: s.name, email: s.email, phone: s.phone, gstin: s.gstin },
      create: s,
    });
    supplierMap.set(s.code, supp);
  }

  // 8. Parts (Raw Materials, WIP, Finished Goods)
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
    {
      code: 'PRT-RM-003',
      name: 'Aluminum Extruded Profile 50x50',
      partType: 'RAW_MATERIAL',
      unitId: unitMap.get('MTR')!.id,
      minStockLevel: 150,
      standardCost: 145.00,
      hsnCode: '7604',
      barcodeValue: 'PRT-RM-003-CODE128',
    },
    {
      code: 'PRT-RM-004',
      name: 'Industrial Powder Coat Matte Black',
      partType: 'RAW_MATERIAL',
      unitId: unitMap.get('KG')!.id,
      minStockLevel: 50,
      standardCost: 220.00,
      hsnCode: '3208',
      barcodeValue: 'PRT-RM-004-CODE128',
    },
    // Work In Progress
    {
      code: 'PRT-WIP-001',
      name: 'Stamped Mounting Bracket Blank',
      partType: 'WORK_IN_PROGRESS',
      unitId: unitMap.get('PCS')!.id,
      minStockLevel: 200,
      standardCost: 160.00,
      hsnCode: '8708',
      barcodeValue: 'PRT-WIP-001-CODE128',
    },
    {
      code: 'PRT-WIP-002',
      name: 'Sub-Assembly Hub Bracket',
      partType: 'WORK_IN_PROGRESS',
      unitId: unitMap.get('PCS')!.id,
      minStockLevel: 100,
      standardCost: 240.00,
      hsnCode: '8708',
      barcodeValue: 'PRT-WIP-002-CODE128',
    },
    // Finished Goods
    {
      code: 'PRT-FG-101',
      name: 'Automotive Engine Mounting Bracket',
      partType: 'FINISHED_GOOD',
      unitId: unitMap.get('PCS')!.id,
      minStockLevel: 100,
      standardCost: 380.00,
      hsnCode: '8708',
      barcodeValue: 'PRT-FG-101-CODE128',
    },
    {
      code: 'PRT-FG-102',
      name: 'Aerotech Precision Actuator Arm',
      partType: 'FINISHED_GOOD',
      unitId: unitMap.get('PCS')!.id,
      minStockLevel: 50,
      standardCost: 890.00,
      hsnCode: '8803',
      barcodeValue: 'PRT-FG-102-CODE128',
    },
  ];

  const partMap = new Map<string, any>();
  for (const p of parts) {
    const part = await prisma.part.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        standardCost: p.standardCost,
        minStockLevel: p.minStockLevel,
        hsnCode: p.hsnCode,
        barcodeValue: p.barcodeValue,
      },
      create: p,
    });
    partMap.set(p.code, part);

    // Register Barcode Master
    await prisma.barcode.upsert({
      where: { code: p.barcodeValue },
      update: { entityId: part.id },
      create: {
        code: p.barcodeValue,
        symbology: 'CODE128',
        entityType: 'PART',
        entityId: part.id,
        metadata: JSON.stringify({ partCode: p.code, name: p.name, type: p.partType }),
        status: 'ACTIVE',
      },
    });
  }

  // 9. Bill of Materials (BOM)
  const fgEngine = partMap.get('PRT-FG-101');
  const fgArm = partMap.get('PRT-FG-102');
  const rmSteel = partMap.get('PRT-RM-001');
  const rmBolt = partMap.get('PRT-RM-002');
  const rmAlum = partMap.get('PRT-RM-003');
  const rmPaint = partMap.get('PRT-RM-004');

  await prisma.bOM.upsert({
    where: { bomCode: 'BOM-BRKT-001' },
    update: {},
    create: {
      bomCode: 'BOM-BRKT-001',
      partId: fgEngine.id,
      version: '1.0',
      notes: 'Standard engine mounting bracket assembly',
      items: {
        create: [
          { partId: rmSteel.id, quantityRequired: 1.8, scrapPercentage: 5.0 },
          { partId: rmBolt.id, quantityRequired: 4.0, scrapPercentage: 1.0 },
          { partId: rmPaint.id, quantityRequired: 0.15, scrapPercentage: 2.0 },
        ],
      },
    },
  });

  await prisma.bOM.upsert({
    where: { bomCode: 'BOM-ACT-002' },
    update: {},
    create: {
      bomCode: 'BOM-ACT-002',
      partId: fgArm.id,
      version: '2.1',
      notes: 'Aerospace grade precision actuator arm',
      items: {
        create: [
          { partId: rmAlum.id, quantityRequired: 0.85, scrapPercentage: 3.0 },
          { partId: rmBolt.id, quantityRequired: 6.0, scrapPercentage: 1.0 },
        ],
      },
    },
  });

  // 10. Operations Master
  const operations = [
    { code: 'OP-CUT', name: 'Sheet Metal CNC Cutting', description: 'Laser cutting raw sheet metal coils to spec', standardTimeMinutes: 12.0 },
    { code: 'OP-STAMP', name: 'Hydraulic Press Stamping', description: 'High pressure blanking and progressive stamping', standardTimeMinutes: 8.5 },
    { code: 'OP-MACH', name: 'Precision CNC Milling', description: 'Precision machining of mounting holes and slots', standardTimeMinutes: 25.0 },
    { code: 'OP-WELD', name: 'Robotic Spot Welding', description: 'Structural reinforcement welding', standardTimeMinutes: 15.0 },
    { code: 'OP-COAT', name: 'Electrostatic Powder Coating', description: 'Degrease, prime, and thermal cure black powder coat', standardTimeMinutes: 30.0 },
    { code: 'OP-ASSY', name: 'Final Mechanical Assembly', description: 'Hardware fastener torqueing and sub-assembly joining', standardTimeMinutes: 18.0 },
    { code: 'OP-QC', name: 'Quality & CMM Metrology', description: 'Dimensional compliance check against engineering drawing', standardTimeMinutes: 10.0 },
  ];
  for (const op of operations) {
    await prisma.operation.upsert({
      where: { code: op.code },
      update: { name: op.name, standardTimeMinutes: op.standardTimeMinutes },
      create: op,
    });
  }

  // 11. Initial Stock Ledger
  const rackA1 = locationMap.get('RACK-A1');
  const rackB2 = locationMap.get('RACK-B2');
  const rackC3 = locationMap.get('RACK-C3');
  const bay01 = locationMap.get('BAY-01');
  const bay02 = locationMap.get('BAY-02');
  const adminUser = userMap.get('admin@erp.local');
  const storesUser = userMap.get('stores@erp.local');
  const productionUser = userMap.get('production@erp.local');

  const initialStocks = [
    { partId: rmSteel.id, storeId: rmStore.id, locationId: rackA1.id, batchNumber: 'BATCH-202601-ST', qty: 3200 },
    { partId: rmBolt.id, storeId: rmStore.id, locationId: rackB2.id, batchNumber: 'BATCH-202601-BL', qty: 15000 },
    { partId: rmAlum.id, storeId: rmStore.id, locationId: rackA1.id, batchNumber: 'BATCH-202602-AL', qty: 850 },
    { partId: rmPaint.id, storeId: rmStore.id, locationId: rackC3.id, batchNumber: 'BATCH-202602-PT', qty: 280 },
    { partId: fgEngine.id, storeId: fgStore.id, locationId: bay01.id, batchNumber: 'LOT-202609-FG1', qty: 240 },
    { partId: fgArm.id, storeId: fgStore.id, locationId: bay02.id, batchNumber: 'LOT-202609-FG2', qty: 85 },
  ];

  for (const s of initialStocks) {
    await prisma.stock.upsert({
      where: {
        partId_storeId_locationId_batchNumber: {
          partId: s.partId,
          storeId: s.storeId,
          locationId: s.locationId,
          batchNumber: s.batchNumber,
        },
      },
      update: { quantityOnHand: s.qty },
      create: {
        partId: s.partId,
        storeId: s.storeId,
        locationId: s.locationId,
        batchNumber: s.batchNumber,
        quantityOnHand: s.qty,
      },
    });
  }

  // 12. Stock Movements Ledger
  const sampleMovements = [
    {
      partId: rmSteel.id,
      storeId: rmStore.id,
      locationId: rackA1.id,
      movementType: 'GRN_RECEIPT',
      quantity: 1500,
      referenceType: 'GRN',
      referenceId: 'GRN-2026-0001',
      batchNumber: 'BATCH-202601-ST',
      reason: 'Inwarded against approved PO-2026-0001',
      performedById: storesUser.id,
    },
    {
      partId: rmBolt.id,
      storeId: rmStore.id,
      locationId: rackB2.id,
      movementType: 'GRN_RECEIPT',
      quantity: 5000,
      referenceType: 'GRN',
      referenceId: 'GRN-2026-0002',
      batchNumber: 'BATCH-202601-BL',
      reason: 'Inwarded against PO-2026-0002',
      performedById: storesUser.id,
    },
    {
      partId: rmSteel.id,
      storeId: rmStore.id,
      locationId: rackA1.id,
      movementType: 'PROD_ISSUE',
      quantity: -350,
      referenceType: 'JOB_CARD',
      referenceId: 'JC-2026-001',
      batchNumber: 'BATCH-202601-ST',
      reason: 'Issued material to production job card JC-2026-001',
      performedById: productionUser.id,
    },
    {
      partId: fgEngine.id,
      storeId: fgStore.id,
      locationId: bay01.id,
      movementType: 'PROD_RECEIPT',
      quantity: 80,
      referenceType: 'JOB_CARD',
      referenceId: 'JC-2026-001',
      batchNumber: 'LOT-202609-FG1',
      reason: 'Production finished goods received in dispatch hub',
      performedById: productionUser.id,
    },
  ];

  for (const m of sampleMovements) {
    await prisma.stockMovement.create({
      data: m,
    });
  }

  // 13. Purchase Orders (4 POs with varied statuses)
  const purchaseUser = userMap.get('purchase@erp.local');
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
      createdById: purchaseUser.id,
      approvedById: adminUser.id,
      approvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
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

  const po2 = await prisma.purchaseOrder.upsert({
    where: { poNumber: 'PO-2026-0002' },
    update: {},
    create: {
      poNumber: 'PO-2026-0002',
      supplierId: supplierMap.get('SUPP-002')!.id,
      status: 'SUBMITTED',
      totalAmount: 21250.0,
      taxAmount: 3825.0,
      grandTotal: 25075.0,
      createdById: purchaseUser.id,
      items: {
        create: [
          {
            partId: rmBolt.id,
            orderedQty: 5000,
            receivedQty: 0,
            unitPrice: 4.25,
            taxRate: 18.0,
            lineTotal: 21250.0,
          },
        ],
      },
    },
    include: { items: true },
  });

  const po3 = await prisma.purchaseOrder.upsert({
    where: { poNumber: 'PO-2026-0003' },
    update: {},
    create: {
      poNumber: 'PO-2026-0003',
      supplierId: supplierMap.get('SUPP-003')!.id,
      status: 'DRAFT',
      totalAmount: 22000.0,
      taxAmount: 3960.0,
      grandTotal: 25960.0,
      createdById: purchaseUser.id,
      items: {
        create: [
          {
            partId: rmPaint.id,
            orderedQty: 100,
            receivedQty: 0,
            unitPrice: 220.00,
            taxRate: 18.0,
            lineTotal: 22000.0,
          },
        ],
      },
    },
    include: { items: true },
  });

  // 14. Goods Receipt Notes (GRN)
  const qualityUser = userMap.get('quality@erp.local');
  await prisma.gRN.upsert({
    where: { grnNumber: 'GRN-2026-0001' },
    update: {},
    create: {
      grnNumber: 'GRN-2026-0001',
      purchaseOrderId: po1.id,
      supplierInvoiceNo: 'INV-APEX-9981',
      status: 'VERIFIED',
      receivedById: storesUser.id,
      verifiedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      remarks: 'Goods inspected and confirmed 100% compliant with metallurgical test report',
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

  await prisma.gRN.upsert({
    where: { grnNumber: 'GRN-2026-0002' },
    update: {},
    create: {
      grnNumber: 'GRN-2026-0002',
      purchaseOrderId: po1.id,
      supplierInvoiceNo: 'INV-APEX-9990',
      status: 'DRAFT',
      receivedById: storesUser.id,
      remarks: 'Pending QC hardness testing',
      items: {
        create: [
          {
            poItemId: po1.items[0].id,
            partId: rmSteel.id,
            receivedQty: 150,
            acceptedQty: 0,
            rejectedQty: 0,
            damagedQty: 0,
            storeId: rmStore.id,
            locationId: rackA1.id,
            batchNumber: 'BATCH-202602-ST',
          },
        ],
      },
    },
  });

  // 15. Production Plans & Job Cards
  const prodPlan1 = await prisma.productionPlan.upsert({
    where: { planNumber: 'PLAN-2026-001' },
    update: {},
    create: {
      planNumber: 'PLAN-2026-001',
      partId: fgEngine.id,
      plannedQty: 500,
      completedQty: 120,
      status: 'IN_PROGRESS',
      startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    },
  });

  const prodPlan2 = await prisma.productionPlan.upsert({
    where: { planNumber: 'PLAN-2026-002' },
    update: {},
    create: {
      planNumber: 'PLAN-2026-002',
      partId: fgArm.id,
      plannedQty: 150,
      completedQty: 0,
      status: 'PLANNED',
      startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    },
  });

  const jobCard1 = await prisma.jobCard.upsert({
    where: { jobCardNumber: 'JC-2026-0001' },
    update: {},
    create: {
      jobCardNumber: 'JC-2026-0001',
      planId: prodPlan1.id,
      partId: fgEngine.id,
      targetQty: 150,
      producedQty: 120,
      rejectedQty: 3,
      status: 'IN_PROGRESS',
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  const jobCard2 = await prisma.jobCard.upsert({
    where: { jobCardNumber: 'JC-2026-0002' },
    update: {},
    create: {
      jobCardNumber: 'JC-2026-0002',
      planId: prodPlan1.id,
      partId: fgEngine.id,
      targetQty: 200,
      producedQty: 0,
      rejectedQty: 0,
      status: 'RELEASED',
    },
  });

  // Material Issue & Return for Job Card
  await prisma.materialIssue.upsert({
    where: { issueNumber: 'ISSUE-2026-001' },
    update: {},
    create: {
      issueNumber: 'ISSUE-2026-001',
      jobCardId: jobCard1.id,
      partId: rmSteel.id,
      quantityIssued: 270,
      storeId: rmStore.id,
      issuedById: storesUser.id,
    },
  });

  await prisma.materialReturn.upsert({
    where: { returnNumber: 'RET-2026-001' },
    update: {},
    create: {
      returnNumber: 'RET-2026-001',
      jobCardId: jobCard1.id,
      partId: rmSteel.id,
      quantityReturned: 12.5,
      storeId: rmStore.id,
      returnedById: productionUser.id,
    },
  });

  // 16. Packing Boxes & Items
  const packingUser = userMap.get('packing@erp.local');
  const box1Barcode = 'BOX-202609-001';
  const box2Barcode = 'BOX-202609-002';
  const box3Barcode = 'BOX-202609-003';

  const box1 = await prisma.box.upsert({
    where: { boxNumber: 'BOX-2026-001' },
    update: {},
    create: {
      boxNumber: 'BOX-2026-001',
      barcode: box1Barcode,
      qrCode: `QR-${box1Barcode}`,
      status: 'SEALED',
      netWeight: 42.5,
      grossWeight: 44.8,
      sealedById: packingUser.id,
      sealedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            partId: fgEngine.id,
            quantity: 30,
            batchNumber: 'LOT-202609-FG1',
            jobCardId: jobCard1.id,
          },
        ],
      },
    },
  });

  const box2 = await prisma.box.upsert({
    where: { boxNumber: 'BOX-2026-002' },
    update: {},
    create: {
      boxNumber: 'BOX-2026-002',
      barcode: box2Barcode,
      qrCode: `QR-${box2Barcode}`,
      status: 'VERIFIED',
      netWeight: 35.0,
      grossWeight: 37.2,
      items: {
        create: [
          {
            partId: fgEngine.id,
            quantity: 25,
            batchNumber: 'LOT-202609-FG1',
            jobCardId: jobCard1.id,
          },
        ],
      },
    },
  });

  const box3 = await prisma.box.upsert({
    where: { boxNumber: 'BOX-2026-003' },
    update: {},
    create: {
      boxNumber: 'BOX-2026-003',
      barcode: box3Barcode,
      qrCode: `QR-${box3Barcode}`,
      status: 'OPEN',
      items: {
        create: [
          {
            partId: fgArm.id,
            quantity: 10,
            batchNumber: 'LOT-202609-FG2',
          },
        ],
      },
    },
  });

  // Register Box Barcodes
  for (const b of [box1, box2, box3]) {
    await prisma.barcode.upsert({
      where: { code: b.barcode },
      update: { entityId: b.id },
      create: {
        code: b.barcode,
        symbology: 'CODE128',
        entityType: 'BOX',
        entityId: b.id,
        metadata: JSON.stringify({ boxNumber: b.boxNumber, status: b.status }),
        status: 'ACTIVE',
      },
    });
  }

  // 17. Barcode Scan History (Past 24h scan events for Dashboard)
  const scanEvents = [
    { barcodeCode: box1Barcode, scanAction: 'BOX_PACK', scannedById: packingUser.id, deviceInfo: 'Zebra TC26 Handheld #1', isSuccess: true },
    { barcodeCode: box1Barcode, scanAction: 'BOX_VERIFY', scannedById: qualityUser.id, deviceInfo: 'Zebra TC26 Handheld #2', isSuccess: true },
    { barcodeCode: box2Barcode, scanAction: 'BOX_PACK', scannedById: packingUser.id, deviceInfo: 'Zebra TC26 Handheld #1', isSuccess: true },
    { barcodeCode: fgEngine.barcodeValue, scanAction: 'AUDIT', scannedById: storesUser.id, deviceInfo: 'Desktop Barcode Scanner COM3', isSuccess: true },
    { barcodeCode: 'INVALID-999-CODE', scanAction: 'AUDIT', scannedById: storesUser.id, deviceInfo: 'Desktop Barcode Scanner COM3', isSuccess: false, errorMessage: 'Barcode not registered in ERP catalog' },
  ];

  for (const scan of scanEvents) {
    await prisma.barcodeScanHistory.create({
      data: {
        barcodeCode: scan.barcodeCode,
        scanAction: scan.scanAction,
        scannedById: scan.scannedById,
        deviceInfo: scan.deviceInfo,
        isSuccess: scan.isSuccess,
        errorMessage: scan.errorMessage,
        scannedAt: new Date(Date.now() - Math.floor(Math.random() * 12 * 60 * 60 * 1000)),
      },
    });
  }

  // 18. Invoices & Billing
  const billingUser = userMap.get('billing@erp.local');
  const inv1 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-0001' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-0001',
      customerId: customerMap.get('CUST-001')!.id,
      invoiceDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      subTotal: 38000.0,
      taxAmount: 6840.0,
      grandTotal: 44840.0,
      status: 'APPROVED',
      createdById: billingUser.id,
      items: {
        create: [
          {
            partId: fgEngine.id,
            quantity: 100,
            unitPrice: 380.0,
            taxRate: 18.0,
            lineTotal: 38000.0,
          },
        ],
      },
    },
  });

  const inv2 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-0002' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-0002',
      customerId: customerMap.get('CUST-002')!.id,
      invoiceDate: new Date(),
      subTotal: 26700.0,
      taxAmount: 4806.0,
      grandTotal: 31506.0,
      status: 'DRAFT',
      createdById: billingUser.id,
      items: {
        create: [
          {
            partId: fgArm.id,
            quantity: 30,
            unitPrice: 890.0,
            taxRate: 18.0,
            lineTotal: 26700.0,
          },
        ],
      },
    },
  });

  const wipBracket = partMap.get('PRT-WIP-002');
  const inv3 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-0003' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-0003',
      customerId: customerMap.get('CUST-003')!.id,
      invoiceDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      subTotal: 40000.0,
      taxAmount: 7200.0,
      grandTotal: 47200.0,
      status: 'PAID',
      createdById: billingUser.id,
      items: {
        create: [
          {
            partId: fgEngine.id,
            quantity: 80,
            unitPrice: 380.0,
            taxRate: 18.0,
            lineTotal: 30400.0,
          },
          {
            partId: wipBracket.id,
            quantity: 40,
            unitPrice: 240.0,
            taxRate: 18.0,
            lineTotal: 9600.0,
          },
        ],
      },
    },
  });

  const inv4 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-0004' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-0004',
      customerId: customerMap.get('CUST-004')!.id,
      invoiceDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      subTotal: 53400.0,
      taxAmount: 9612.0,
      grandTotal: 63012.0,
      status: 'PAID',
      createdById: billingUser.id,
      items: {
        create: [
          {
            partId: fgArm.id,
            quantity: 60,
            unitPrice: 890.0,
            taxRate: 18.0,
            lineTotal: 53400.0,
          },
        ],
      },
    },
  });

  // 19. Dispatches & Dispatch Boxes
  const dispatchUser = userMap.get('dispatch@erp.local');
  const dispatch1 = await prisma.dispatch.upsert({
    where: { dispatchNumber: 'DSP-2026-0001' },
    update: {},
    create: {
      dispatchNumber: 'DSP-2026-0001',
      invoiceId: inv1.id,
      customerId: customerMap.get('CUST-001')!.id,
      transporterId: transporterMap.get('TRP-EXPRESS')!.id,
      vehicleNumber: 'MH-12-AB-1234',
      driverName: 'Ramesh Patil',
      driverPhone: '+919876543210',
      lrNumber: 'LR-FT-99128',
      dispatchDate: new Date(),
      status: 'PREPARED',
      createdById: dispatchUser.id,
      boxes: {
        create: [
          {
            boxId: box1.id,
            verifiedAt: new Date(),
            verifiedBy: 'Thomas Wright (Dispatch Inspector)',
          },
        ],
      },
    },
  });

  // 20. Documents
  const documents = [
    {
      title: 'Automotive Engine Mounting Bracket Engineering Blueprint',
      entityType: 'PART',
      entityId: fgEngine.id,
      fileName: 'Blueprint_PRT-FG-101_RevB.pdf',
      fileUrl: '/storage/uploads/docs/Blueprint_PRT-FG-101_RevB.pdf',
      fileSize: 2450600,
      mimeType: 'application/pdf',
      uploadedById: adminUser.id,
    },
    {
      title: 'Apex Steel Metallurgical Test Certificate 2026',
      entityType: 'GRN',
      entityId: 'GRN-2026-0001',
      fileName: 'ApexSteel_Mill_Test_Cert_9981.pdf',
      fileUrl: '/storage/uploads/docs/ApexSteel_Mill_Test_Cert_9981.pdf',
      fileSize: 1220400,
      mimeType: 'application/pdf',
      uploadedById: qualityUser.id,
    },
    {
      title: 'Nexus Automotive Annual Blanket Agreement',
      entityType: 'CUSTOMER',
      entityId: customerMap.get('CUST-001')!.id,
      fileName: 'Nexus_Procurement_Agreement_2026.pdf',
      fileUrl: '/storage/uploads/docs/Nexus_Procurement_Agreement_2026.pdf',
      fileSize: 3105000,
      mimeType: 'application/pdf',
      uploadedById: adminUser.id,
    },
  ];

  for (const doc of documents) {
    await prisma.document.create({
      data: doc,
    });
  }

  // 21. Audit Trail Logs
  const auditLogs = [
    {
      userId: adminUser.id,
      action: 'APPROVE',
      module: 'PO',
      entityName: 'PurchaseOrder',
      entityId: po1.id,
      newData: JSON.stringify({ poNumber: po1.poNumber, status: 'APPROVED', amount: po1.grandTotal }),
      ipAddress: '127.0.0.1',
    },
    {
      userId: qualityUser.id,
      action: 'VERIFY',
      module: 'GRN',
      entityName: 'GRN',
      entityId: 'GRN-2026-0001',
      newData: JSON.stringify({ grnNumber: 'GRN-2026-0001', acceptedQty: 500, rejectedQty: 0 }),
      ipAddress: '127.0.0.1',
    },
    {
      userId: packingUser.id,
      action: 'SEAL',
      module: 'PACKING',
      entityName: 'Box',
      entityId: box1.id,
      newData: JSON.stringify({ boxNumber: box1.boxNumber, status: 'SEALED', netWeight: 42.5 }),
      ipAddress: '127.0.0.1',
    },
    {
      userId: dispatchUser.id,
      action: 'CREATE',
      module: 'DISPATCH',
      entityName: 'Dispatch',
      entityId: dispatch1.id,
      newData: JSON.stringify({ dispatchNumber: dispatch1.dispatchNumber, vehicle: 'MH-12-AB-1234' }),
      ipAddress: '127.0.0.1',
    },
  ];

  for (const log of auditLogs) {
    await prisma.auditLog.create({
      data: log,
    });
  }

  // 22. System Notifications
  const notifications = [
    {
      userId: adminUser.id,
      title: 'New PO Pending Approval',
      message: 'PO-2026-0002 for High Tensile Bolts ($25,075.00) requires management sign-off.',
      type: 'WARNING',
      isRead: false,
    },
    {
      userId: storesUser.id,
      title: 'Low Stock Alert: Cold Rolled Steel',
      message: 'Current stock of PRT-RM-001 is approaching re-order threshold.',
      type: 'INFO',
      isRead: false,
    },
    {
      userId: dispatchUser.id,
      title: 'Shipment Manifest Prepared',
      message: 'Dispatch DSP-2026-0001 is ready for loading into truck MH-12-AB-1234.',
      type: 'SUCCESS',
      isRead: true,
    },
  ];

  for (const notif of notifications) {
    await prisma.notification.create({
      data: notif,
    });
  }

  console.log('✅ Manufacturing ERP 2.0 full relational database seeding completed successfully!');
  console.log('Summary of seeded records across all 36 models:');
  console.log(`- Permissions: ${permissionsList.length}`);
  console.log(`- Roles: ${rolesList.length}`);
  console.log(`- Users: ${usersList.length}`);
  console.log(`- Customers: ${customers.length}`);
  console.log(`- Suppliers: ${suppliers.length}`);
  console.log(`- Stores: ${stores.length}`);
  console.log(`- Locations: ${locations.length}`);
  console.log(`- Parts: ${parts.length}`);
  console.log(`- BOMs: 2`);
  console.log(`- Operations: ${operations.length}`);
  console.log(`- Stock Ledger Entries: ${initialStocks.length}`);
  console.log(`- Stock Movements: ${sampleMovements.length}`);
  console.log(`- Purchase Orders: 3`);
  console.log(`- GRNs: 2`);
  console.log(`- Production Plans: 2`);
  console.log(`- Job Cards: 2`);
  console.log(`- Boxes: 3`);
  console.log(`- Barcodes & Scans: Registered with live history`);
  console.log(`- Invoices: 2`);
  console.log(`- Dispatches: 1`);
  console.log(`- Documents, Audit Logs & Notifications: Active`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
