# Manufacturing ERP 2.0 — System Architecture

## 1. High-Level Architectural Pattern
Manufacturing ERP 2.0 is built as an enterprise-grade, modular monolithic application with decoupled frontend and backend layers, communicating over a strictly versioned REST API (`/api/v1`).

```
 +-----------------------------------------------------------------------+
 |                     React 18 + TypeScript Frontend                    |
 | (Vite, React Router v6, TanStack Query, TailwindCSS, Lucide Icons)     |
 +-----------------------------------+-----------------------------------+
                                     |
                                REST API (JSON)
                                     |
 +-----------------------------------v-----------------------------------+
 |                        NestJS Modular Backend                         |
 |  [AuthGuard] -> [PermissionsGuard] -> [ValidationPipe] -> [Controllers]|
 |  [Interceptors: Logging, Transform] -> [ExceptionFilters]             |
 |                                                                       |
 |  Modules:                                                             |
 |  - Auth & RBAC (Roles & Permissions)                                  |
 |  - Master Data (Customers, Suppliers, Parts, Units, Stores, Taxes)   |
 |  - Purchase Orders & Supplier Management                              |
 |  - Goods Received Note (GRN) & Inwarding Quality Checks              |
 |  - Inventory Ledger & Real-Time Stock Management                     |
 |  - BOM, Routing, Production Planning, Job Cards                       |
 |  - Material Issue & Return Transactions                              |
 |  - Packing & Box Management                                           |
 |  - Barcode & QR Code Engine (Code 128, QR Code, Verification)         |
 |  - Billing & Invoicing (Tax Calculation, Status Transitions)          |
 |  - Dispatch & Gate-Out Verification                                   |
 |  - Reporting Engine (ExcelJS Spreadsheet & PDFKit Generation)        |
 |  - Document Management & Private Storage Engine                       |
 |  - Audit Logging & System Event Bus                                   |
 +-----------------------------------+-----------------------------------+
                                     |
                          Prisma ORM (Data Layer)
                                     |
 +-----------------------------------v-----------------------------------+
 |                       PostgreSQL 15+ Database                         |
 | - ACID Transactions for all stock and financial entries               |
 | - Enums, Foreign Keys with Cascade/Restrict policies                 |
 | - Composite Indexes for barcode search, order status, date filters    |
 +-----------------------------------------------------------------------+
```

## 2. Core Architectural Principles
1. **Single Source of Truth for Stock**: Stock is never updated directly by loose arithmetic. Every stock modification is driven by an immutable `StockMovement` ledger entry within an atomic database transaction.
2. **Deterministic Barcode Verification**: Every box, shipment, and traceable part has a cryptographically or sequentially unique barcode/QR code. Box closure and dispatch require mandatory scanner verification to prevent duplicate packaging or wrongful dispatch.
3. **Role-Based Access Control (RBAC)**: All sensitive routes require active JWT validation and server-side permission checks via `@RequirePermissions(...)` decorators.
4. **Resilient Offline/Standalone Development**: Local development supports PostgreSQL natively, containerized environments, or embedded high-performance SQL test runners without requiring external internet connections.
5. **Auditing & Traceability**: All critical entity updates (PO approvals, GRN postings, box closures, invoice generations, and dispatches) write an immutable entry to `AuditLog`.
