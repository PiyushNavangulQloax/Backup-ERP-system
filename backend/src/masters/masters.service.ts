import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class MastersService {
  constructor(private prisma: PrismaService) {}

  // Customers
  async getCustomers() {
    return this.prisma.customer.findMany({ orderBy: { name: 'asc' } });
  }
  async createCustomer(data: any) {
    const existing = await this.prisma.customer.findUnique({ where: { code: data.code } });
    if (existing) throw new ConflictException(`Customer code ${data.code} already exists`);
    return this.prisma.customer.create({ data });
  }
  async updateCustomer(id: string, data: any) {
    return this.prisma.customer.update({ where: { id }, data });
  }
  async deleteCustomer(id: string) {
    try {
      return await this.prisma.customer.delete({ where: { id } });
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new BadRequestException('Cannot delete Customer: active orders, invoices, or customer-parts reference this record.');
      }
      throw error;
    }
  }

  // Suppliers
  async getSuppliers() {
    return this.prisma.supplier.findMany({ orderBy: { name: 'asc' } });
  }
  async createSupplier(data: any) {
    const existing = await this.prisma.supplier.findUnique({ where: { code: data.code } });
    if (existing) throw new ConflictException(`Supplier code ${data.code} already exists`);
    return this.prisma.supplier.create({ data });
  }
  async updateSupplier(id: string, data: any) {
    return this.prisma.supplier.update({ where: { id }, data });
  }
  async deleteSupplier(id: string) {
    try {
      return await this.prisma.supplier.delete({ where: { id } });
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new BadRequestException('Cannot delete Supplier: purchase orders or inbound goods receipts reference this supplier.');
      }
      throw error;
    }
  }

  // Parts
  async getParts() {
    const parts = await this.prisma.part.findMany({
      include: {
        unit: true,
        supplier: true,
        stocks: { include: { store: true, location: true, supplier: true } },
      },
      orderBy: { name: 'asc' },
    });

    return parts.map((part) => {
      const storeStock = part.stocks?.reduce(
        (acc: number, s: any) => acc + (Number(s.quantityOnHand ?? 0)),
        0
      ) || 0;
      const availableStock = storeStock > 0 ? storeStock : (Number(part.minStockLevel) || 0);
      return {
        ...part,
        availableStock,
        uom: part.unit?.symbol || part.unit?.name || 'units',
      };
    });
  }
  async createPart(data: any) {
    const { openingStock, ...rawPartData } = data;
    const existing = await this.prisma.part.findUnique({ where: { code: rawPartData.code } });
    if (existing) throw new ConflictException(`Part code ${rawPartData.code} already exists`);
    
    // Auto-generate barcode value if not specified
    const barcodeValue = rawPartData.barcodeValue || `${rawPartData.code}-BC`;
    const part = await this.prisma.part.create({
      data: {
        ...rawPartData,
        barcodeValue,
      },
      include: { unit: true, supplier: true },
    });

    // Create barcode master entry
    await this.prisma.barcode.upsert({
      where: { code: barcodeValue },
      update: {},
      create: {
        code: barcodeValue,
        symbology: 'CODE128',
        entityType: 'PART',
        entityId: part.id,
        metadata: JSON.stringify({ partCode: part.code, name: part.name }),
        status: 'ACTIVE',
      },
    });

    // Seed stock position if openingStock or minStockLevel is provided
    const initialQty = openingStock !== undefined ? Number(openingStock) : Number(rawPartData.minStockLevel || 0);
    if (initialQty > 0) {
      let store = await this.prisma.store.findFirst({ where: { isActive: true } });
      if (!store) {
        store = await this.prisma.store.create({
          data: { code: 'STR-MAIN', name: 'Main Central Store', type: 'RAW_MATERIALS' },
        });
      }
      await this.prisma.stock.create({
        data: {
          partId: part.id,
          storeId: store.id,
          quantityOnHand: initialQty,
          supplierId: part.supplierId,
          lastInwardAt: new Date(),
        },
      });

      const firstUser = await this.prisma.user.findFirst();
      if (firstUser) {
        await this.prisma.stockMovement.create({
          data: {
            partId: part.id,
            storeId: store.id,
            movementType: 'ADJUSTMENT_ADD',
            quantity: initialQty,
            referenceType: 'MANUAL',
            supplierId: part.supplierId,
            reason: 'Initial Opening Stock Entry',
            performedById: firstUser.id,
          },
        });
      }
    }

    return this.prisma.part.findUnique({
      where: { id: part.id },
      include: {
        unit: true,
        supplier: true,
        stocks: { include: { store: true, location: true, supplier: true } },
      },
    });
  }
  async updatePart(id: string, data: any) {
    const { openingStock, ...partData } = data;
    await this.prisma.part.update({ where: { id }, data: partData, include: { unit: true, supplier: true } });

    if (openingStock !== undefined && !isNaN(Number(openingStock))) {
      const qty = Number(openingStock);
      let store = await this.prisma.store.findFirst({ where: { isActive: true } });
      if (!store) {
        store = await this.prisma.store.create({
          data: { code: 'STR-MAIN', name: 'Main Central Store', type: 'RAW_MATERIALS' },
        });
      }
      const existingStock = await this.prisma.stock.findFirst({
        where: { partId: id, storeId: store.id },
      });
      if (existingStock) {
        await this.prisma.stock.update({
          where: { id: existingStock.id },
          data: {
            quantityOnHand: qty,
            ...(partData.supplierId ? { supplierId: partData.supplierId } : {}),
            lastInwardAt: new Date(),
          },
        });
      } else {
        await this.prisma.stock.create({
          data: {
            partId: id,
            storeId: store.id,
            quantityOnHand: qty,
            supplierId: partData.supplierId,
            lastInwardAt: new Date(),
          },
        });
      }
    }

    return this.prisma.part.findUnique({
      where: { id },
      include: {
        unit: true,
        supplier: true,
        stocks: { include: { store: true, location: true, supplier: true } },
      },
    });
  }
  async deletePart(id: string) {
    try {
      return await this.prisma.part.delete({ where: { id } });
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new BadRequestException('Cannot delete Part: active stock inventory, purchase orders, or BOMs reference this part.');
      }
      throw error;
    }
  }

  // Units
  async getUnits() {
    let units = await this.prisma.unit.findMany({ orderBy: { name: 'asc' } });
    if (units.length === 0) {
      const defaultUnits = [
        { name: 'Pieces', symbol: 'PCS' },
        { name: 'Kilograms', symbol: 'KG' },
        { name: 'Meters', symbol: 'MTR' },
        { name: 'Boxes', symbol: 'BOX' },
        { name: 'Liters', symbol: 'LTR' },
        { name: 'Sets', symbol: 'SET' },
        { name: 'Numbers', symbol: 'NOS' },
        { name: 'Grams', symbol: 'GMS' },
        { name: 'Millimeters', symbol: 'MM' },
        { name: 'Rolls', symbol: 'ROL' },
        { name: 'Packets', symbol: 'PKT' },
      ];
      await this.prisma.unit.createMany({ data: defaultUnits, skipDuplicates: true });
      units = await this.prisma.unit.findMany({ orderBy: { name: 'asc' } });
    }
    return units;
  }
  async createUnit(data: any) {
    return this.prisma.unit.create({ data });
  }
  async updateUnit(id: string, data: any) {
    return this.prisma.unit.update({ where: { id }, data });
  }
  async deleteUnit(id: string) {
    try {
      return await this.prisma.unit.delete({ where: { id } });
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new BadRequestException('Cannot delete Unit: parts or materials are actively assigned to this unit of measure.');
      }
      throw error;
    }
  }

  // Stores & Locations
  async getStores() {
    return this.prisma.store.findMany({
      include: { locations: true },
      orderBy: { name: 'asc' },
    });
  }
  async createStore(data: any) {
    return this.prisma.store.create({ data });
  }
  async updateStore(id: string, data: any) {
    return this.prisma.store.update({ where: { id }, data, include: { locations: true } });
  }
  async deleteStore(id: string) {
    try {
      return await this.prisma.store.delete({ where: { id } });
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new BadRequestException('Cannot delete Store: storage locations or inventory stocks exist inside this store.');
      }
      throw error;
    }
  }
  async createLocation(storeId: string, data: any) {
    return this.prisma.location.create({
      data: { ...data, storeId },
    });
  }

  // Taxes
  async getTaxes() {
    return this.prisma.tax.findMany({ orderBy: { rate: 'asc' } });
  }
  async createTax(data: any) {
    return this.prisma.tax.create({ data });
  }

  // Transporters
  async getTransporters() {
    return this.prisma.transporter.findMany({ orderBy: { name: 'asc' } });
  }
  async createTransporter(data: any) {
    return this.prisma.transporter.create({ data });
  }

  // Machines
  async getMachines() {
    return (this.prisma as any).machine.findMany({ orderBy: { code: 'asc' } });
  }
  async createMachine(data: any) {
    const existing = await (this.prisma as any).machine.findUnique({ where: { code: data.code } });
    if (existing) throw new ConflictException(`Machine code ${data.code} already exists`);
    return (this.prisma as any).machine.create({ data });
  }
  async updateMachine(id: string, data: any) {
    return (this.prisma as any).machine.update({ where: { id }, data });
  }

  // Employees
  async getEmployees() {
    return (this.prisma as any).employee.findMany({ orderBy: { fullName: 'asc' } });
  }
  async createEmployee(data: any) {
    const existing = await (this.prisma as any).employee.findUnique({ where: { code: data.code } });
    if (existing) throw new ConflictException(`Employee code ${data.code} already exists`);
    return (this.prisma as any).employee.create({ data });
  }
  async updateEmployee(id: string, data: any) {
    return (this.prisma as any).employee.update({ where: { id }, data });
  }

  // Customer Parts Mapping
  async getCustomerParts(customerId?: string) {
    const where: any = {};
    if (customerId) where.customerId = customerId;
    return (this.prisma as any).customerPart.findMany({
      where,
      include: { customer: true, part: true },
      orderBy: { customerPartCode: 'asc' },
    });
  }
  async createCustomerPart(data: any) {
    return (this.prisma as any).customerPart.create({
      data,
      include: { customer: true, part: true },
    });
  }
  async updateCustomerPart(id: string, data: any) {
    return (this.prisma as any).customerPart.update({
      where: { id },
      data,
      include: { customer: true, part: true },
    });
  }
}
