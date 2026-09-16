# Manufacturing ERP 2.0 — Bug Fix & Business Gap Remediation Report

## Summary of Remediated Issues

| Fix ID | Issue Title | Severity | Classification | Status |
|---|---|---|---|---|
| **BUG-01** | Stock Double Deduction (Invoice Payment + Dispatch Gate-Out) | Critical | A. BUG FIX | **FIXED** |
| **BUG-02** | Dispatch Ambiguous Stock Selection & Silent Under-Deduction | Critical | C. DATA INTEGRITY FIX | **FIXED** |
| **BUG-03** | Packing Without Finished Goods Stock Validation | High | C. DATA INTEGRITY FIX | **FIXED** |
| **BUG-04** | Production Completion Beyond Target Quantity & Repeat Completion | High | A. BUG FIX | **FIXED** |
| **BUG-05** | GRN Over-Receipt & Unverified Stock Posting | High | C. DATA INTEGRITY FIX | **FIXED** |
| **GAP-01** | Missing Sales Order / Customer Order Entity & Workflow | High | D. PRD REQUIREMENT GAP | **FIXED** |
| **GAP-02** | Missing Packing Order Entity & Coordination | Medium | D. PRD REQUIREMENT GAP | **FIXED** |
| **SEC-01** | Inappropriate Master Data & Users Permission Granularity | Medium | B. SECURITY/RBAC FIX | **FIXED** |
| **SEC-02** | Documents Deletion RBAC & Navigation Mismatch | Low | B. SECURITY/RBAC FIX | **FIXED** |

---

### Detailed Analysis by Issue

#### 1. BUG-01: Stock Double Deduction
- **Issue**: System deducted inventory twice for customer shipments — once upon payment confirmation (`InvoicesService.confirmPayment`) and again upon physical gate-out (`DispatchService.gateOut`).
- **Root Cause**: Commercial payment logic contained an automated inventory deduction routine creating `StockMovement` entries with `movementType: 'DISPATCH'`.
- **Solution**: Removed inventory mutation from `InvoicesService.confirmPayment`. Added an immutable audit log entry for payments. Canonical physical deduction is restricted strictly to `DispatchService.gateOut` and `GatePassService.authorizeGateOut`.
- **Files Modified**: `backend/src/invoices/invoices.service.ts`.
- **Verification Result**: Initial stock: 100 → Invoice created & paid for 20 → Stock remains 100 → Gate-Out 20 → Stock correctly reaches exactly 80 (not 60).

---

#### 2. BUG-02: Dispatch Ambiguous Stock Selection & Silent Under-Deduction
- **Issue**: `gateOut` searched for inventory using only `partId` with `findFirst`, potentially deducting from `RAW_MATERIALS` store rather than `FINISHED_GOODS`. Furthermore, if stock was insufficient, it silently bypassed deduction instead of rolling back the transaction.
- **Root Cause**: Lack of store type filtering and absence of an exception trigger when `quantityOnHand < item.quantity`.
- **Solution**: Filtered stock deduction to `store.type === 'FINISHED_GOODS'` first, then validated available quantity. If insufficient, throws `BadRequestException("Insufficient finished-goods stock...")`, automatically aborting and rolling back the Prisma transaction.
- **Files Modified**: `backend/src/dispatch/dispatch.service.ts`, `backend/src/dispatch/gate-pass.service.ts`.
- **Verification Result**: Gate-out blocks and rolls back cleanly when finished goods stock is insufficient.

---

#### 3. BUG-03: Packing Without Finished Goods Stock Validation
- **Issue**: Users could pack arbitrary quantities into boxes regardless of physical stock on hand.
- **Root Cause**: `PackingService.addItemToBox` and `BarcodesService.scanBarcode('BOX_PACK')` directly created `BoxItem` records without querying stock aggregates.
- **Solution**: Added stock aggregation check before packing. If `available < requested`, request is rejected with `BadRequestException`.
- **Files Modified**: `backend/src/packing/packing.service.ts`, `backend/src/barcodes/barcodes.service.ts`.
- **Verification Result**: Attempting to pack 50 units when only 10 exist in stock returns HTTP 400 with a descriptive shortage message.

