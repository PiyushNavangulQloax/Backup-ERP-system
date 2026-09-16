# PHASE 3.1: COMPLETE FUNCTIONAL GAP & WORKFLOW AUDIT REPORT
**Manufacturing ERP 2.0 — Enterprise Architecture, Security & Traceability Assessment**
**Audit Mode:** READ-ONLY Inspection & Verification  
**Evaluation Standards:** Product Requirements Document (PRD), `docs/requirements-checklist.md`, `docs/ERP_WORKFLOW_AND_RBAC_AUDIT.md`, NestJS Architecture, Prisma Schema, TypeScript / React Frontend.

---

## 1. Executive Summary

Manufacturing ERP 2.0 was subjected to an exhaustive, read-only functional and architectural audit covering all five system layers:
1. **Database** (Prisma Schema, PostgreSQL constraints, indices, relational referential integrity)
2. **Backend Service** (Business rules, state machines, transaction safety, ledger integrity)
3. **Backend Controller / API** (Route exposure, request validation pipes, HTTP exception mapping)
4. **Frontend UI** (Route protection, state management, form validation, error/empty states)
5. **RBAC / Security** (Fine-grained permission guards, separation of duties, lifecycle bypasses)

### Overall Readiness Assessment:
**Grade: C — REQUIRES PHASE 3 IMPLEMENTATION**

The system exhibits an exceptionally strong, robust core in **Inventory Ledger Guarantees**, **Transactional Gate-Out Concurrency**, **Basic RBAC Enforcement**, and **Sales Order to Invoice Linkage**. Specifically, critical vulnerabilities identified in earlier phases (such as Gate-Out store fallback and unledgered opening stock mutations) have been completely remediated.

However, significant functional gaps and "functional shell" modules remain that prevent complete end-to-end autonomous business operations. Most notably:
- **Quality Module**: Exists only as embedded fields in GRN items and Job Cards. There is no independent Quality module, inspection checklist, or standalone quality approval workflow.
- **Packing Orders vs Box Packing**: Backend supports `PackingOrder` linked to `SalesOrder`, but the frontend `PackingPage.tsx` ignores `PackingOrder` and only operates on ad-hoc box creation.
- **Audit Logging**: While the `AuditLog` entity and UI exist, business events (PO approval, GRN verification, Stock adjustments, Production completion, Box sealing, Master mutations) do not write to the audit log (only login, payment, and gate-out are logged).
- **Document Management**: The document upload API accepts metadata and assigns a hardcoded mock URL (`/storage/uploads/docs/...`) without multipart file storage or physical file streaming.
- **Dispatch Manifest Validation**: Any sealed box can be attached to any invoice without validating that the box contents match the invoiced parts and customer.

---

## 2. Current System Architecture

The application is structured as a decoupled full-stack TypeScript monolith:

```
[React 18 + Vite + Tailwind / Lucide UI] 
       │ (Axios API Client + JWT Bearer Token + LocalStorage User Context)
       ▼
[NestJS 10 REST API Gateway]
  ├── Global ValidationPipe (whitelist: true, transform: true)
  ├── JwtAuthGuard + RolesGuard + PermissionsGuard (Reflector-based RBAC)
  ├── 17 Domain Feature Modules & Controllers
  └── PrismaClient ORM Service ($transaction ACID blocks)
       │ (Connection Pool / Prepared Statements)
       ▼
[PostgreSQL 15 Relational Database Engine]
  ├── 47 Domain Entities / Tables
  ├── Referential Foreign Key Actions (Cascade on items, Restrict on headers)
  └── Composite Unique Constraints & Performance Indices
```

### Module Landscape:
- **Auth & Identity**: `auth`, `users`
- **Master Data**: `masters` (Customers, Suppliers, Parts, Stores, Locations, Units, Taxes, Transporters, Machines, Employees, Operations)
- **Procurement & Inwarding**: `purchase-orders`, `grn`
- **Inventory & Warehouse**: `inventory`
- **Manufacturing Execution**: `bom`, `production`, `job-cards`, `material-issues`
- **Packaging & Labeling**: `packing`, `barcodes`
- **Commercial & Billing**: `sales-orders`, `invoices`
- **Shipping & Fulfillment**: `dispatch` (`gate-pass`)
- **System Services**: `dashboard`, `reports`, `documents`, `audit`

---

## 3. Module-by-Module Audit

### Module A: Authentication & User Management
- **Database**: `User`, `Role`, `Permission`, `UserRole`, `RolePermission` models. Password hash stored via `bcrypt`.
- **Backend Service**: `auth.service.ts`, `users.service.ts`. JWT access tokens (15m expiration) and refresh tokens (7d). Secure Argon2/bcrypt comparison.
- **Backend Controller / API**:
  - `POST /api/v1/auth/login`: Issues JWT + user payload.
  - `POST /api/v1/auth/refresh`: Token rotation.
  - `GET /api/v1/auth/me`: Current user context.
  - `POST /api/v1/auth/change-password`: Self-service credential update.
  - `GET/POST/PUT /api/v1/users`: User management with `@RequirePermissions('users.view' | 'users.create' | 'users.edit')`.
