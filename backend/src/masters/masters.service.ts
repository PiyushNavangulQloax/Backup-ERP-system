import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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

  // Parts
  async getParts() {
    return this.prisma.part.findMany({
      include: { unit: true, stocks: { include: { store: true, location: true } } },
      orderBy: { name: 'asc' },
    });
  }
  async createPart(data: any) {
    const existing = await this.prisma.part.findUnique({ where: { code: data.code } });
    if (existing) throw new ConflictException(`Part code ${data.code} already exists`);
    
    // Auto-generate barcode value if not specified
    const barcodeValue = data.barcodeValue || `${data.code}-BC`;
    const part = await this.prisma.part.create({
      data: {
        ...data,
        barcodeValue,
      },
      include: { unit: true },
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

    return part;
  }
  async updatePart(id: string, data: any) {
    return this.prisma.part.update({ where: { id }, data, include: { unit: true } });
  }

  // Units
  async getUnits() {
    return this.prisma.unit.findMany({ orderBy: { name: 'asc' } });
  }
  async createUnit(data: any) {
    return this.prisma.unit.create({ data });
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
}
