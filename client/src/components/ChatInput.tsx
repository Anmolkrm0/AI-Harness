import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Paperclip,
  Globe,
  Mail,
  X,
  FileText,
  Loader2,
  Square,
} from 'lucide-react';
import { DocumentRecord } from '../types';
import { api } from '../services/api';

interface ChatInputProps {
  onSendMessage: (
    message: string,
    options: {
      enableWeb: boolean;
      enableGmail: boolean;
      attachments: DocumentRecord[];
    }
  ) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  conversationId?: string;
  onDocumentUploaded: (doc: DocumentRecord) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  conversationId,
  onDocumentUploaded,
}) => {
  const [message, setMessage] = useState('');
  const [enableWeb, setEnableWeb] = useState(false);
  const [enableGmail, setEnableGmail] = useState(false);
  const [attachments, setAttachments] = useState<DocumentRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [message]);

  const handleSend = () => {
    if ((!message.trim() && attachments.length === 0) || isStreaming) return;
    onSendMessage(message.trim(), {
      enableWeb,
      enableGmail,
      attachments,
    });
    setMessage('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await api.uploadDocument(file, conversationId);
        if (res.document) {
          setAttachments((prev) => [...prev, res.document]);
          onDocumentUploaded(res.document);
        }
      }
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div
      className={`relative w-full max-w-4xl mx-auto px-2 sm:px-4 pb-3 sm:pb-5 transition-all ${
        isDragging ? 'scale-[1.01]' : ''
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileUpload(e.dataTransfer.files);
      }}
    >
      <div className="bg-[#1e1e22] rounded-2xl border border-zinc-700/80 shadow-2xl p-2.5 sm:p-3 focus-within:border-sky-500/80 transition-all">
        {/* Attachment Chips Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 pb-2 mb-2 border-b border-zinc-800">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-800 text-[11px] sm:text-xs text-zinc-200 border border-zinc-700 max-w-[200px]"
              >
                <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate font-medium">{att.filename}</span>
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="p-0.5 hover:text-rose-400 text-zinc-400 transition-colors shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything, switch models mid-chat, query PDFs, search the web or emails..."
          rows={1}
          className="w-full bg-transparent text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none max-h-36 sm:max-h-48 leading-relaxed px-1"
        />

        {/* Toolbar & Actions */}
        <div className="flex items-center justify-between pt-2 mt-0.5 sm:mt-1">
          {/* Left quick tools */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              multiple
              accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp"
              className="hidden"
            />

            {/* Paperclip upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700/50 transition-colors"
              title="Attach documents (PDF, Word, PPTX, CSV, TXT, Images)"
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
              ) : (
                <Paperclip className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Attach</span>
            </button>

            {/* Tavily Web Search Toggle */}
            <button
              onClick={() => setEnableWeb(!enableWeb)}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                enableWeb
                  ? 'bg-sky-500/10 text-sky-400 border-sky-500/40'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800 border-zinc-700/50'
              }`}
              title="Tavily live web search"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Web</span>
            </button>

            {/* Gmail IMAP Toggle */}
            <button
              onClick={() => setEnableGmail(!enableGmail)}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                enableGmail
                  ? 'bg-red-500/10 text-red-400 border-red-500/40'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800 border-zinc-700/50'
              }`}
              title="Search and summarize Gmail emails"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Gmail</span>
            </button>
          </div>

          {/* Right Send / Stop button */}
          <div>
            {isStreaming ? (
              <button
                onClick={onStopStreaming}
                className="w-8 h-8 rounded-xl bg-zinc-700 hover:bg-rose-600 text-white flex items-center justify-center transition-all shadow-md"
                title="Stop generation"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!message.trim() && attachments.length === 0}
                className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-sky-500/20 transition-all shrink-0"
                title="Send message (Enter)"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="text-[10px] sm:text-[11px] text-center text-zinc-500 pt-1.5 line-clamp-1">
        AI Harness combines multi-model intelligence, RAG document knowledge, Tavily web search, and Gmail.
      </p>
    </div>
  );
};
