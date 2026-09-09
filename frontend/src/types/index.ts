export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  permissions: string[];
}

export interface Part {
  id: string;
  code: string;
  name: string;
  partType: 'RAW_MATERIAL' | 'WORK_IN_PROGRESS' | 'FINISHED_GOOD';
  unit: { id: string; name: string; symbol: string };
  minStockLevel: number;
  standardCost: number;
  barcodeValue?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: { id: string; name: string; code: string };
  orderDate: string;
  deliveryDate?: string;
  status: string;
  totalAmount: number;
  taxAmount: number;
  grandTotal: number;
  items: Array<{
    id: string;
    part: Part;
    orderedQty: number;
    receivedQty: number;
    unitPrice: number;
    taxRate: number;
    lineTotal: number;
  }>;
}

export interface Box {
  id: string;
  boxNumber: string;
  barcode: string;
  qrCode?: string;
  status: 'OPEN' | 'VERIFIED' | 'SEALED' | 'INVOICED' | 'DISPATCHED';
  netWeight?: number;
  grossWeight?: number;
  items: Array<{
    id: string;
    part: Part;
    quantity: number;
    batchNumber?: string;
  }>;
  sealedAt?: string;
}
