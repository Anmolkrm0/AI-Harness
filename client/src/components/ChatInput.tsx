import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Plus,
  Globe,
  Mail,
  X,
  FileText,
  Loader2,
  Square,
  AudioLines,
  SendHorizontal,
  Scale,
} from 'lucide-react';
import { DocumentRecord } from '../types';
import { api } from '../services/api';

interface ChatInputProps {
  onSendMessage: (
    message: string,
    options: {
      enableWeb: boolean;
      enableGmail: boolean;
      enableJudge: boolean;
      attachments: DocumentRecord[];
    }
  ) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  conversationId?: string;
  onDocumentUploaded: (doc: DocumentRecord) => void;
}

const QUICK_SUGGESTIONS = [
  'Summarize emails',
  'Search the web',
  'Analyze document',
  'Debug code',
  'Draft brief',
  'Compare models',
];

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
  const [enableJudge, setEnableJudge] = useState(false);
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
      enableJudge,
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

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(`${suggestion} `);
    textareaRef.current?.focus();
  };

  return (
    <div
      className={`relative w-full max-w-4xl mx-auto px-3 sm:px-6 pb-3 sm:pb-5 transition-all ${
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
      {/* AskFlow Floating Input Card */}
      <div className="bg-white/95 dark:bg-[#18181d]/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-lg shadow-slate-200/40 dark:shadow-black/40 p-3 sm:p-4 focus-within:border-indigo-400 dark:focus-within:border-indigo-500 transition-all">
        {/* Attachment Chips Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 pb-2 mb-2 border-b border-slate-100 dark:border-zinc-800">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-[11px] sm:text-xs text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 max-w-[200px]"
              >
                <FileText className="w-3.5 h-3.5 text-[#5B50E6] dark:text-indigo-400 shrink-0" />
                <span className="truncate font-medium">{att.filename}</span>
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="p-0.5 hover:text-rose-600 dark:hover:text-rose-400 text-slate-400 dark:text-zinc-400 transition-colors shrink-0"
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
          placeholder="Ask me anything ✨"
          rows={1}
          className="w-full bg-transparent text-xs sm:text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 resize-none focus:outline-none max-h-36 sm:max-h-48 leading-relaxed px-1 font-medium"
        />

        {/* Action Toolbar */}
        <div className="flex items-center justify-between pt-2.5 mt-0.5">
          {/* Left tools: Plus attach, audio/waveform, Web, Gmail */}
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              multiple
              accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp"
              className="hidden"
            />

            {/* + Button matching reference */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-1.5 sm:p-2 rounded-xl text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center"
              title="Add documents (PDF, Word, PPTX, CSV, TXT, Images)"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#5B50E6]" />
              ) : (
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>

            {/* Audio / Waveform icon button matching reference */}
            <button
              type="button"
              className="p-1.5 sm:p-2 rounded-xl text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Voice & intelligent tool controls"
            >
              <AudioLines className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Tavily Web Search Toggle */}
            <button
              onClick={() => setEnableWeb(!enableWeb)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                enableWeb
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 border-slate-200 dark:border-zinc-700/60'
              }`}
              title="Tavily live web search"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Web</span>
            </button>

            {/* Gmail IMAP Toggle */}
            <button
              onClick={() => setEnableGmail(!enableGmail)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                enableGmail
                  ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/40'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 border-slate-200 dark:border-zinc-700/60'
              }`}
              title="Search and summarize Gmail emails"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Gmail</span>
            </button>

            {/* LLM as a Judge Toggle */}
            <button
              type="button"
              onClick={() => setEnableJudge(!enableJudge)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                enableJudge
                  ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-500/40 shadow-2xs'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 border-slate-200 dark:border-zinc-700/60'
              }`}
              title="Evaluate response using LLM as a Judge across 6 metrics (Accuracy, Relevance, Completeness, Hallucination, Tone, Citations)"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Judge</span>
            </button>
          </div>

          {/* Right Circular Send / Stop Button matching reference */}
          <div>
            {isStreaming ? (
              <button
                onClick={onStopStreaming}
                className="w-9 h-9 rounded-full bg-slate-200 dark:bg-zinc-700 hover:bg-rose-600 text-slate-700 dark:text-white flex items-center justify-center transition-all shadow-sm"
                title="Stop generation"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!message.trim() && attachments.length === 0}
                className="w-9 h-9 rounded-full bg-[#5B50E6] hover:bg-[#4C40D4] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-500/25 transition-all shrink-0 active:scale-95"
                title="Send message"
              >
                <SendHorizontal className="w-4 h-4 ml-0.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating Suggestion Pills beneath input matching reference image */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2.5 px-0.5">
        {QUICK_SUGGESTIONS.map((tag, idx) => (
          <button
            key={idx}
            onClick={() => handleSuggestionClick(tag)}
            className="px-3.5 py-1.5 rounded-full text-xs font-medium border border-slate-200/90 dark:border-zinc-800 bg-white/90 dark:bg-[#1a1a22]/90 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-2xs whitespace-nowrap cursor-pointer hover:-translate-y-0.5"
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
};
