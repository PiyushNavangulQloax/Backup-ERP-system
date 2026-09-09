# Barcode & QR Code Subsystem Design

## 1. Objectives & Symbologies
The barcode subsystem is designed for industrial manufacturing environments supporting:
- **Code 128 (1D Barcode)**: Fast scanning on handheld laser/CCD barcode guns and packaging labels.
- **QR Code (2D Matrix)**: High-density payload containing serialized part number, box ID, timestamp, and verification hash.
- **Hardware Integration**: Full compatibility with USB HID keyboard wedge barcode guns, wireless Bluetooth scanners, and HTML5 camera scanners.

## 2. Identification Schemes

| Entity Type | Prefix Format | Example Code | Symbology | Usage |
|---|---|---|---|---|
| **Part Master** | `PRT-XXXXXX` | `PRT-000102` | Code 128 | Bin labels, incoming item verification |
| **Material Batch** | `LOT-YYYYMMDD-XXXX` | `LOT-20260909-0012` | Code 128 & QR | Traceability of raw material inwards |
| **Packing Box** | `BOX-YYYYMMDD-XXXX` | `BOX-20260909-0042` | Code 128 & QR | Thermal outer carton labels |
| **Job Card** | `JOB-YYYYMMDD-XXXX` | `JOB-20260909-0005` | Code 128 | Shop floor traveler routing sheet |
| **Dispatch Gate Pass** | `DSP-YYYYMMDD-XXXX` | `DSP-20260909-0001` | QR Code | Security gate-out verification |

## 3. End-to-End Barcode Lifecycle
```
 [Part / Box Created]
         |
         v
 [Unique Code Generated (DB Uniqueness Enforced)]
         |
         v
 [Render Label (SVG / PNG / PDF via bwip-js / qrcode)]
         |
         v
 [Printed on Thermal Label (4x2" or 4x6")]
         |
         v
 [Handheld Scan Input (Keyboard Wedge / Camera)]
         |
         v
 [API: POST /api/v1/barcodes/scan]
         |
   +-----+-----+
   | Validate  |
   | - Exists? |
   | - Active? |
   | - Closed? |
   +-----+-----+
         |
   [True] [False] -> [Reject with Audio/Visual Error]
         |
         v
 [Execute Business Action (e.g. Add Item to Box / Verify Box on Truck)]
         |
         v
 [Record in BarcodeScanHistory (User, Timestamp, Device, Result)]
```

## 4. Duplicate & Invalid Scan Handling
1. **Double Scan Detection**: Prevents scanning the same piece into a box twice or scanning a box that is already marked `SEALED` or `DISPATCHED`.
2. **Audit Logging**: Every scan attempt (both valid and invalid) is permanently retained with client IP, scanner user, and timestamp.
