# Comprehensive Testing Strategy

## 1. Quality Assurance Tiers

### Tier 1: Unit Testing (Jest)
- Mathematical calculations: Tax computation, line-item totals, discount applications.
- Stock ledger integrity: Ensuring debit/credit movements balance perfectly.
- Barcode validation routines: Format checking, checksums, and parser regexes.
- Guards & Decorators: Role-based permissions matrix verification.

### Tier 2: API Integration Testing (Supertest / Jest)
- Complete HTTP cycle tests against actual endpoints.
- Authentication & JWT token issuance/rejection.
- Role-based authorization failures (`403 Forbidden` checks).
- Invalidation tests: Ensuring sealed boxes reject modification and dispatched items cannot be edited.

### Tier 3: End-to-End Workflow Verification
Verifies the complete 7-stage manufacturing lifecycle:
```
1. Authentication (Admin & Operators)
2. PO Creation & Approval
3. Material Inwarding (GRN) & Stock Increment
4. Production Plan & Job Card Issuance
5. Material Issue from Stores
6. Production Completion & Finished Goods Stock Entry
7. Packing & Box Barcode Scan Verification
8. Box Sealing
9. Invoice Generation
10. Dispatch Manifest Creation & Box Scan Verification
11. Gate-Out Finalization & Stock Decrement
12. Audit Log Verification
```

### Negative & Edge Case Test Scenarios
- Attempt to scan an unknown/unregistered barcode.
- Attempt to scan a box barcode onto an already dispatched manifest.
- Attempt to close a box with mismatched part quantities.
- Attempt to issue more raw material than currently available in stock.
- Attempt unauthorized status transitions without elevated roles.
