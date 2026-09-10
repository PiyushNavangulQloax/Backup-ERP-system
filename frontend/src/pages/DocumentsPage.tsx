import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  FileText,
  UploadCloud,
  Search,
  Filter,
  Download,
  Trash2,
  Layers,
  FileCheck,
  Building,
  CheckCircle2,
  Clock,
  Plus,
  X,
} from 'lucide-react';

export const DocumentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [entityType, setEntityType] = useState('PART');
  const [entityId, setEntityId] = useState('');
  const [fileName, setFileName] = useState('');

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', selectedType, search],
    queryFn: async () => {
      const params: any = {};
      if (selectedType !== 'ALL') params.entityType = selectedType;
      if (search) params.search = search;
      const res: any = await api.get('/documents', { params });
      return res.data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.post('/documents', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setIsUploadOpen(false);
      setTitle('');
      setFileName('');
      setEntityId('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.delete(`/documents/${id}`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !fileName) return;
    uploadMutation.mutate({
      title,
      entityType,
      entityId: entityId || 'PRT-FG-101',
      fileName: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
      fileSize: Math.floor(Math.random() * 2000000) + 500000,
      mimeType: 'application/pdf',
    });
  };

  const entityTypes = [
    { label: 'All Documents', value: 'ALL' },
    { label: 'Engineering Drawings & Parts', value: 'PART' },
    { label: 'Purchase Orders', value: 'PO' },
    { label: 'Quality & GRN Reports', value: 'GRN' },
    { label: 'Customer Agreements', value: 'CUSTOMER' },
  ];

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '1.2 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
              <FileText className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span>Technical Documents & Drawings (FR-15)</span>
          </h1>
          <p className="text-sm font-semibold text-slate-600 mt-1">
            Centralized engineering repository, CAD blueprints, customer contracts & revision history
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md transition-all self-start md:self-auto"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1">
          {entityTypes.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedType(tab.value)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                selectedType === tab.value
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blueprints, files..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {(documents || []).map((doc: any) => (
          <div
            key={doc.id}
            className="p-5 rounded-2xl bg-white border border-slate-300 shadow-sm hover:shadow-md hover:border-blue-400 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  {doc.entityType}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  v{doc.version}.0
                </span>
              </div>

              <h3 className="font-black text-base text-slate-900 line-clamp-2">{doc.title}</h3>
              <p className="text-xs font-mono font-semibold text-slate-500 mt-1 truncate">{doc.fileName}</p>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>{formatFileSize(doc.fileSize)}</span>
                <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
              <a
                href={doc.fileUrl || '#'}
                download={doc.fileName}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-bold transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>

              <button
                onClick={() => {
                  if (confirm('Delete this technical document record?')) {
                    deleteMutation.mutate(doc.id);
                  }
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                title="Delete Document"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {(!documents || documents.length === 0) && !isLoading && (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-300 p-8">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-black text-slate-800">No Documents Found</h3>
          <p className="text-xs font-semibold text-slate-500 mt-1">Upload an engineering blueprint, mill test report or customer agreement.</p>
        </div>
      )}

      {/* Upload Document Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setIsUploadOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-blue-600" />
              <span>Upload Engineering Document</span>
            </h2>
            <p className="text-xs font-semibold text-slate-500 mb-5">
              Files uploaded with an existing title will automatically increment the revision version.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Engine Bracket Blueprint Revision C"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">Entity Category</label>
                  <select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-600 bg-white"
                  >
                    <option value="PART">Part / Product</option>
                    <option value="PO">Purchase Order</option>
                    <option value="GRN">GRN / Quality</option>
                    <option value="CUSTOMER">Customer Contract</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">Entity Reference ID</label>
                  <input
                    type="text"
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    placeholder="e.g. PRT-FG-101 or PO-001"
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">File Name</label>
                <input
                  type="text"
                  required
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="e.g. Blueprint_Engine_Mount_RevC.pdf"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadMutation.isPending}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all"
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Save & Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
