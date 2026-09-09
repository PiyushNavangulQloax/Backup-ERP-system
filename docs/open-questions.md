# Open Questions & Resolution Strategy

Based on Section 24 of the PRD, the following business items require stakeholder clarity in live production rollouts. The application includes robust default conventions so operations run smoothly immediately.

| # | Question from PRD | Working System Implementation Default | Production Recommendation |
|---|---|---|---|
| 1 | Which SQL dump is latest? | Clean normalized PostgreSQL schema built from scratch with seed data. | Run data migration script from legacy database export when provided. |
| 2 | What are exact user roles? | 9 core roles: Administrator, Management, Purchase User, Stores User, Production User, Quality User, Packing User, Billing User, Dispatch User. | Fine-tune granular permission flags in Settings -> Roles. |
| 3 | Modules actively used vs obsolete? | All 14 PRD modules implemented with clean navigation and full functional pipelines. | Modular feature toggles can disable unused sub-modules. |
| 4 | Exact approval rules for PO & GRN? | Multi-tier: POs above draft require approval; GRN requires quality sign-off before stock posting. | Configurable approval limits per user role. |
| 5 | Can received qty exceed ordered qty? | Configurable tolerance default at 10% maximum overage. | Flag warnings in UI with supervisor override. |
| 6 | Can stock become negative? | Strictly prohibited by default; atomic transactions enforce non-negative balances. | Explicit toggle in store settings if negative inventory is allowed. |
| 7 | Barcode label print format? | High-density Code 128 & QR labels formatted for 4x2 inch and 4x6 inch thermal printers, plus standard A4 PDF sheets. | Add custom ZPL/EPL raw thermal printer output if requested. |
| 8 | Are barcodes on parts, boxes, or dispatches? | Unique codes generated for Parts, Batches, Boxes, and Dispatch Manifests. | Integrated barcode scanner supports auto-detection of record type. |
| 9 | Official invoice and tax rules? | Item-level HSN/SAC, GST (CGST + SGST or IGST) rates with dynamic calculation and rounding. | Multi-tier tax rule configuration in Tax Masters. |
| 10 | Mandatory reports? | Stock Ledger, PO Status, GRN Quality Log, Production Efficiency, Dispatch Manifest, Audit Trail. | Custom scheduled email report exports. |
