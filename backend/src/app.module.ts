import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MastersModule } from './masters/masters.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { GrnModule } from './grn/grn.module';
import { InventoryModule } from './inventory/inventory.module';
import { ProductionModule } from './production/production.module';
import { BarcodesModule } from './barcodes/barcodes.module';
import { PackingModule } from './packing/packing.module';
import { InvoicesModule } from './invoices/invoices.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';
import { DocumentsModule } from './documents/documents.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SalesOrdersModule } from './sales-orders/sales-orders.module';
import { QualityModule } from './quality/quality.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    MastersModule,
    PurchaseOrdersModule,
    GrnModule,
    InventoryModule,
    ProductionModule,
    BarcodesModule,
    PackingModule,
    InvoicesModule,
    DispatchModule,
    DashboardModule,
    ReportsModule,
    AuditModule,
    DocumentsModule,
    NotificationsModule,
    SalesOrdersModule,
    QualityModule,
  ],
})
export class AppModule {}
