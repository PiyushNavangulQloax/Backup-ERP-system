# API Design: Manufacturing ERP 2.0

## 1. Conventions & Standards
- All endpoints are strictly prefixed with `/api/v1`.
- Standard HTTP status codes: `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `500 Internal Error`.
- Uniform JSON Envelope response structure:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "timestamp": "2026-09-09T10:00:00.000Z"
}
```

## 2. API Endpoints Map

### Authentication & Users (`/api/v1/auth`, `/api/v1/users`)
- `POST /api/v1/auth/login` -> Authenticate user with email + password, returns JWT tokens + user profile
- `POST /api/v1/auth/refresh` -> Exchange refresh token for fresh access token
- `POST /api/v1/auth/logout` -> Invalidate user refresh token
- `GET /api/v1/auth/me` -> Fetch currently logged-in user profile and permissions
- `POST /api/v1/auth/change-password` -> Update password
- `GET /api/v1/users` -> List users with pagination and search
- `POST /api/v1/users` -> Create new user with role assignment
- `PUT /api/v1/users/:id` -> Update user details / active status
- `GET /api/v1/roles` -> List roles and associated permissions
- `PUT /api/v1/roles/:id/permissions` -> Update role permission matrix

### Master Data (`/api/v1/masters`)
- `GET/POST /api/v1/customers`
- `GET/PUT/DELETE /api/v1/customers/:id`
- `GET/POST /api/v1/suppliers`
- `GET/PUT/DELETE /api/v1/suppliers/:id`
- `GET/POST /api/v1/parts`
- `GET/PUT/DELETE /api/v1/parts/:id`
- `GET/POST /api/v1/stores`
- `GET/PUT/DELETE /api/v1/stores/:id`
- `GET/POST /api/v1/units`
- `GET/POST /api/v1/taxes`
- `GET/POST /api/v1/transporters`

### Purchase Orders (`/api/v1/purchase-orders`)
- `GET /api/v1/purchase-orders` -> List POs with status/supplier filters and pagination
- `POST /api/v1/purchase-orders` -> Create new PO with multi-item lines
- `GET /api/v1/purchase-orders/:id` -> Detailed PO with line items and GRN receipt history
- `PUT /api/v1/purchase-orders/:id` -> Edit PO (allowed only in draft state)
- `POST /api/v1/purchase-orders/:id/approve` -> Approve PO
- `POST /api/v1/purchase-orders/:id/reject` -> Reject PO with reason
- `GET /api/v1/purchase-orders/:id/pdf` -> Generate printable PDF purchase order

### Goods Received Note (`/api/v1/grns`)
- `GET /api/v1/grns` -> List GRNs with PO and status filters
- `POST /api/v1/grns` -> Create GRN from PO, recording accepted/rejected/damaged counts
- `GET /api/v1/grns/:id` -> Detailed GRN
- `POST /api/v1/grns/:id/verify` -> Quality sign-off; automatically posts to Stock and StockMovement
- `GET /api/v1/grns/:id/pdf` -> Download GRN receipt PDF

### Inventory (`/api/v1/inventory`)
- `GET /api/v1/inventory` -> Current stock by Part, Store, and Location
- `GET /api/v1/inventory/ledger` -> Complete immutable stock movement transaction log
- `POST /api/v1/inventory/adjust` -> Stock adjustment (requires authorization & reason)
- `POST /api/v1/inventory/transfer` -> Transfer inventory between stores/locations

### BOM & Production (`/api/v1/bom`, `/api/v1/production`, `/api/v1/job-cards`)
- `GET/POST /api/v1/bom` -> Create and list Bill of Materials
- `GET /api/v1/bom/:id` -> Fetch BOM components with scrap factors
- `GET/POST /api/v1/operations` -> Operation routing master
- `GET/POST /api/v1/production/plans` -> Production planning orders
- `GET/POST /api/v1/job-cards` -> Release job card with target quantity
- `POST /api/v1/job-cards/:id/progress` -> Record progress, scrap, and completion
- `POST /api/v1/material-issues` -> Issue raw materials to a Job Card
- `POST /api/v1/material-returns` -> Return unconsumed materials to stores

### Packing & Box Management (`/api/v1/packing`)
- `GET /api/v1/packing/boxes` -> List boxes with status filters
- `POST /api/v1/packing/boxes` -> Initialize new box (generates unique code & label)
- `POST /api/v1/packing/boxes/:id/items` -> Pack items into box (manual or scanner input)
- `POST /api/v1/packing/boxes/:id/close` -> Validate quantities and seal box
- `POST /api/v1/packing/boxes/:id/reopen` -> Supervisor override to reopen sealed box

### Barcode & QR Code Engine (`/api/v1/barcodes`, `/api/v1/qr-codes`)
- `POST /api/v1/barcodes/generate` -> Generate Code128 / QR code image or SVG
- `POST /api/v1/barcodes/validate` -> Check code validity and target entity state
- `GET /api/v1/barcodes/:code` -> Direct lookup of associated entity (Part, Box, Dispatch)
- `POST /api/v1/barcodes/scan` -> Record scan event with audit metadata and execute business action
- `POST /api/v1/barcodes/print` -> Return printable label template / PDF stream
- `GET /api/v1/barcodes/:code/history` -> Chronological scan history
- `POST /api/v1/qr-codes/generate` -> Generate QR code matrix

### Invoices & Billing (`/api/v1/invoices`)
- `GET /api/v1/invoices` -> List invoices
- `POST /api/v1/invoices` -> Create invoice linked to customer and packed boxes
- `GET /api/v1/invoices/:id` -> Detailed invoice
- `POST /api/v1/invoices/:id/approve` -> Finalize invoice
- `GET /api/v1/invoices/:id/pdf` -> Download tax invoice PDF

### Dispatch & Gate-Out (`/api/v1/dispatches`)
- `GET /api/v1/dispatches` -> List dispatches
- `POST /api/v1/dispatches` -> Create dispatch manifest against invoice and boxes
- `POST /api/v1/dispatches/:id/verify-box` -> Scan and verify box barcode onto manifest
- `POST /api/v1/dispatches/:id/gate-out` -> Finalize gate-out, deduct FG inventory, seal shipment
- `GET /api/v1/dispatches/:id/pdf` -> Delivery challan & gate pass PDF

### Documents, Reports, Dashboard & Audit
- `POST /api/v1/documents/upload` -> Multipart file upload
- `GET /api/v1/documents/:id/download` -> Stream file with permission checks
- `GET /api/v1/reports/stock/export-excel` -> Stream formatted Excel workbook
- `GET /api/v1/reports/production/export-excel`
- `GET /api/v1/reports/dispatch/export-excel`
- `GET /api/v1/dashboard/metrics` -> Real-time counts, pipeline stats, stock alerts
- `GET /api/v1/audit-logs` -> Filterable audit events
