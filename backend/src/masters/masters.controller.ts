import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { MastersService } from './masters.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('masters')
export class MastersController {
  constructor(private readonly mastersService: MastersService) {}

  // Customers
  @Get('customers')
  @RequirePermissions('masters.view')
  getCustomers() {
    return this.mastersService.getCustomers();
  }
  @Post('customers')
  @RequirePermissions('masters.create')
  createCustomer(@Body() body: any) {
    return this.mastersService.createCustomer(body);
  }
  @Put('customers/:id')
  @RequirePermissions('masters.edit')
  updateCustomer(@Param('id') id: string, @Body() body: any) {
    return this.mastersService.updateCustomer(id, body);
  }

  // Suppliers
  @Get('suppliers')
  @RequirePermissions('masters.view')
  getSuppliers() {
    return this.mastersService.getSuppliers();
  }
  @Post('suppliers')
  @RequirePermissions('masters.create')
  createSupplier(@Body() body: any) {
    return this.mastersService.createSupplier(body);
  }
  @Put('suppliers/:id')
  @RequirePermissions('masters.edit')
  updateSupplier(@Param('id') id: string, @Body() body: any) {
    return this.mastersService.updateSupplier(id, body);
  }

  // Parts
  @Get('parts')
  @RequirePermissions('masters.view')
  getParts() {
    return this.mastersService.getParts();
  }
  @Post('parts')
  @RequirePermissions('masters.create')
  createPart(@Body() body: any) {
    return this.mastersService.createPart(body);
  }
  @Put('parts/:id')
  @RequirePermissions('masters.edit')
  updatePart(@Param('id') id: string, @Body() body: any) {
    return this.mastersService.updatePart(id, body);
  }

  // Stores & Locations
  @Get('stores')
  @RequirePermissions('masters.view')
  getStores() {
    return this.mastersService.getStores();
  }
  @Post('stores')
  @RequirePermissions('masters.create')
  createStore(@Body() body: any) {
    return this.mastersService.createStore(body);
  }
  @Post('stores/:id/locations')
  @RequirePermissions('masters.create')
  createLocation(@Param('id') storeId: string, @Body() body: any) {
    return this.mastersService.createLocation(storeId, body);
  }

  // Units
  @Get('units')
  @RequirePermissions('masters.view')
  getUnits() {
    return this.mastersService.getUnits();
  }
  @Post('units')
  @RequirePermissions('masters.create')
  createUnit(@Body() body: any) {
    return this.mastersService.createUnit(body);
  }

  // Taxes
  @Get('taxes')
  @RequirePermissions('masters.view')
  getTaxes() {
    return this.mastersService.getTaxes();
  }
  @Post('taxes')
  @RequirePermissions('masters.create')
  createTax(@Body() body: any) {
    return this.mastersService.createTax(body);
  }

  // Transporters
  @Get('transporters')
  @RequirePermissions('masters.view')
  getTransporters() {
    return this.mastersService.getTransporters();
  }
  @Post('transporters')
  @RequirePermissions('masters.create')
  createTransporter(@Body() body: any) {
    return this.mastersService.createTransporter(body);
  }
}
