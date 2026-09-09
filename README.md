# Manufacturing ERP 2.0 — Enterprise Execution & Operations Manual

## 1. Overview
Manufacturing ERP 2.0 is an enterprise manufacturing resource planning, inventory control, and barcode management system engineered for high-traceability factory floors.

Built from scratch based on the Product Requirements Document (PRD), it connects the entire 7-stage manufacturing lifecycle:
```
Purchase Order  -->  Inwarding / GRN  -->  Stock Ledger  -->  Production / Job Cards  -->  Packing & Boxes  -->  Invoices  -->  Dispatch & Gate-Out
```

---

## 2. Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query (v5), Lucide Icons, Axios, React Router (v6).
- **Backend**: NestJS (v10), TypeScript, Prisma ORM (v5), Passport JWT, Bcrypt, Class-Validator, Swagger OpenAPI.
- **Barcode & QR**: `bwip-js` (Code 128 high-density barcodes) and `qrcode` (2D matrix generation and camera scanning).
- **Reporting & Exports**: `ExcelJS` (data sheets) and `PDFKit` (dispatch challans, gate passes, invoices).
- **Database**: PostgreSQL / SQLite (via Prisma schema abstraction).

---

## 3. Directory Structure
```
ERP_Barcode_System/
├── README.md
├── package.json
├── docker-compose.yml
├── .env.example
├── docs/
│   ├── requirements-checklist.md
│   ├── architecture.md
│   ├── assumptions.md
│   ├── open-questions.md
│   ├── database-design.md
│   ├── api-design.md
│   ├── barcode-design.md
│   ├── security-design.md
│   └── testing-strategy.md
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   ├── auth/
│   │   ├── users/
│   │   ├── masters/
│   │   ├── purchase-orders/
│   │   ├── grn/
│   │   ├── inventory/
│   │   ├── production/
│   │   ├── barcodes/
│   │   ├── packing/
│   │   ├── invoices/
│   │   ├── dispatch/
│   │   ├── dashboard/
│   │   ├── reports/
│   │   └── audit/
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   └── types/
```

---

## 4. Default Seed Users & Credentials

All seeded user accounts share the universal development password: **`Admin@12345`**

| Role | Email | Access Scope |
|---|---|---|
| **Administrator** | `admin@erp.local` | Full system control, users, settings, and audit logs |
| **Management** | `mgmt@erp.local` | Executive KPI dashboards, approvals, reports |
| **Purchase User** | `purchase@erp.local` | Supplier master, Purchase Order creation |
| **Stores User** | `stores@erp.local` | Material inwarding (GRN), stock ledger, warehouse transfers |
| **Production User** | `production@erp.local` | BOM recipes, production plans, Job Cards execution |
| **Quality User** | `quality@erp.local` | GRN quality inspection and sign-off |
| **Packing User** | `packing@erp.local` | Box packing, Code 128 barcode generation, box sealing |
| **Billing User** | `billing@erp.local` | Commercial tax invoices & GST calculations |
| **Dispatch User** | `dispatch@erp.local` | Shipment manifests, box scanning verification, gate exit |

---

## 5. Development & Startup Instructions

### 1. Backend Setup
```bash
cd backend
npm install
npx prisma db push
npm run seed
npm run start:dev
```
Backend will listen at `http://localhost:4000` with Swagger docs at `http://localhost:4000/api/docs`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend will be accessible at `http://localhost:5173`.

### 3. Running Unit Tests
```bash
cd backend
npm test
```

### 4. Running via Docker
```bash
docker-compose up --build -d
```
