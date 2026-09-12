import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
  @Delete('customers/:id')
  @RequirePermissions('masters.delete')
  deleteCustomer(@Param('id') id: string) {
    return this.mastersService.deleteCustomer(id);
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
  @Delete('suppliers/:id')
  @RequirePermissions('masters.delete')
  deleteSupplier(@Param('id') id: string) {
    return this.mastersService.deleteSupplier(id);
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
  @Delete('parts/:id')
  @RequirePermissions('masters.delete')
  deletePart(@Param('id') id: string) {
    return this.mastersService.deletePart(id);
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
  @Put('stores/:id')
  @RequirePermissions('masters.edit')
  updateStore(@Param('id') id: string, @Body() body: any) {
    return this.mastersService.updateStore(id, body);
  }
  @Delete('stores/:id')
  @RequirePermissions('masters.delete')
  deleteStore(@Param('id') id: string) {
    return this.mastersService.deleteStore(id);
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
  @Put('units/:id')
  @RequirePermissions('masters.edit')
  updateUnit(@Param('id') id: string, @Body() body: any) {
    return this.mastersService.updateUnit(id, body);
  }
  @Delete('units/:id')
  @RequirePermissions('masters.delete')
  deleteUnit(@Param('id') id: string) {
    return this.mastersService.deleteUnit(id);
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

  // Machines
  @Get('machines')
  @RequirePermissions('masters.view')
  getMachines() {
    return this.mastersService.getMachines();
  }
  @Post('machines')
  @RequirePermissions('masters.create')
  createMachine(@Body() body: any) {
    return this.mastersService.createMachine(body);
  }
  @Put('machines/:id')
  @RequirePermissions('masters.edit')
  updateMachine(@Param('id') id: string, @Body() body: any) {
    return this.mastersService.updateMachine(id, body);
  }

  // Employees
  @Get('employees')
  @RequirePermissions('masters.view')
  getEmployees() {
    return this.mastersService.getEmployees();
  }
  @Post('employees')
  @RequirePermissions('masters.create')
  createEmployee(@Body() body: any) {
    return this.mastersService.createEmployee(body);
  }
  @Put('employees/:id')
  @RequirePermissions('masters.edit')
  updateEmployee(@Param('id') id: string, @Body() body: any) {
    return this.mastersService.updateEmployee(id, body);
  }

  // Customer Parts Mapping
  @Get('customer-parts')
  @RequirePermissions('masters.view')
  getCustomerParts() {
    return this.mastersService.getCustomerParts();
  }
  @Post('customer-parts')
  @RequirePermissions('masters.create')
  createCustomerPart(@Body() body: any) {
    return this.mastersService.createCustomerPart(body);
  }
  @Put('customer-parts/:id')
  @RequirePermissions('masters.edit')
  updateCustomerPart(@Param('id') id: string, @Body() body: any) {
    return this.mastersService.updateCustomerPart(id, body);
  }
}