- **Frontend UI**:
  - `frontend/src/pages/LoginPage.tsx`: Clean login form with error handling.
  - `frontend/src/pages/UsersPage.tsx`: User listing, activation/deactivation toggle, role assignment.
  - `frontend/src/components/ProtectedRoute.tsx`: Client-side route protection checking permissions and roles.
- **RBAC**: 9 seeded roles and 42 fine-grained permissions.
- **Status**: **A (Fully Implemented)**

---

### Module B: Master Data
- **Database**: `Customer`, `Supplier`, `Part`, `Unit`, `Store`, `Location`, `Tax`, `Transporter`, `Machine`, `Employee`, `Operation`, `CustomerPart`.
- **Uniqueness Constraints**:
  - `Part.code` (`@unique`), `Customer.code` (`@unique`), `Supplier.code` (`@unique`), `Store.code` (`@unique`), `Unit.code` (`@unique`), `Tax.code` (`@unique`).
  - Composite unique on `CustomerPart(customerId, partId)`.
- **Backend Service**: `masters.service.ts`. Handles CRUD, opening stock initialization with transaction-safe `StockMovement` logging.
- **Backend Controller / API**:
  - `GET/POST/PUT/DELETE /api/v1/masters/:entity`
  - Validation via DTOs. Soft/hard delete protection if records are referenced.
- **Frontend UI**: `frontend/src/pages/MastersPage.tsx`. Tabbed interface for all masters, search bar, creation modals, active/inactive badges.
- **Status**: **A (Fully Implemented)**

---

### Module C: Purchase Order
- **Database**: `PurchaseOrder`, `PurchaseOrderItem`.
- **Lifecycle**: `DRAFT` → `SUBMITTED` → `APPROVED` / `REJECTED` → `PARTIAL` → `COMPLETED` / `CANCELLED`.
- **Backend Service**: `purchase-orders.service.ts`. Calculates subtotal, tax, total amounts. Enforces approval status transitions.
- **Backend Controller / API**:
  - `GET /api/v1/purchase-orders`
  - `POST /api/v1/purchase-orders`
  - `PUT /api/v1/purchase-orders/:id`
  - `POST /api/v1/purchase-orders/:id/approve`
  - `POST /api/v1/purchase-orders/:id/reject`
  - `GET /api/v1/purchase-orders/:id/pdf`
- **Identified Defect / Gap**:
  - When creating a PO via `create()`, the initial status is hardcoded directly to `SUBMITTED`. There is no separate action for the user to save as `DRAFT` and submit later.
- **Status**: **B (Partially Implemented - Minor Defect in Initial State)**

---

### Module D: Material Inward / GRN
- **Database**: `GRN`, `GRNItem`. Stores `receivedQty`, `acceptedQty`, `rejectedQty`, `rejectionReason`.
- **Backend Service**: `grn.service.ts`.
  - Enforces: `receivedQty === acceptedQty + rejectedQty`.
  - Enforces: `rejectedQty > 0` requires `rejectionReason`.
  - Enforces: `receivedQty` must not exceed PO item remaining quantity (`orderedQty - receivedQty`).
  - On verification (`verifyGRN`): Only `acceptedQty` is upserted into `Stock` with `StockMovement` type `INWARD_GRN`.
- **Identified Defect**:
  - If a GRN has 100% rejected items (`acceptedQty === 0`), `grn.service.ts` updates the parent PO status to `PARTIAL`, even though 0 units were accepted into inventory.
- **Status**: **E (Implemented with Functional Defect in PO Status Synchronization)**

---

### Module E: Inventory / Stock
- **Database**: `Stock` (composite index `[partId, storeId, locationId]`), `StockMovement`.
- **Backend Service**: `inventory.service.ts`.
  - Adjustment: `ADJUSTMENT_ADD`, `ADJUSTMENT_SUB` with mandatory reason.
  - Transfer: `TRANSFER_OUT` from source, `TRANSFER_IN` to destination within `$transaction`.
  - Negative Stock Prevention: Strictly blocks operations resulting in negative quantity.
- **All Mutation Paths Ledgered**:
  - GRN verification (`INWARD_GRN`)
  - Material Issue (`PROD_ISSUE`)
  - Material Return (`PROD_RETURN`)
  - Production Completion (`PROD_RECEIPT`)
  - Stock Adjustment (`ADJUSTMENT_ADD`, `ADJUSTMENT_SUB`)
  - Stock Transfer (`TRANSFER_OUT`, `TRANSFER_IN`)
  - Opening Stock (`ADJUSTMENT_ADD`, `ADJUSTMENT_SUB`)
  - Gate-Out (`DISPATCH`)
- **Status**: **A (Fully Implemented & Ledger Complete)**

---

### Module F: Production Execution
- **Database**: `BOM`, `BOMItem`, `Routing`, `RoutingOperation`, `ProductionPlan`, `JobCard`, `JobCardOperation`, `MaterialIssue`, `MaterialIssueItem`, `MaterialReturn`.
- **Backend Service**:
  - `production.service.ts`, `job-cards.service.ts`, `material-issues.service.ts`.
  - Completion rule: `producedQty + rejectedQty` cannot exceed target quantity.
  - Repeat completion prevention: Completed job cards cannot be re-completed.
  - Finished goods increment: Only `producedQty` is added to `FINISHED_GOODS` store stock with `PROD_RECEIPT` movement.
