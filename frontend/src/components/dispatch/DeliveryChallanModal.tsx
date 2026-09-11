import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, downloadFile } from '../../services/api';
import {
  X,
  Printer,
  FileDown,
  Building,
  Truck,
  CheckCircle2,
  FileText,
  ShieldCheck,
  QrCode,
} from 'lucide-react';

interface DeliveryChallanModalProps {
  dispatchId: string;
  onClose: () => void;
}

export const DeliveryChallanModal: React.FC<DeliveryChallanModalProps> = ({
  dispatchId,
  onClose,
}) => {
  const [downloading, setDownloading] = React.useState(false);

  const { data: challan, isLoading, error } = useQuery({
    queryKey: ['delivery-challan', dispatchId],
    queryFn: async () => {
      const res = await api.get(`/dispatches/${dispatchId}/challan`);
      return res.data;
    },
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!challan) return;
    try {
      setDownloading(true);
      await downloadFile(
        `/dispatches/${dispatchId}/challan/pdf`,
        `Delivery_Challan_${challan.challanNumber}.pdf`,
      );
    } catch (err: any) {
      alert(err.message || 'Failed to download Delivery Challan PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-bold text-slate-800">Generating Dynamic Delivery Challan...</p>
        </div>
      </div>
    );
  }

  if (error || !challan) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
          <p className="text-rose-600 font-bold">Failed to load Delivery Challan data.</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 rounded-xl text-sm font-bold">
            Close
          </button>
        </div>
      </div>
    );
  }

  const { consignor, consignee, transaction, transport, columnsVisible, items, summary, taxSummary, documentReferences, instructions, signatures } = challan;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:max-w-none print:max-h-none print:shadow-none print:rounded-none">
        {/* Top Actions Bar (Hidden on Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-teal-100 text-teal-800 font-black rounded-full text-xs uppercase tracking-wider">
              {challan.documentType}
            </span>
            <span className="font-mono font-black text-slate-800 text-sm">{challan.challanNumber}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Challan</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              <span>{downloading ? 'Downloading...' : 'Export PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-800 print:overflow-visible print:p-0 print:space-y-4">
          {/* SECTION 1: TOP ACCENT BAR & COMPANY HEADER */}
          <div className="border-b-2 border-teal-700 pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-black text-lg">
                    A
                  </div>
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    {consignor.companyName}
                  </h1>
                </div>
                <p className="text-xs text-slate-600 max-w-lg">{consignor.registeredAddress}</p>
                <p className="text-xs text-slate-600">
                  <span className="font-bold text-slate-800">Warehouse: </span>
                  {consignor.warehouseName} ({consignor.warehouseAddress})
                </p>
                <p className="text-xs font-semibold text-slate-700">
                  GSTIN: <span className="font-mono font-bold text-slate-900">{consignor.gstin}</span> | PAN: <span className="font-mono font-bold text-slate-900">{consignor.pan}</span> | State: {consignor.state} (Code: {consignor.stateCode})
                </p>
              </div>

              <div className="text-right sm:text-right border sm:border-0 p-3 sm:p-0 rounded-xl bg-slate-50 sm:bg-transparent w-full sm:w-auto">
                <h2 className="text-base sm:text-lg font-black text-teal-700 uppercase tracking-wide">
                  {challan.documentType}
                </h2>
                <div className="mt-1 font-mono text-sm font-black text-slate-900">
                  Challan No: <span className="text-blue-700">{challan.challanNumber}</span>
                </div>
                <div className="text-xs text-slate-600 font-semibold">
                  Date: {new Date(challan.challanDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <div className="mt-1.5 inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-wide border border-emerald-300">
                  ORIGINAL FOR RECIPIENT
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: DOCUMENT & TRANSACTION INFORMATION BOX */}
          <div className="bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-slate-500 font-bold block uppercase text-[10px]">Dispatch Number</span>
              <span className="font-mono font-bold text-slate-900">{transaction.dispatchNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 font-bold block uppercase text-[10px]">Reference Type / No</span>
              <span className="font-mono font-bold text-blue-700">{transaction.referenceType}: {transaction.referenceNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 font-bold block uppercase text-[10px]">Movement Type</span>
              <span className="font-bold text-slate-800">{transaction.movementType}</span>
            </div>
            <div>
              <span className="text-slate-500 font-bold block uppercase text-[10px]">Transport Reason</span>
              <span className="font-bold text-slate-800">{transaction.reasonForTransport}</span>
            </div>

            {transaction.invoiceNumber && (
              <div>
                <span className="text-slate-500 font-bold block uppercase text-[10px]">Tax Invoice Ref</span>
                <span className="font-mono font-bold text-slate-900">{transaction.invoiceNumber}</span>
              </div>
            )}
            {transaction.ewayBillNumber && (
              <div>
                <span className="text-slate-500 font-bold block uppercase text-[10px]">E-Way Bill Number</span>
                <span className="font-mono font-bold text-slate-900">{transaction.ewayBillNumber}</span>
              </div>
            )}
            <div>
              <span className="text-slate-500 font-bold block uppercase text-[10px]">Document Status</span>
              <span className="font-black text-emerald-700 uppercase">{challan.status}</span>
            </div>
            <div>
              <span className="text-slate-500 font-bold block uppercase text-[10px]">Document Version</span>
              <span className="font-bold text-slate-800">v{challan.version}.0</span>
            </div>
          </div>

          {/* SECTION 3: FROM / TO INFORMATION (SIDE BY SIDE) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Consignor */}
            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <div className="bg-slate-100 border-b border-slate-300 px-3.5 py-1.5 font-black text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-teal-600" />
                <span>Dispatch From (Consignor)</span>
              </div>
              <div className="p-3.5 space-y-1">
                <p className="font-black text-slate-900 text-sm">{consignor.warehouseName}</p>
                <p className="text-slate-600">{consignor.warehouseAddress}</p>
                <div className="pt-1.5 border-t border-slate-200 mt-1.5 space-y-0.5 text-slate-700">
                  <p><span className="font-semibold">GSTIN:</span> <span className="font-mono font-bold text-slate-900">{consignor.gstin}</span></p>
                  <p><span className="font-semibold">State / Code:</span> {consignor.state} ({consignor.stateCode})</p>
                  <p><span className="font-semibold">Contact:</span> {consignor.phone} | {consignor.email}</p>
                </div>
              </div>
            </div>

            {/* Consignee */}
            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <div className="bg-slate-100 border-b border-slate-300 px-3.5 py-1.5 font-black text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                <span>Ship To / Consignee</span>
              </div>
              <div className="p-3.5 space-y-1">
                <p className="font-black text-slate-900 text-sm">{consignee.customerName}</p>
                <p className="text-slate-600 font-medium">
                  <span className="font-bold text-slate-800">Delivery Address: </span>
                  {consignee.shippingAddress}
                </p>
                {!consignee.isSameAddress && (
                  <p className="text-slate-500 text-[11px]">
                    <span className="font-bold">Billing Address: </span>
                    {consignee.billingAddress}
                  </p>
                )}
                <div className="pt-1.5 border-t border-slate-200 mt-1.5 space-y-0.5 text-slate-700">
                  <p><span className="font-semibold">GSTIN:</span> <span className="font-mono font-bold text-slate-900">{consignee.gstin || 'N/A'}</span></p>
                  <p><span className="font-semibold">State / Code:</span> {consignee.state} ({consignee.stateCode})</p>
                  <p><span className="font-semibold">Contact:</span> {consignee.phone} | {consignee.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: DYNAMIC ITEM / GOODS TABLE */}
          <div className="border border-slate-300 rounded-xl overflow-hidden">
            <div className="bg-slate-900 text-white px-3.5 py-2 font-black text-xs uppercase tracking-wider flex items-center justify-between">
              <span>Item / Dispatched Goods Details</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {items.length} Line Item{items.length > 1 ? 's' : ''} Dispatched
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-300 font-black text-slate-700">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">Sr.</th>
                    <th className="py-2.5 px-3">Item Code & Name</th>
                    <th className="py-2.5 px-3">HSN Code</th>
                    {columnsVisible.hasBatch && <th className="py-2.5 px-3">Batch / Lot #</th>}
                    {columnsVisible.hasSerial && <th className="py-2.5 px-3">Serial No</th>}
                    {columnsVisible.hasExpiry && <th className="py-2.5 px-3">Expiry Date</th>}
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3">UOM</th>
                    <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                    {columnsVisible.hasTax && <th className="py-2.5 px-3 text-right">Taxable (₹)</th>}
                    <th className="py-2.5 px-3 text-right">Total Value (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{item.productName}</div>
                        <div className="font-mono text-[10px] text-slate-500">{item.itemCode}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{item.hsn}</td>
                      {columnsVisible.hasBatch && (
                        <td className="py-2.5 px-3 font-mono text-slate-800 font-semibold">{item.batchNumber || '—'}</td>
                      )}
                      {columnsVisible.hasSerial && (
                        <td className="py-2.5 px-3 font-mono text-slate-800 font-semibold">{item.serialNumber || '—'}</td>
                      )}
                      {columnsVisible.hasExpiry && (
                        <td className="py-2.5 px-3 text-slate-700">{item.expiryDate || '—'}</td>
                      )}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-700">{item.quantity}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{item.uom}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                        {item.rate ? item.rate.toLocaleString('en-IN') : '0.00'}
                      </td>
                      {columnsVisible.hasTax && (
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                          {item.taxableValue ? item.taxableValue.toLocaleString('en-IN') : '0.00'}
                        </td>
                      )}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {item.totalValue ? item.totalValue.toLocaleString('en-IN') : '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 5 & 6: QUANTITY SUMMARY & VALUE/TAX SUMMARY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Quantity Summary */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
              <div className="font-black text-emerald-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Quantity & Packaging Summary</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-slate-800 font-medium">
                <div>
                  <span className="text-slate-500 text-[10px] block">Total Items:</span>
                  <span className="font-bold">{summary.totalLineItems} Lines</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Total Dispatched Qty:</span>
                  <span className="font-bold text-emerald-800">
                    {Object.entries(summary.uomQuantities)
                      .map(([uom, qty]) => `${qty} ${uom}`)
                      .join(', ')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Total Package Units:</span>
                  <span className="font-bold">{summary.totalPackages} Packages / Boxes</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Weight (Gross / Net):</span>
                  <span className="font-bold">{summary.totalGrossWeightKg} KG / {summary.totalNetWeightKg} KG</span>
                </div>
              </div>
            </div>

            {/* Value / Tax Summary */}
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-3.5 space-y-1.5">
              <div className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Value & Tax Breakdown</span>
              </div>
              <div className="space-y-1 pt-1 text-slate-700">
                <div className="flex justify-between">
                  <span>Total Taxable Value:</span>
                  <span className="font-mono font-bold text-slate-900">₹{taxSummary.totalTaxableValue.toLocaleString('en-IN')}</span>
                </div>
                {taxSummary.hasTax && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST (9%) + SGST (9%):</span>
                      <span className="font-mono font-bold text-slate-800">₹{(taxSummary.cgst + taxSummary.sgst).toLocaleString('en-IN')}</span>
                    </div>
                    {taxSummary.igst > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>IGST (18%):</span>
                        <span className="font-mono font-bold text-slate-800">₹{taxSummary.igst.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between pt-1 border-t border-slate-300 text-sm font-black text-slate-900">
                  <span>Grand Total:</span>
                  <span className="font-mono text-teal-700">₹{taxSummary.grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="bg-slate-100 border border-slate-300 rounded-xl px-4 py-2.5 text-xs">
            <span className="text-slate-500 font-bold uppercase text-[10px]">Total Amount in Words: </span>
            <span className="font-bold text-slate-900 italic ml-1">{taxSummary.amountInWords}</span>
          </div>

          {/* SECTION 7: TRANSPORT DETAILS */}
          <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
            <div className="bg-slate-100 border-b border-slate-300 px-3.5 py-1.5 font-black text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-slate-600" />
              <span>Transport & Fleet Logistics Details</span>
            </div>
            <div className="p-3.5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-slate-500 font-semibold block text-[10px]">Transporter Name</span>
                <span className="font-bold text-slate-900">{transport.transporterName}</span>
                {transport.transporterGstin && (
                  <span className="text-[10px] text-slate-500 block font-mono">GSTIN: {transport.transporterGstin}</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px]">Vehicle Number & Type</span>
                <span className="font-mono font-bold text-blue-700">{transport.vehicleNumber}</span>
                <span className="text-[10px] text-slate-500 block">({transport.vehicleType})</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px]">Driver Name & Contact</span>
                <span className="font-bold text-slate-900">{transport.driverName}</span>
                <span className="text-[10px] text-slate-500 block font-mono">{transport.driverPhone}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px]">LR / GR Number</span>
                <span className="font-mono font-bold text-slate-900">{transport.lrNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px]">E-Way Bill Number</span>
                <span className="font-mono font-bold text-slate-900">{transaction.ewayBillNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px]">Destination & Approx Distance</span>
                <span className="font-semibold text-slate-800">{transport.destination} ({transport.approxDistanceKm} KM)</span>
              </div>
            </div>
          </div>

          {/* SECTION 8 & 9: CONNECTED DOCUMENTS & INSTRUCTIONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Connected Documents */}
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 space-y-1.5">
              <span className="font-black text-slate-700 uppercase tracking-wider text-[10px] block">Connected ERP Document Chain</span>
              <div className="flex flex-wrap gap-1.5">
                {documentReferences.map((ref: any, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-300 font-mono text-[11px] font-bold text-slate-800">
                    <span className="text-slate-400 font-normal">{ref.type}:</span>
                    <span className="text-blue-700">{ref.number}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Special Instructions */}
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 space-y-1">
              <span className="font-black text-slate-700 uppercase tracking-wider text-[10px] block">Special Instructions & Remarks</span>
              <p className="text-slate-700 italic text-[11px]">
                {instructions.specialInstructions || 'Standard verified dispatch. Retain original challan for gate security.'}
              </p>
            </div>
          </div>

          {/* SECTION 10: 4-TIER SIGNATURES */}
          <div className="pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div className="border border-slate-300 rounded-xl p-3 flex flex-col justify-between h-24 bg-white">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Prepared By</span>
                <div className="border-b border-slate-300 mx-2" />
                <span className="font-bold text-slate-900">{signatures.preparedBy}</span>
              </div>

              <div className="border border-slate-300 rounded-xl p-3 flex flex-col justify-between h-24 bg-white">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Checked By</span>
                <div className="border-b border-slate-300 mx-2" />
                <span className="font-bold text-slate-900">{signatures.checkedBy}</span>
              </div>

              <div className="border border-slate-300 rounded-xl p-3 flex flex-col justify-between h-24 bg-white">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Authorized By</span>
                <div className="border-b border-slate-300 mx-2" />
                <span className="font-bold text-slate-900">{signatures.authorizedBy}</span>
              </div>

              <div className="border border-slate-300 rounded-xl p-3 flex flex-col justify-between h-24 bg-white">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Received By / Stamp</span>
                <div className="border-b border-slate-300 mx-2" />
                <span className="font-bold text-slate-900">{signatures.receivedBy}</span>
              </div>
            </div>
          </div>

          {/* SECTION 11: FOOTER */}
          <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <span className="font-bold text-slate-700">This is a computer-generated Delivery / Dispatch Challan.</span>
              <span> All goods are dispatched subject to standard commercial supply terms.</span>
            </div>
            <div className="font-mono">
              Generated: {new Date().toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
