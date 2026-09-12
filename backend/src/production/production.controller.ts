import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProductionService } from './production.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  // BOM
  @Get('bom')
  @RequirePermissions('production.view')
  getBOMs() {
    return this.productionService.getBOMs();
  }

  @Get('bom/:id')
  @RequirePermissions('production.view')
  getBOM(@Param('id') id: string) {
    return this.productionService.getBOM(id);
  }

  @Post('bom')
  @RequirePermissions('production.manage')
  createBOM(@Body() body: any) {
    return this.productionService.createBOM(body);
  }

  // BOM Routing Steps
  @Get('bom/:id/routing')
  @RequirePermissions('production.view')
  getRouting(@Param('id') bomId: string) {
    return this.productionService.getRouting(bomId);
  }

  @Post('bom/:id/routing')
  @RequirePermissions('production.manage')
  addRoutingStep(@Param('id') bomId: string, @Body() body: any) {
    return this.productionService.addRoutingStep(bomId, body);
  }

  @Delete('routing-steps/:id')
  @RequirePermissions('production.manage')
  deleteRoutingStep(@Param('id') id: string) {
    return this.productionService.deleteRoutingStep(id);
  }

  // Operations
  @Get('operations')
  @RequirePermissions('production.view')
  getOperations() {
    return this.productionService.getOperations();
  }

  @Post('operations')
  @RequirePermissions('production.manage')
  createOperation(@Body() body: any) {
    return this.productionService.createOperation(body);
  }

  // Plans
  @Get('plans')
  @RequirePermissions('production.view')
  getPlans() {
    return this.productionService.getPlans();
  }

  @Post('plans')
  @RequirePermissions('production.manage')
  createPlan(@Body() body: any) {
    return this.productionService.createPlan(body);
  }

  // Job Cards
  @Get('job-cards')
  @RequirePermissions('production.view')
  getJobCards(
    @Query('planId') planId?: string,
    @Query('status') status?: string,
  ) {
    return this.productionService.getJobCards({ planId, status });
  }

  @Post('job-cards')
  @RequirePermissions('production.manage')
  createJobCard(@Body() body: any) {
    return this.productionService.createJobCard(body);
  }

  @Get('job-cards/:id/operations')
  @RequirePermissions('production.view')
  getJobCardOperations(@Param('id') id: string) {
    return this.productionService.getJobCardOperations(id);
  }

  @Put('job-card-operations/:id')
  @RequirePermissions('production.manage')
  updateJobCardOperation(@Param('id') id: string, @Body() body: any) {
    return this.productionService.updateJobCardOperation(id, body);
  }

  @Post('material-issues')
  @RequirePermissions('inventory.issue')
  issueMaterial(@Req() req: any, @Body() body: any) {
    return this.productionService.issueMaterial(req.user.id, body);
  }

  @Post('job-cards/:id/complete')
  @RequirePermissions('production.manage')
  completeJobCard(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.productionService.completeJobCard(req.user.id, id, body);
  }

  @Post('material-returns')
  @RequirePermissions('inventory.return')
  returnMaterial(@Req() req: any, @Body() body: any) {
    return this.productionService.returnMaterial(req.user.id, body);
  }

  @Get('material-returns')
  @RequirePermissions('production.view')
  getMaterialReturns() {
    return this.productionService.getMaterialReturns();
  }
}