- **Frontend UI**: `frontend/src/pages/ProductionPage.tsx`. Tabbed view for Plans, Job Cards, BOMs, Material Issues.
- **Status**: **A (Fully Implemented)**

---

### Module G: Quality Module
- **Database**: **MISSING**. No `QualityInspection`, `QualityParameter`, or `QualityChecklist` tables.
- **Backend Service**: **MISSING**. No `quality.service.ts`.
- **Backend Controller / API**: **MISSING**. No dedicated quality endpoints.
- **Frontend UI**: **MISSING**. No `QualityPage.tsx`.
- **Current Mechanism**: Quality checking is merely an embedded step inside `GRN.verify` (`acceptedQty` / `rejectedQty`) and `JobCard.complete` (`producedQty` / `rejectedQty`).
- **Status**: **D (Missing Standalone Module / Embedded Only)**

---

### Module H: Packing
- **Database**: `PackingOrder`, `PackingOrderItem`, `Box`, `BoxItem`.
- **Backend Service**: `packing.service.ts`. Supports Box creation, scanning item into box, closing box (`SEALED`), quantity validation against stock.
- **Frontend UI**: `frontend/src/pages/PackingPage.tsx`.
  - Creates boxes, scans part barcodes, adds quantities, seals boxes.
  - **Gap**: The frontend has zero awareness of `PackingOrder` or `SalesOrder`. Box packing in UI is entirely standalone/ad-hoc.
- **Status**: **C (Technically Implemented, Incomplete UI / Workflow Integration)**

---

### Module I: Barcode System
- **Database**: `Barcode`, `BarcodeScanHistory`.
- **Barcode Types**:
  - `BOX`: Unique serial barcode per physical box (`BOX-YYYYMMDD-XXXX`).
  - `PART`: Catalog identifier barcode (e.g. `PART-RAW-001`).
- **Scanning Logic**: `barcodes.service.ts`. Validates barcode exists, is active, records scan event to `BarcodeScanHistory` with user and timestamp.
- **Serialized Unit Tracking**: **NOT SUPPORTED**. The system does not serialize individual manufactured units (e.g., individual circuit boards or machined brackets); serialization exists only at the Box container level.
- **Status**: **B (Partially Implemented - Box Serialized, Part Catalog Only)**

---

### Module J: Sales Order
- **Database**: `SalesOrder`, `SalesOrderItem`.
- **Lifecycle**: `DRAFT` → `SUBMITTED` → `APPROVED` → `PARTIALLY_FULFILLED` → `FULFILLED` / `CANCELLED`.
- **Backend Service**: `sales-orders.service.ts`. Enforces `submit()` and `approve()` state transitions. Validates customer and part associations.
- **Frontend UI**: `frontend/src/pages/SalesOrdersPage.tsx`. Table listing, modal creation, status badges, submit/approve actions.
- **Status**: **A (Fully Implemented)**

---

### Module K: Invoice & Billing
- **Database**: `Invoice`, `InvoiceItem`. Links optionally or required to `salesOrderId`.
- **Backend Service**: `invoices.service.ts`.
  - Validates linked Sales Order must be in `APPROVED` status.
  - Validates invoice item quantity does not exceed available unbilled Sales Order quantity.
  - Handles payment confirmation (`markPaid`).
  - **Critical Verification**: Invoicing and payment **NEVER** deduct physical inventory.
- **Frontend UI**: `frontend/src/pages/InvoicesPage.tsx`. Includes Sales Order selector, auto-populates items, generates PDF invoice.
- **Status**: **A (Fully Implemented)**

---

### Module L: Dispatch & Gate-Out
- **Database**: `Dispatch`, `DispatchBox`, `GatePass`.
- **Backend Service**: `dispatch.service.ts`, `gate-pass.service.ts`.
  - Box verification: Scans box barcode to attach to dispatch manifest.
  - Gate-Out execution:
    - Atomically verifies boxes are `SEALED` and dispatch is `READY_FOR_GATE_OUT` / `APPROVED`.
    - Deducts physical stock **strictly and exclusively** from `FINISHED_GOODS` store types using atomic `updateMany`.
    - Creates `DISPATCH` `StockMovement` ledger entry for each item.
    - Marks boxes as `DISPATCHED` and GatePass as `GATE_OUT`.
    - Concurrency-safe and idempotent: Duplicate execution attempts are rejected.
- **Identified Gap**:
  - `dispatch.service.ts` does not validate whether items inside the attached boxes match the items billed on the invoice or belong to the customer.
- **Status**: **B (Partially Implemented - Concurrency Hardened, Manifest Item Matching Missing)**

---

### Module M: Document Management
- **Database**: `Document`, `DocumentRevision`.
- **Backend Service & Controller**: `documents.service.ts`, `documents.controller.ts`.
- **Identified Fake Completeness**:
  - Upload endpoint `POST /api/v1/documents/upload` does not use Multer file interceptor. It only receives JSON metadata and sets `fileUrl: /storage/uploads/docs/${body.filename}`.
  - No physical binary file is saved to disk or S3.
  - Download endpoint `GET /api/v1/documents/:id/download` does not stream file content.
- **Status**: **C (Functional Shell / Fake Completeness)**

---

