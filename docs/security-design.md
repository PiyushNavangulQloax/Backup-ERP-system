# Security Design & RBAC Policy

## 1. Authentication Layer
- **Token Strategy**: Dual-token architecture using JSON Web Tokens (JWT).
  - Short-lived Access Token (15–60 minutes validity).
  - Rotatable Refresh Token stored with cryptographic hash in the database.
- **Password Security**: Passwords hashed using `bcrypt` with salt rounds = 10.
- **Session Security**: Immediate invalidation on logout; password update revokes all existing refresh tokens.

## 2. Role-Based Access Control (RBAC) Matrix

| Module / Resource | Administrator | Management | Purchase User | Stores User | Production User | Quality User | Packing User | Billing User | Dispatch User |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Users & Roles** | Full | View | - | - | - | - | - | - | - |
| **Master Data** | Full | View | Edit Selected | Edit Selected | Edit Selected | View | View | View | View |
| **Purchase Orders** | Full | View / Approve | Create / Edit | View | View | View | View | View | View |
| **Inwarding / GRN** | Full | View / Approve | View | Create / Inspect | View | Verify / Reject | View | View | View |
| **Inventory / Stock** | Full | View | View | Manage / Adjust | Issue / Return | View | View | View | View |
| **Production & BOM** | Full | View | View | View | Manage / Track | View | View | View | View |
| **Packing & Boxes** | Full | View | View | View | View | View | Manage / Pack | View | View |
| **Barcodes** | Full | View | View | Scan | Scan | Scan | Generate / Scan | View | Scan / Verify |
| **Billing & Invoices**| Full | View / Approve | View | View | View | View | View | Manage / Issue | View |
| **Dispatch** | Full | View / Approve | View | View | View | View | View | View | Manage / Gate-Out|
| **Reports & Export** | Full | Full | Filtered | Filtered | Filtered | Filtered | Filtered | Filtered | Filtered |
| **Audit Logs** | Full | View | - | - | - | - | - | - | - |

## 3. Defense-in-Depth Measures
1. **Input Sanitization & DTO Validation**: Strict class-validator and Zod schemas stripping unexpected properties (`whitelist: true`, `forbidNonWhitelisted: true`).
2. **CORS & Headers**: Helmet integration for Content Security Policy, X-Frame-Options (`DENY`), X-Content-Type-Options (`nosniff`).
3. **File Upload Security**: Strict MIME-type inspection (PNG, JPEG, PDF, Excel), file size cap (10MB), and private directory storage preventing direct execution.
4. **SQL Injection Resistance**: 100% parameterization via Prisma ORM query engine.
