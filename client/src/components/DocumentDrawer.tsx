import React, { useState } from 'react';
import {
  X,
  FileText,
  Trash2,
  UploadCloud,
  FileCode,
  FileSpreadsheet,
  Image as ImageIcon,
  CheckCircle,
  Loader2,
  Database,
  Layers,
} from 'lucide-react';
import { DocumentRecord } from '../types';
import { api } from '../services/api';

interface DocumentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentRecord[];
  conversationId?: string;
  onDocumentUploaded: (doc: DocumentRecord) => void;
  onDocumentDeleted: (id: string) => void;
}

export const DocumentDrawer: React.FC<DocumentDrawerProps> = ({
  isOpen,
  onClose,
  documents,
  conversationId,
  onDocumentUploaded,
  onDocumentDeleted,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg(null);
    try {
      const res = await api.uploadDocument(file, conversationId);
      if (res.document) {
        onDocumentUploaded(res.document);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteDocument(id);
      onDocumentDeleted(id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Delete failed');
    }
  };

  const getFileIcon = (filename: string, mime: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-5 h-5 text-rose-400" />;
    if (ext === 'docx' || ext === 'doc') return <FileText className="w-5 h-5 text-blue-400" />;
    if (ext === 'pptx' || ext === 'ppt') return <Layers className="w-5 h-5 text-amber-400" />;
    if (ext === 'csv') return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || ''))
      return <ImageIcon className="w-5 h-5 text-purple-400" />;
    return <FileCode className="w-5 h-5 text-sky-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md h-full bg-[#1c1c1f] border-l border-zinc-800 shadow-2xl flex flex-col p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Document Knowledge Base</h2>
              <p className="text-xs text-zinc-400">Built-in RAG semantic vector index</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Zone */}
        <div className="relative border-2 border-dashed border-zinc-700 hover:border-sky-500 rounded-xl p-5 text-center transition-all bg-[#232327]/60 group">
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={isUploading}
            accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="flex flex-col items-center gap-2">
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
                <p className="text-xs text-sky-300 font-medium">Extracting text & building vector chunks...</p>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-zinc-800 group-hover:bg-sky-500/20 flex items-center justify-center text-zinc-400 group-hover:text-sky-400 transition-colors">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-200">
                    Upload documents for RAG
                  </p>
                  <p className="text-[11px] text-zinc-400 pt-0.5">
                    Supports PDF, Word, PowerPoint, CSV, TXT, and Images
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-lg">
            {errorMsg}
          </p>
        )}

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium px-1">
            <span>INDEXED DOCUMENTS ({documents.length})</span>
            <span>RAG READY</span>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              No documents uploaded yet. Upload a PDF or file to query it directly in chat.
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#232327] border border-zinc-800/80 hover:border-zinc-700 transition-all group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="shrink-0">{getFileIcon(doc.filename, doc.mime_type)}</div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-white truncate max-w-[200px]" title={doc.filename}>
                      {doc.filename}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 pt-0.5">
                      <span>{formatFileSize(doc.size)}</span>
                      <span>•</span>
                      <span className="text-sky-400 font-medium">{doc.chunk_count} vector chunks</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span title="Indexed and ready for RAG" className="text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                  </span>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="text-[11px] text-zinc-500 border-t border-zinc-800 pt-3 flex items-center justify-between">
          <span>Automatic semantic retrieval enabled</span>
          <span className="text-emerald-400">● Active</span>
        </div>
      </div>
    </div>
  );
};