### Module N: Reports & Dashboard
- **Database & Queries**: Aggregates live data from Prisma tables (`Stock`, `PurchaseOrder`, `GRN`, `JobCard`, `Invoice`, `Dispatch`).
- **Backend Service**: `dashboard.service.ts`, `reports.service.ts`.
- **Exports**: `reports.service.ts` implements Excel generation via `exceljs` for stock, purchase orders, and production.
- **Frontend UI**: `frontend/src/pages/DashboardPage.tsx` and `frontend/src/pages/ReportsPage.tsx`.
- **Status**: **A (Fully Implemented & Functional)**

---

### Module O: Audit Logging
- **Database**: `AuditLog` entity with `action`, `entityType`, `entityId`, `userId`, `oldValues`, `newValues`, `ipAddress`.
- **Frontend UI**: `frontend/src/pages/AuditPage.tsx` displays filterable audit logs.
- **Identified Gap**:
  - Audit logging is only invoked in 3 services:
    1. `auth.service.ts` (`USER_LOGIN`)
    2. `invoices.service.ts` (`INVOICE_PAYMENT`)
    3. `dispatch.service.ts` / `gate-pass.service.ts` (`GATE_OUT`)
  - No audit logs are created for: PO approvals, GRN verification, Stock manual adjustments, Job Card completions, Box sealing, or Master data changes.
- **Status**: **C (Functional Shell - High Coverage Gap)**

---

### Module P: Database & Data Integrity
- **Foreign Keys**: Properly defined with referential integrity.
- **Cascades**: Line items (`PurchaseOrderItem`, `GRNItem`, `InvoiceItem`, `BoxItem`) cascade delete with parent headers. Parent masters (`Part`, `Customer`, `Supplier`, `Store`) are protected with `Restrict` / `NoAction`.
- **Prisma Schema Bug / Hazard**:
  - `Stock` model has `@@unique([partId, storeId, locationId])`.
  - In PostgreSQL, if `locationId` is `NULL`, standard composite unique index does not prevent duplicate rows with the same `(partId, storeId, NULL)` unless `NULLS NOT DISTINCT` (PostgreSQL 15+) is explicitly configured.
- **Status**: **B (Solid Relations, Composite Nullable Index Risk)**

---

### Module Q: API Completeness
- 17 Controllers, 108 API endpoints.
- Global `ValidationPipe` active.
- `JwtAuthGuard` and `PermissionsGuard` active on all business endpoints.
- Status: **A (API Architecture Complete)**

---

### Module R: Frontend Completeness
- 16 Pages under `frontend/src/pages/`.
- Protected routes enforce role and permission checks.
- Loading states, error alerts, and modal dialogs present.
- Status: **A- (Frontend Architecture Complete, Some Module Disconnects in Packing)**

---

## 4. Requirement Traceability Matrix

| Req ID | Requirement Description | DB | API | Backend Logic | UI | RBAC | Workflow | Status | Evidence / Gap |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **FR-01** | User Auth, JWT, Password Hashing, User Mgmt | Yes | Yes | Yes | Yes | Yes | Complete | **A** | `auth.service.ts`, `users.service.ts`, bcrypt hashing, JWT access/refresh |
| **FR-02** | Role-Specific Interactive Dashboards | Yes | Yes | Yes | Yes | Yes | Complete | **A** | `dashboard.service.ts`, live DB aggregations |
| **FR-03** | Master Data Management | Yes | Yes | Yes | Yes | Yes | Complete | **A** | `masters.service.ts`, full CRUD, opening stock ledgered |
| **FR-04** | Purchase Orders Lifecycle & Approvals | Yes | Yes | Yes | Yes | Yes | Partial | **B** | `purchase-orders.service.ts`; Initial status hardcoded to `SUBMITTED` |
| **FR-05** | Material Inwarding & GRN with Quality Fields | Yes | Yes | Yes | Yes | Yes | Defect | **E** | `grn.service.ts`; 100% rejected GRN marks PO as `PARTIAL` |
| **FR-06** | Inventory Management & Auditable Stock Ledger | Yes | Yes | Yes | Yes | Yes | Complete | **A** | `inventory.service.ts`; All stock mutation paths produce `StockMovement` |
| **FR-07** | Bill of Materials (BOM) & Routing Operations | Yes | Yes | Yes | Yes | Yes | Complete | **A** | `bom.service.ts`, multi-level items, routing links |
| **FR-08** | Production Planning & Scheduling | Yes | Yes | Yes | Yes | Yes | Complete | **A** | `production.service.ts`, plan tracking and scheduling |
| **FR-09** | Job Cards Execution & Tracking | Yes | Yes | Yes | Yes | Yes | Complete | **A** | `job-cards.service.ts`, target caps, no repeat completion |
| **FR-10** | Material Issue & Return Against Job Cards | Yes | Yes | Yes | Yes | Yes | Complete | **A** | `material-issues.service.ts`, raw material stock deduction and return |
| **FR-11** | Packing & Box Management | Yes | Yes | Yes | Partial | Yes | Disconnect | **C** | `packing.service.ts`; Frontend does not link Box to `PackingOrder`/`SalesOrder` |
| **FR-12** | Barcode Generation & Scanning | Yes | Yes | Yes | Yes | Yes | Partial | **B** | `barcodes.service.ts`; Box serialized, Part catalog only |
| **FR-13** | Invoices & Billing linked to Sales Order | Yes | Yes | Yes | Yes | Yes | Complete | **A** | `invoices.service.ts`; SO validation, cumulative qty limits |
| **FR-14** | Dispatch Manifest & Gate-Out Execution | Yes | Yes | Yes | Yes | Yes | Partial | **B** | `dispatch.service.ts`; Concurrency safe, but no box-to-invoice item validation |
| **FR-15** | Document Management & Versioning | Yes | Yes | Mock | Partial | Yes | Incomplete | **C** | `documents.service.ts`; No physical file upload or download streaming |
| **FR-16** | Comprehensive Reports & Excel Exports | Yes | Yes | Yes | Yes | Yes | Complete | **A** | `reports.service.ts`, ExcelJS generation |
| **FR-17** | Immutable Audit Logging | Yes | Yes | Partial | Yes | Yes | Incomplete | **C** | `audit.service.ts`; Only 3 business events write to `AuditLog` |
| **FR-18** | Notification & Alert System | Yes | Yes | Yes | Yes | Yes | Complete | **A** | `notifications.service.ts`, low stock and approval notifications |