---

#### 4. BUG-04: Production Over-Completion & Duplicate Receipt
- **Issue**: `ProductionService.completeJobCard` accepted any arbitrary `producedQty`, allowing production beyond `targetQty`, and allowed repeated completions of already completed job cards.
- **Root Cause**: Lack of target quantity upper bound validation and missing status guard check.
- **Solution**: Added validation that `producedQty + rejectedQty <= targetQty`. Added guard check `if (jobCard.status === 'COMPLETED') throw new BadRequestException(...)`. Automatically increments `ProductionPlan.completedQty`.
- **Files Modified**: `backend/src/production/production.service.ts`.
- **Verification Result**: Repeated calls or excess output rejected with descriptive error.

---

#### 5. BUG-05: GRN Over-Receipt & Quality Rejection Integrity
- **Issue**: Stores could create GRNs exceeding remaining PO quantities, and rejected quantities lacked mandatory rejection justification.
- **Root Cause**: Missing remaining quantity calculation and missing rejection reason validation in `GrnService.create`.
- **Solution**: Enforced `receivedQty <= (orderedQty - receivedQty)`, enforced `acceptedQty + rejectedQty <= receivedQty`, and made `rejectionReason` mandatory when `rejectedQty > 0`. Ensured only `acceptedQty` enters inventory.
- **Files Modified**: `backend/src/grn/grn.service.ts`.
- **Verification Result**: Stores cannot receive more than PO balance, and rejected items require reasons and do not enter stock.

---

#### 6. GAP-01 & GAP-02: Sales Orders and Packing Orders
- **Issue**: PRD required complete customer demand workflow (Sales Order → Packing Order → Boxes → Invoice → Dispatch).
- **Root Cause**: System previously coupled Invoices directly to Customers without Sales Order demand and fulfillment tracking.
- **Solution**:
  - Implemented `SalesOrder` and `SalesOrderItem` models in Prisma.
  - Implemented `PackingOrder` and `PackingOrderItem` models in Prisma.
  - Created `SalesOrdersService`, `SalesOrdersController`, `SalesOrdersModule`.
  - Added Packing Order endpoints in `PackingService` and `PackingController`.
  - Created `frontend/src/pages/SalesOrdersPage.tsx` and wired `/sales-orders` route in Sidebar and App.
- **Files Created/Modified**:
  - `backend/prisma/schema.prisma`
  - `backend/src/sales-orders/sales-orders.service.ts`
  - `backend/src/sales-orders/sales-orders.controller.ts`
  - `backend/src/sales-orders/sales-orders.module.ts`
  - `backend/src/packing/packing.service.ts`
  - `backend/src/packing/packing.controller.ts`
  - `backend/src/app.module.ts`
  - `frontend/src/pages/SalesOrdersPage.tsx`
  - `frontend/src/components/Sidebar.tsx`
  - `frontend/src/App.tsx`
- **Verification Result**: Customer orders can be created in DRAFT, submitted, approved, linked to packing, and tracked through dispatch.

---

#### 7. SEC-01 & SEC-02: RBAC Hardening & Permission Consistency
- **Issue**: Navigation showed menu items regardless of user permissions (e.g. Documents & Drawings shown to all, Users & Roles hardcoded to role name). Document delete used `documents.upload` permission code.
- **Root Cause**: Frontend hardcoded checks and inaccurate `@RequirePermissions` annotation.
- **Solution**:
  - Aligned `Sidebar.tsx` items to check `hasPermission('documents.view')`, `hasPermission('users.view')`, `hasPermission('audit.view')`.
  - Corrected `DocumentsController.delete` to require `@RequirePermissions('documents.delete')`.
  - Added `documents.delete` to seed permissions.
- **Files Modified**: `backend/src/documents/documents.controller.ts`, `backend/prisma/seed.ts`, `frontend/src/components/Sidebar.tsx`.
- **Verification Result**: Navigation and backend routes strictly adhere to fine-grained permissions.
