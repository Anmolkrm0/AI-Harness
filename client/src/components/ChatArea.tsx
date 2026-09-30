import React, { useRef, useEffect } from 'react';
import {
  Sparkles,
  User,
  Bot,
  Globe,
  Mail,
  FileText,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Message, ToolEvent, ModelInfo } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatAreaProps {
  messages: Message[];
  models: ModelInfo[];
  isStreaming: boolean;
  activeToolEvents: ToolEvent[];
  onPromptSuggestion: (text: string) => void;
  onRegenerate: (messageIndex: number) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  models,
  isStreaming,
  activeToolEvents,
  onPromptSuggestion,
  onRegenerate,
}) => {
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [expandedToolMap, setExpandedToolMap] = React.useState<Record<string, boolean>>({});

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeToolEvents, isStreaming]);

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleToolExpand = (key: string) => {
    setExpandedToolMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getModelName = (modelId?: string | null) => {
    if (!modelId) return 'AI Model';
    const found = models.find((m) => m.id === modelId);
    return found ? found.name : modelId;
  };

  const getProviderBadge = (provider?: string | null) => {
    switch (provider) {
      case 'openai':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'anthropic':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'gemini':
        return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
      case 'xai':
        return 'text-zinc-200 bg-zinc-500/10 border-zinc-500/30';
      default:
        return 'text-zinc-300 bg-zinc-700/50 border-zinc-600/50';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-2.5 sm:px-6 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {messages.length === 0 ? (
        /* Empty State / Welcome Screen */
        <div className="max-w-2xl mx-auto my-auto py-8 sm:py-12 flex flex-col items-center text-center space-y-6 sm:space-y-8">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-sky-500/20">
            <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>

          <div className="space-y-1.5 sm:space-y-2 px-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Unified Multi-Model AI Harness
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
              Switch seamlessly between Gemini, Claude, GPT, and Grok. Connect documents for RAG, search the web via Tavily, and query your Gmail inbox.
            </p>
          </div>

          {/* Prompt Suggestions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full text-left">
            <button
              onClick={() => onPromptSuggestion('Search the web for the latest major AI breakthroughs this week and summarize them')}
              className="p-3 sm:p-3.5 rounded-xl bg-[#1e1e22] hover:bg-[#26262a] border border-zinc-800 hover:border-zinc-700 transition-all text-xs space-y-1 group"
            >
              <div className="flex items-center gap-2 text-sky-400 font-semibold">
                <Globe className="w-3.5 h-3.5" />
                <span>Internet Search</span>
              </div>
              <p className="text-zinc-400 group-hover:text-zinc-200 transition-colors">
                "Search the web for the latest major AI breakthroughs this week"
              </p>
            </button>

            <button
              onClick={() => onPromptSuggestion('Check my recent emails and summarize any important messages')}
              className="p-3 sm:p-3.5 rounded-xl bg-[#1e1e22] hover:bg-[#26262a] border border-zinc-800 hover:border-zinc-700 transition-all text-xs space-y-1 group"
            >
              <div className="flex items-center gap-2 text-red-400 font-semibold">
                <Mail className="w-3.5 h-3.5" />
                <span>Gmail Inbox</span>
              </div>
              <p className="text-zinc-400 group-hover:text-zinc-200 transition-colors">
                "Check my recent emails and summarize important messages"
              </p>
            </button>

            <button
              onClick={() => onPromptSuggestion('Compare the architecture, context window, and trade-offs of Gemini Flash vs Claude Sonnet 5.5')}
              className="p-3 sm:p-3.5 rounded-xl bg-[#1e1e22] hover:bg-[#26262a] border border-zinc-800 hover:border-zinc-700 transition-all text-xs space-y-1 group"
            >
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Multi-Model Intelligence</span>
              </div>
              <p className="text-zinc-400 group-hover:text-zinc-200 transition-colors">
                "Compare the strengths of Gemini Flash vs Claude Sonnet 5.5"
              </p>
            </button>

            <button
              onClick={() => onPromptSuggestion('Explain the key concepts and findings in my uploaded document')}
              className="p-3 sm:p-3.5 rounded-xl bg-[#1e1e22] hover:bg-[#26262a] border border-zinc-800 hover:border-zinc-700 transition-all text-xs space-y-1 group"
            >
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <FileText className="w-3.5 h-3.5" />
                <span>Document RAG</span>
              </div>
              <p className="text-zinc-400 group-hover:text-zinc-200 transition-colors">
                "Explain the key concepts and findings in my uploaded document"
              </p>
            </button>
          </div>
        </div>
      ) : (
        /* Messages Stream */
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const modelName = getModelName(msg.model_used);
            const providerClass = getProviderBadge(msg.provider_used);

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 sm:gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md shadow-sky-500/10">
                    <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                )}

                <div className={`space-y-1.5 sm:space-y-2 max-w-[92%] sm:max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Model & Source metadata badge for assistant messages */}
                  {!isUser && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${providerClass}`}
                      >
                        {modelName}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}

                  {/* Tool execution history pills for assistant messages */}
                  {!isUser && msg.tool_calls && msg.tool_calls.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {msg.tool_calls.map((tc, tIdx) => {
                        const expandKey = `${msg.id}-${tIdx}`;
                        const isExpanded = expandedToolMap[expandKey];

                        return (
                          <div
                            key={tIdx}
                            className="rounded-xl border border-zinc-800 bg-[#1a1a1d] text-xs overflow-hidden"
                          >
                            <button
                              onClick={() => toggleToolExpand(expandKey)}
                              className="w-full flex items-center justify-between px-3 py-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                            >
                              <div className="flex items-center gap-2 overflow-hidden text-left">
                                {tc.tool === 'rag' && <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                                {tc.tool === 'tavily' && <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                                {tc.tool === 'gmail' && <Mail className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                                <span className="font-medium text-[11px] capitalize truncate">
                                  {tc.tool === 'rag' && `Document RAG (${tc.count} chunks)`}
                                  {tc.tool === 'tavily' && `Tavily Search: "${tc.query}" (${tc.resultsCount} sources)`}
                                  {tc.tool === 'gmail' && `Gmail IMAP (${tc.count} emails)`}
                                </span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3 text-zinc-500 shrink-0 ml-1" />
                              ) : (
                                <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0 ml-1" />
                              )}
                            </button>

                            {isExpanded && (
                              <div className="p-3 border-t border-zinc-800/80 bg-[#161619] space-y-2 text-[11px] text-zinc-400">
                                {tc.sources && tc.sources.length > 0 && (
                                  <div>
                                    <p className="font-semibold text-zinc-300 mb-1">Sources:</p>
                                    <ul className="list-disc pl-4 space-y-0.5">
                                      {tc.sources.map((s: any, sIdx: number) => (
                                        <li key={sIdx} className="break-all">
                                          {typeof s === 'string' ? (
                                            s
                                          ) : (
                                            <a
                                              href={s.url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-sky-400 hover:underline flex items-center gap-1 inline-flex"
                                            >
                                              <span className="truncate max-w-[240px]">{s.title}</span> <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                            </a>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {tc.emails && tc.emails.length > 0 && (
                                  <div>
                                    <p className="font-semibold text-zinc-300 mb-1">Emails Referenced:</p>
                                    <ul className="list-disc pl-4 space-y-0.5">
                                      {tc.emails.map((e: any, eIdx: number) => (
                                        <li key={eIdx}>
                                          <span className="text-zinc-200">{e.subject}</span> ({e.from})
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm shadow-sm leading-relaxed ${
                      isUser
                        ? 'bg-sky-600 text-white rounded-br-none ml-auto'
                        : 'bg-[#1e1e22] text-zinc-100 rounded-bl-none border border-zinc-700/60'
                    }`}
                  >
                    {/* User attachments */}
                    {isUser && msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pb-2 mb-2 border-b border-sky-500/40">
                        {msg.attachments.map((a) => (
                          <div
                            key={a.id}
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-700/80 text-[10px] sm:text-[11px] text-white"
                          >
                            <FileText className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{a.filename}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div>
                        {msg.content ? (
                          <MarkdownRenderer content={msg.content} />
                        ) : (
                          <div className="flex items-center gap-2 py-1 text-zinc-400 text-xs">
                            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
                            <span>Thinking & searching context...</span>
                          </div>
                        )}
                        {msg.isStreaming && (
                          <span className="inline-block w-2 h-3.5 bg-sky-400 ml-1 animate-pulse align-middle" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action buttons on assistant message */}
                  {!isUser && !msg.isStreaming && msg.content && (
                    <div className="flex items-center gap-1 text-zinc-500 pt-0.5">
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="p-1 rounded hover:bg-zinc-800 hover:text-zinc-300 text-xs flex items-center gap-1 transition-colors"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px] text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => onRegenerate(index)}
                        className="p-1 rounded hover:bg-zinc-800 hover:text-zinc-300 text-xs flex items-center gap-1 transition-colors"
                        title="Regenerate with current model"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Regenerate</span>
                      </button>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-zinc-700 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5 shadow-sm">
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Active Tool Events Timeline during live generation */}
          {activeToolEvents.length > 0 && isStreaming && (
            <div className="flex gap-2.5 sm:gap-3.5 justify-start">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md shadow-sky-500/10">
                <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="space-y-1.5 max-w-[92%] sm:max-w-[85%]">
                {activeToolEvents.map((evt, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1e1e22] border border-zinc-700/60 text-xs text-zinc-300 shadow-sm animate-pulse"
                  >
                    {evt.type === 'rag' && <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                    {evt.type === 'tavily' && <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    {evt.type === 'gmail' && <Mail className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                    <span className="truncate">{evt.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div ref={scrollEndRef} />
        </div>
      )}
    </div>
  );
};