---

## 5. Critical Business Rule Matrix

| Rule ID | Business Rule | Status | File | Method / Location | Risk |
|---|---|:---:|---|---|:---:|
| **RULE-01** | Invoice payment must not deduct physical stock | **COMPLIANT** | `invoices.service.ts` | `markPaid()` | NONE |
| **RULE-02** | Physical dispatch must deduct only Finished Goods stock | **COMPLIANT** | `dispatch.service.ts` | `gateOut()` (line 211) | NONE |
| **RULE-03** | Gate-Out must happen only once | **COMPLIANT** | `dispatch.service.ts` | `gateOut()` status check | NONE |
| **RULE-04** | Gate-Out must be transaction-safe & concurrency-safe | **COMPLIANT** | `dispatch.service.ts` | `gateOut()` atomic `updateMany` | NONE |
| **RULE-05** | Packing must not create physical stock movement | **COMPLIANT** | `packing.service.ts` | `addItemToBox()` | NONE |
| **RULE-06** | Packing quantity must not exceed available FG stock | **COMPLIANT** | `packing.service.ts` | `addItemToBox()` validation | NONE |
| **RULE-07** | GRN received quantity must not exceed PO remaining quantity | **COMPLIANT** | `grn.service.ts` | `createGRN()` validation | NONE |
| **RULE-08** | Rejected GRN quantity must require rejection reason | **COMPLIANT** | `grn.service.ts` | `verifyGRN()` validation | NONE |
| **RULE-09** | Rejected GRN quantity must not enter accepted stock | **COMPLIANT** | `grn.service.ts` | `verifyGRN()` stock upsert | NONE |
| **RULE-10** | Production output must not exceed target | **COMPLIANT** | `job-cards.service.ts` | `complete()` validation | NONE |
| **RULE-11** | Completed Job Card cannot be completed again | **COMPLIANT** | `job-cards.service.ts` | `complete()` validation | NONE |
| **RULE-12** | Sales Order must follow `DRAFT` → `SUBMITTED` → `APPROVED` | **COMPLIANT** | `sales-orders.service.ts` | `submit()`, `approve()` | NONE |
| **RULE-13** | Invoice linked to Sales Order must use an `APPROVED` SO | **COMPLIANT** | `invoices.service.ts` | `create()` validation | NONE |
| **RULE-14** | Cumulative invoice quantity must not exceed SO quantity | **COMPLIANT** | `invoices.service.ts` | `create()` cumulative sum check | NONE |
| **RULE-15** | Unauthorized roles must not perform restricted actions | **COMPLIANT** | Controllers | `@UseGuards(PermissionsGuard)` | NONE |
| **RULE-16** | Every physical stock mutation must be ledgered | **COMPLIANT** | All Services | `StockMovement` in every tx | NONE |
| **RULE-17** | Closed/sealed/dispatched boxes must not be modified | **COMPLIANT** | `packing.service.ts` | `addItemToBox()` status check | NONE |
| **RULE-18** | Unknown/invalid barcodes must be rejected | **COMPLIANT** | `barcodes.service.ts` | `validateBarcode()` | NONE |
| **RULE-19** | Duplicate box/dispatch barcode scans must be rejected | **COMPLIANT** | `dispatch.service.ts` | `verifyBox()` set check | NONE |
| **RULE-20** | Serialized physical units must be uniquely trackable | **NON-COMPLIANT** | `schema.prisma` | Unit-level serialization absent | MEDIUM |

---

## 6. Buy-Side Workflow Audit

```
Supplier Master ──> Purchase Order ──> Approval ──> GRN ──> Quality Verification ──> Accepted Stock (Stores)
                                                                       └──> Rejected Stock (Isolated)
```

1. **PO Creation & Approval**:
   - `purchase-orders.service.ts`: Working, but automatically sets status to `SUBMITTED` on creation.
   - Approval by `po.approve` permission (Admin, Management) correctly moves PO to `APPROVED`.
2. **GRN Material Inwarding**:
   - `grn.service.ts`: Correctly links to PO, enforces quantity ceilings (`receivedQty <= poRemainingQty`).
