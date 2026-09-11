import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @RequirePermissions('documents.view')
  findAll(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('search') search?: string,
  ) {
    return this.documentsService.findAll({ entityType, entityId, search });
  }

  @Get(':id')
  @RequirePermissions('documents.view')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Get(':id/references')
  @RequirePermissions('documents.view')
  getReferences(@Param('id') id: string) {
    return this.documentsService.getReferences(id);
  }

  @Post()
  @RequirePermissions('documents.upload')
  create(@Req() req: any, @Body() body: any) {
    return this.documentsService.create(req.user.id, body);
  }

  @Delete(':id')
  @RequirePermissions('documents.upload')
  delete(@Param('id') id: string) {
    return this.documentsService.delete(id);
  }
}
