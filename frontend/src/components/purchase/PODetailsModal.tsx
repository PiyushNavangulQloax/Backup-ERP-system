import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, downloadFile } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Building,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  FileDown,
  AlertOctagon,
  User,
  Package,
  ShieldAlert,
  DollarSign,
} from 'lucide-react';

interface PODetailsModalProps {
  poId: string;
  onClose: () => void;
}

export const PODetailsModal: React.FC<PODetailsModalProps> = ({ poId, onClose }) => {
  const queryClient = useQueryClient();
  const { hasPermission, user } = useAuth();

  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [downloading, setDownloading] = useState(false);

  const canReview = hasPermission('po.approve') || user?.role === 'Administrator' || user?.role === 'Management';

  const { data: po, isLoading, error } = useQuery({
    queryKey: ['purchase-order-details', poId],
    queryFn: async () => {
      const res = await api.get(`/purchase-orders/${poId}`);
      return res.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      return (await api.post(`/purchase-orders/${poId}/approve`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order-details', poId] });
      alert('Purchase order approved successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to approve purchase order');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      return (await api.post(`/purchase-orders/${poId}/reject`, { reason })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order-details', poId] });
      setIsRejecting(false);
      alert('Purchase order has been rejected.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to reject purchase order');
    },
  });

  const handleDownloadPdf = async () => {
    if (!po) return;
    try {
      setDownloading(true);
      await downloadFile(`/purchase-orders/${poId}/pdf`, `Purchase_Order_${po.poNumber}.pdf`);
    } catch (err: any) {
      alert(err.message || 'Failed to download PO PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }
    rejectMutation.mutate(rejectionReason);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-bold text-slate-800 text-sm">Loading purchase order details...</p>
        </div>
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
          <p className="text-rose-600 font-bold">Failed to load purchase order details.</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 rounded-xl text-xs font-bold">
            Close
          </button>
        </div>
      </div>
    );
  }

  const isPendingReview = po.status === 'SUBMITTED' || po.status === 'DRAFT';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
              <FileText className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black text-slate-900">{po.poNumber}</h2>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide border ${
                    po.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : po.status === 'SUBMITTED'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : po.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  {po.status === 'APPROVED' && <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />}
                  {po.status === 'SUBMITTED' && <Clock className="w-3.5 h-3.5 text-amber-700" />}
                  {po.status === 'REJECTED' && <XCircle className="w-3.5 h-3.5 text-rose-700" />}
                  <span>{po.status}</span>
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500">
                Created on {new Date(po.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-blue-600" />
              <span>{downloading ? 'Exporting...' : 'PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-800 text-xs">
          {/* Rejection Alert Banner if Rejected */}
          {po.status === 'REJECTED' && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-950">
              <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-black text-rose-900 block text-sm">Purchase Order Rejected</span>
                <p className="font-medium mt-0.5">
                  <span className="font-bold">Reason: </span>
                  {po.rejectionReason || 'Rejected by management.'}
                </p>
                {po.approvedBy && (
                  <span className="text-[11px] text-rose-700 block mt-1">
                    Rejected by {po.approvedBy.firstName} {po.approvedBy.lastName} on{' '}
                    {po.updatedAt ? new Date(po.updatedAt).toLocaleDateString('en-IN') : 'N/A'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Supplier & Delivery Terms Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Supplier Information */}
            <div className="border border-slate-300 rounded-2xl p-4 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 font-black text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200 pb-2">
                <Building className="w-4 h-4 text-blue-600" />
                <span>Vendor / Supplier Details</span>
              </div>
              <div className="space-y-1 pt-1">
                <p className="font-black text-slate-900 text-sm">{po.supplier?.name}</p>
                <p className="text-slate-600">
                  <span className="font-semibold">Code:</span> {po.supplier?.code || 'N/A'} |{' '}
                  <span className="font-semibold">GSTIN:</span> {po.supplier?.gstin || 'N/A'}
                </p>
                <p className="text-slate-600">
                  <span className="font-semibold">Contact:</span> {po.supplier?.contactPerson || 'N/A'} (
                  {po.supplier?.phone || po.supplier?.email || 'N/A'})
                </p>
                <p className="text-slate-500">{po.supplier?.address || 'Registered Vendor Address'}</p>
              </div>
            </div>

            {/* Terms & Delivery */}
            <div className="border border-slate-300 rounded-2xl p-4 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 font-black text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200 pb-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>Delivery Terms & Notes</span>
              </div>
              <div className="space-y-1.5 pt-1">
                <p>
                  <span className="font-semibold text-slate-600">Expected Delivery: </span>
                  <span className="font-bold text-slate-900">
                    {po.deliveryDate
                      ? new Date(po.deliveryDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Immediate Fulfillment'}
                  </span>
                </p>
                <p>
                  <span className="font-semibold text-slate-600">Payment Terms: </span>
                  <span className="font-medium text-slate-800">
                    {po.supplier?.paymentTerms || 'Standard Net 30 Terms'}
                  </span>
                </p>
                <p>
                  <span className="font-semibold text-slate-600">Special Notes: </span>
                  <span className="font-medium text-slate-700 italic">
                    {po.notes || 'No special terms provided.'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="bg-slate-900 text-white px-4 py-2.5 font-black uppercase tracking-wider flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                <span>Purchase Order Line Items</span>
              </div>
              <span className="text-[10px] text-slate-400 font-normal">
                {po.items?.length || 0} Line Item{(po.items?.length || 0) > 1 ? 's' : ''}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-100 border-b border-slate-300 font-black text-slate-700 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">#</th>
                    <th className="py-2.5 px-3">Part Code & Name</th>
                    <th className="py-2.5 px-3 text-right">Ordered Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Tax %</th>
                    <th className="py-2.5 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {po.items?.map((item: any, idx: number) => {
                    const uom = item.part?.unit?.symbol || item.part?.unit?.name || 'units';
                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-black text-slate-900 block">{item.part?.name || 'Part'}</span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {item.part?.code || 'N/A'} {item.part?.hsnCode ? `| HSN: ${item.part?.hsnCode}` : ''}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-blue-700">
                          {item.orderedQty} <span className="font-normal text-slate-500">{uom}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                          ${Number(item.unitPrice).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {item.taxRate || 0}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                          ${Number(item.lineTotal || item.orderedQty * item.unitPrice).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Financial Totals */}
            <div className="bg-slate-50 border-t border-slate-300 p-4 flex justify-end">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold text-slate-800">
                    ${Number(po.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Estimated Tax:</span>
                  <span className="font-mono font-bold text-slate-800">
                    ${Number(po.taxAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-300 text-sm font-black text-slate-900">
                  <span>Grand Total:</span>
                  <span className="font-mono text-blue-700">
                    ${Number(po.grandTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Audit / Approver Information */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 text-slate-600 flex flex-col sm:flex-row justify-between gap-3">
            <div>
              <span className="font-bold text-slate-800 block">Created By:</span>
              <span>
                {po.createdBy ? `${po.createdBy.firstName} ${po.createdBy.lastName}` : 'System User'}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-800 block">Review Status:</span>
              <span>
                {po.approvedBy
                  ? `${po.status === 'APPROVED' ? 'Approved' : 'Reviewed'} by ${po.approvedBy.firstName} ${po.approvedBy.lastName}`
                  : 'Awaiting Management Review'}
              </span>
            </div>
          </div>

          {/* Inline Rejection Reason Prompt (when reviewer clicks Reject) */}
          {isRejecting && (
            <form onSubmit={handleConfirmReject} className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-3">
              <div className="flex items-center gap-2 text-rose-900 font-black text-xs uppercase tracking-wider">
                <AlertOctagon className="w-4 h-4 text-rose-700" />
                <span>Specify Rejection Reason (Required)</span>
              </div>
              <textarea
                required
                rows={2}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this purchase order is rejected (e.g. Rate exceeds contract, redundant quantity, wrong supplier)..."
                className="w-full bg-white border border-rose-300 rounded-xl p-2.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRejecting(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectMutation.isPending}
                  className="px-5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 font-medium">
            {canReview ? 'Reviewer mode: You have authorization to approve or reject.' : 'View-only mode.'}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black transition-colors"
            >
              Close
            </button>

            {/* Approver Actions */}
            {isPendingReview && canReview && (
              <>
                {!isRejecting && (
                  <button
                    onClick={() => setIsRejecting(true)}
                    className="px-5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-black text-xs shadow-sm transition-all cursor-pointer"
                  >
                    Reject Order
                  </button>
                )}
                <button
                  onClick={() => {
                    if (window.confirm(`Approve Purchase Order ${po.poNumber}?`)) {
                      approveMutation.mutate();
                    }
                  }}
                  disabled={approveMutation.isPending}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  {approveMutation.isPending ? 'Approving...' : 'Approve Order'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