3. **Quality Verification**:
   - When verified, only `acceptedQty` increments `Stock`. `rejectedQty` does not enter stock.
4. **Identified Flaw**:
   - If `acceptedQty === 0` (entire inward lot rejected), PO status is updated to `PARTIAL`.
   - **Fix Required**: PO status should only transition to `PARTIAL` or `COMPLETED` based on cumulative *accepted* quantity.

---

## 7. Manufacturing Workflow Audit

```
Raw Material Stock ──> Material Issue ──> Production (Job Card) ──> Completion ──> FG Stock Receipt
                              │                                         │
                              └── Material Return                       └── Rejected Qty (Scrap)
```

1. **BOM & Planning**:
   - Multi-level BOM items and operations properly map inputs to outputs.
2. **Material Issue**:
   - `material-issues.service.ts`: Decrements raw material stock from specified stores and creates `PROD_ISSUE` ledger entries.
   - Return of unconsumed material correctly increments stock with `PROD_RETURN`.
3. **Job Card Execution**:
   - Job card completion caps output (`producedQty + rejectedQty <= targetQty`).
   - Duplicate completions are strictly rejected.
   - Finished goods stock is credited only with `producedQty` under `PROD_RECEIPT`.
- **Conclusion**: The manufacturing lifecycle is completely functional, strictly ledgered, and robust.

---

## 8. Sell-Side Workflow Audit

```
Customer Master ──> Sales Order ──> Approval ──> Packing Order ──> Box Packing ──> Invoice ──> Dispatch Manifest ──> Gate-Out ──> FG Stock Deduction
```

1. **Sales Order**:
   - Follows strict state machine (`DRAFT` → `SUBMITTED` → `APPROVED`).
2. **Packing Order & Box**:
   - **Disconnect**: Backend supports `PackingOrder` linked to `SalesOrder`, but frontend `PackingPage.tsx` does not consume `PackingOrder`. Users pack boxes without associating them with a sales order.
3. **Invoice**:
   - Validates that the linked Sales Order is `APPROVED`.
   - Validates cumulative billed quantities.
4. **Dispatch Manifest & Gate-Out**:
   - Manifest binds Invoice and sealed Boxes.
   - Gate-Out deducts Finished Goods stock with atomic concurrency protection and produces `DISPATCH` `StockMovement`.
   - **Disconnect**: Dispatch manifest creation does not verify that the parts inside the scanned boxes correspond to the invoice line items.

---

## 9. Barcode Architecture Audit

- **Catalog Barcode vs Physical Serial Barcode**:
  - `Box`: Uses unique physical serial barcodes (`Box.barcode` is unique, generated per box container).
  - `Part`: Uses catalog identifier barcodes (`entityType = 'PART'`). Scanning a part barcode identifies the catalog part, not an individual serialized physical item.
- **Physical Unit Tracking**:
  - The ERP currently tracks discrete inventory by `(partId, storeId, locationId, batchNo)` quantity sums. Individual items do not possess unique serial numbers.
  - **Verdict**: Compliant with standard batch-based manufacturing; incomplete if the enterprise demands serialized per-unit traceability (e.g., aerospace/medical device serialization).

---

## 10. Inventory Ledger Audit

### Stock Mutation Inventory:

| Mutation Path | Source File | Required Permission | Ledger Type | Transactional | Risk |
|---|---|---|---|:---:|:---:|
| GRN Verification | `grn.service.ts` | `grn.verify` | `INWARD_GRN` | Yes (`$transaction`) | None |
| Material Issue | `material-issues.service.ts` | `inventory.issue` | `PROD_ISSUE` | Yes (`$transaction`) | None |
| Material Return | `material-issues.service.ts` | `inventory.return` | `PROD_RETURN` | Yes (`$transaction`) | None |
| Production Completion | `job-cards.service.ts` | `production.manage` | `PROD_RECEIPT` | Yes (`$transaction`) | None |
| Stock Adjustment | `inventory.service.ts` | `inventory.adjust` | `ADJUSTMENT_ADD / SUB` | Yes (`$transaction`) | None |
| Stock Transfer | `inventory.service.ts` | `inventory.manage` | `TRANSFER_OUT / IN` | Yes (`$transaction`) | None |
| Opening Stock Setup | `masters.service.ts` | `masters.create` | `ADJUSTMENT_ADD / SUB` | Yes (`$transaction`) | None |
| Gate-Out Execution | `dispatch.service.ts` | `dispatch.gate_out` | `DISPATCH` | Yes (`$transaction`) | None |

**Zero Unledgered Mutations Found**: Every single physical stock mutation path in the entire codebase is wrapped inside an atomic Prisma `$transaction` and writes an exact `StockMovement` entry.

---

## 11. RBAC Audit

### Role Capability Matrix:

