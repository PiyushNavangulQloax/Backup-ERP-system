# System Assumptions & Business Rules

## 1. Domain Assumptions

1. **Multi-Store and Location Topology**:
   - Stores represent warehouses or distinct holding areas (e.g., Raw Material Store, Finished Goods Store, Scrap Yard).
   - Locations represent specific racks or bins within a store (e.g., RM-RACK-01, FG-BIN-A2).
   - Material Inwarding (GRN) deposits inventory directly into the designated store/location after inspection.

2. **Purchasing & GRN Tolerance**:
   - Partial receipts against a Purchase Order are allowed.
   - An over-receipt exceeding 10% requires administrative override or po update.
   - Only accepted quantities update inventory; rejected quantities are recorded with a reason code and quarantined.

3. **Production & BOM**:
   - Multi-level BOM structures resolve component requirements per standard production unit.
   - Job Cards track planned quantity vs issued quantity vs completed quantity vs rejected scrap.
   - Material issues from raw material stores reduce raw material inventory, while completed job cards increase finished goods inventory.

4. **Barcode & Box Packaging**:
   - Each manufactured box gets a unique serialized box code formatted as `BOX-YYYYMMDD-XXXX`.
   - Barcode scanning verifies whether an item or batch belongs to the specific packing order before sealing the box.
   - Closed boxes cannot be modified unless explicitly reopened by an authorized supervisor.

5. **Invoicing & Dispatch Lifecycle**:
   - Invoices can only be generated against finished goods and sealed boxes.
   - Dispatch gate-out requires barcode verification of every box on the manifest to ensure 100% packing accuracy.

6. **Local Development Environment**:
   - In development environments where Docker or system-level PostgreSQL is not installed or service is halted, SQLite/PostgreSQL Prisma configurations allow immediate zero-friction startup, testing, and execution while preserving full PostgreSQL compatibility for production deployments.