| Feature / Action | Admin | Management | Purchase | Stores | Production | Quality | Packing | Billing | Dispatch |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| User Management | Full | View | None | None | None | None | None | None | None |
| Master Data CRUD | Full | View | View | View | View | View | View | View | View |
| PO Create / Edit | Full | None | Full | None | None | None | None | None | None |
| PO Approve | Full | Full | None | None | None | None | None | None | None |
| GRN Inward | Full | None | None | Full | None | None | None | None | None |
| GRN Quality Sign-off | Full | None | None | None | None | Full | None | None | None |
| Stock Adjust / Transfer | Full | None | None | Full | None | None | None | None | None |
| Production Plans & BOM | Full | View | None | None | Full | View | None | None | None |
| Material Issue / Return | Full | None | None | Full | Full | None | None | None | None |
| Box Packing & Sealing | Full | View | None | None | None | None | Full | None | None |
| Sales Order CRUD | Full | View | None | None | None | None | None | Full | None |
| Sales Order Approve | Full | Full | None | None | None | None | None | Full | None |
| Invoices & Billing | Full | Full | None | None | None | None | None | Full | None |
| Dispatch & Manifests | Full | View | None | None | None | None | None | None | Full |
| Gate-Out Authorization | Full | Full | None | None | None | None | None | None | Full |
| View Audit Logs | Full | Full | None | None | None | None | None | None | None |

---

## 12. API Audit

- Total Endpoints: 108
- Authentication: 100% of business endpoints protected by `JwtAuthGuard`.
- Authorization: Protected by `PermissionsGuard` and `@RequirePermissions(...)`.
- Validation: Global NestJS `ValidationPipe` with `whitelist: true` and `transform: true`.
- **Finding**: No open or unauthenticated backdoors exist. All state transitions have dedicated endpoints (e.g., `/approve`, `/submit`, `/close`, `/gate-out`).

---

## 13. Frontend Audit

- **Routing**: `App.tsx` configures routes wrapped in `<ProtectedRoute requiredPermissions={[...]} />`.
- **Unauthorized Direct Access**: Blocked. Redirection to `/dashboard` or `/login` with user feedback.
- **State Handling**: Forms include input validation, disabled buttons during pending submissions, and clear error banners.
- **Identified Frontend Disconnect**:
  - `PackingPage.tsx` lacks UI to load or complete a `PackingOrder`.

---

## 14. Database Integrity Audit

- **Foreign Keys**: Enforced on all relationships.
- **Orphan Prevention**: Line items cascade delete with parent headers (`onDelete: Cascade`).
- **Composite Unique Index Vulnerability**:
  - Table `Stock`: `@@unique([partId, storeId, locationId])`.
  - In PostgreSQL standard index handling, multiple rows with `locationId = NULL` do not violate uniqueness. A Prisma migration should ensure `locationId` is either made non-nullable (e.g. default 'DEFAULT') or uses `NULLS NOT DISTINCT`.

---

## 15. Audit Logging Audit

- **Entity**: `AuditLog`
- **Logged Events**:
  - `USER_LOGIN`
  - `INVOICE_PAYMENT`
  - `GATE_OUT`
- **Unlogged Critical Events**:
  - Purchase Order Approval / Rejection
  - GRN Verification
  - Stock Adjustment / Transfer
  - Job Card Completion
  - Box Sealing
  - Master Data Create / Update / Delete
  - User Creation / Role Changes
- **Impact**: High compliance gap for enterprise auditing.

---

## 16. Reports & Dashboard Audit

- **Dashboard**: `dashboard.service.ts` calculates live metrics (`totalInventoryValue`, `lowStockItemsCount`, `pendingPOs`, `activeJobCards`, `unpaidInvoices`).
- **Reports**: `reports.service.ts` generates genuine Excel sheets via `ExcelJS` with actual database records.
- **Verification**: Reports and dashboards use live database data, not static or placeholder values.

---

## 17. Security & Bypass Audit

- **Direct API Manipulation**: Bypassing UI does not bypass security; backend services independently enforce state machine rules and permission guards.
- **Mass Assignment**: Prevented by NestJS `whitelist: true`.
- **SQL Injection**: Prevented by Prisma parameterized queries.
- **XSS**: React automatically escapes rendered strings.

---

## 18. Performance & Scalability Observations

1. **Stock Query Aggregation** (Medium): Queries fetching stock join `Part`, `Store`, `Location`. Adequate for < 100,000 records; indexing on `[partId, storeId]` is present.
2. **Barcode Scan History** (Low): `BarcodeScanHistory` will grow rapidly in production. Needs partitioning or regular archiving strategy.
3. **Audit Log Table** (Low): Unpartitioned table; will require periodic indexing maintenance.

---

## 19. Migration & Deployment Readiness

- **Migrations State**: Baseline migration file exists at `backend/prisma/migrations/0_init/migration.sql`.
- **Environment**: Configuration managed via `.env`.
- **Build Status**:
  - Backend: Compiles cleanly with NestJS CLI (`npm run build`).
  - Frontend: Compiles cleanly with Vite (`npm run build`).
  - Tests: All 21 regression test suites pass cleanly.

---

## 20. Functional Shell / Incomplete Modules

1. **Quality Module**: Embedded within GRN and JobCard only. Missing independent inspection entity, checklist, and inspection approvals.
2. **Document Management**: Metadata-only shell without physical binary upload or streaming download.
3. **Audit Logging**: Complete table and UI, but missing event triggers across 90% of business operations.
4. **Packing Orders**: Exists in backend database and service, but omitted from frontend packing workflow.

---

## 21. Confirmed Missing Features

1. Dedicated Quality Module (`QualityInspection` entity, controller, service, and frontend screen).
2. Physical file storage adapter (local disk / S3) and Multer file upload interceptor for Document Management.
3. Serialized physical unit tracking (if discrete unit-level traceability is required).
4. Automated box-item to invoice-item reconciliation during dispatch manifest creation.

---

## 22. Confirmed Defects

1. **PO Status Sync on 100% GRN Rejection**:
   - File: `backend/src/grn/grn.service.ts`
   - Location: `verifyGRN()` line 167
   - Defect: When all items on a GRN are rejected (`acceptedQty = 0`), the PO status is changed to `PARTIAL`.
   - Expected: PO status should remain `APPROVED` since no accepted material was received.
2. **Purchase Order Creation Initial Status**:
   - File: `backend/src/purchase-orders/purchase-orders.service.ts`
   - Defect: Initial status is hardcoded to `SUBMITTED`, bypassing the draft stage.

---

## 23. Partial Implementations

1. **Barcode System**: Box barcodes are serialized and unique; Part barcodes are catalog level only.
2. **Packing**: Boxes are packed and sealed, but disconnected from `PackingOrder` in the UI.
3. **Dispatch Manifest**: Boxes and invoices are linked, but item contents are not cross-validated.

---

## 24. Technical Debt

1. **Audit Interceptor Missing**: Rather than manually calling `auditLog.create` in isolated service methods, an asynchronous NestJS Audit Interceptor or Prisma Middleware should record mutations globally.
2. **Nullable Location in Stock Unique Index**: PostgreSQL allows duplicate `(partId, storeId, NULL)` entries unless constrained with `NULLS NOT DISTINCT`.
3. **Document File Streaming**: Needs integration with Node `fs` stream or cloud object store.

---

## 25. Risk Classification

- **CRITICAL**: None. (Core inventory ledger, Gate-Out deduction, and RBAC guards are solid and transaction-safe).
- **HIGH**:
  - Missing standalone Quality module if external compliance (ISO 9001 / IATF 16949) is required.
  - Audit logging coverage gap for regulatory traceability.
- **MEDIUM**:
  - PO status defect on 100% rejected GRN.
  - Packing Order UI disconnect.
  - Dispatch manifest item matching.
- **LOW**:
  - Document management binary upload.

---

## 26. Recommended Phase 3 Implementation Order

1. **Phase 3.2: Defect Remediation & Audit Coverage**:
   - Fix PO status transition in `grn.service.ts` for rejected quantities.
   - Implement universal Audit Logging interceptor across all state changes (PO, GRN, Stock, Job Card, Box, Sales Order).
2. **Phase 3.3: Packing Order & Dispatch Manifest Workflow Alignment**:
   - Integrate `PackingOrder` into `frontend/src/pages/PackingPage.tsx`.
   - Add item matching validation in `dispatch.service.ts` between box contents and invoice line items.
3. **Phase 3.4: Quality Module Implementation**:
   - Create `QualityInspection` entity and workflow for inward and production quality control.
4. **Phase 3.5: Document Storage & Upload**:
   - Implement multipart file upload and streaming download.

---

## PHASE 3.1 DECISION

### **C. REQUIRES PHASE 3 IMPLEMENTATION**

### 1. What is already solid
- Complete, transaction-safe inventory ledger with zero unledgered mutation paths.
- Concurrency-safe, atomic Gate-Out deducting strictly from `FINISHED_GOODS` stores.
- Strict Sales Order approval lifecycle (`DRAFT` → `SUBMITTED` → `APPROVED`).
- Invoices strictly linked to approved Sales Orders with cumulative quantity enforcement.
- Fine-grained RBAC with global JWT and Permissions guards across 108 API endpoints.
- Real-time reporting and interactive role-based dashboards with live Excel exports.

### 2. What is incomplete
- Quality inspection as an independent operational module.
- Audit logging coverage across core operational actions.
- Packing Order integration in the frontend UI.
- Document binary file upload and streaming.
- Box-to-invoice line item reconciliation in dispatch manifests.

### 3. What must be implemented next
- Remediation of the PO status sync defect on rejected GRNs.
- Universal audit logging for PO, GRN, Production, and Stock actions.
- Frontend integration of `PackingOrder` with `Box` packing.
- Manifest item validation before Gate-Out.

### 4. What should NOT be changed
- The canonical Gate-Out stock deduction logic (`dispatch.service.ts`, `gate-pass.service.ts`).
- The StockMovement ledgering architecture.
- The Sales Order status transition machine.
- The core RBAC permissions structure.

### 5. Recommended Phase 3.2 implementation scope
- Targeted remediation of the PO status sync bug in `grn.service.ts`.
- Implementation of universal audit logging on all critical business mutations.
- Alignment of the frontend `PackingPage.tsx` with `PackingOrder`.
- Validation of box contents against invoice items in `dispatch.service.ts`.

---

## SAFETY CHECK

- **FILES MODIFIED**: None (0 files modified)
- **FILES CREATED**: 1 file (`PHASE_3.1_FUNCTIONAL_GAP_AUDIT.md`)
- **FILES DELETED**: None (0 files deleted)
- **DATABASE CHANGES**: None (0 schema or data changes)
- **TESTS EXECUTED**: All 21 regression tests passed
- **BUILD STATUS**: Backend and Frontend builds fully passing

**END PHASE 3.1.**
