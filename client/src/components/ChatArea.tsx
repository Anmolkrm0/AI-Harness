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
  Scale,
} from 'lucide-react';
import { Message, ToolEvent, ModelInfo } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { JudgeScorecard } from './JudgeScorecard';

interface ChatAreaProps {
  messages: Message[];
  models: ModelInfo[];
  isStreaming: boolean;
  activeToolEvents: ToolEvent[];
  onPromptSuggestion: (text: string) => void;
  onRegenerate: (messageIndex: number) => void;
  onEvaluateJudge?: (messageId: string) => void;
  onImproveMessage?: (messageId: string) => void;
  evaluatingMessageId?: string | null;
  improvingMessageId?: string | null;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  models,
  isStreaming,
  activeToolEvents,
  onPromptSuggestion,
  onRegenerate,
  onEvaluateJudge,
  onImproveMessage,
  evaluatingMessageId,
  improvingMessageId,
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getProviderBadge = (provider?: string | null) => {
    switch (provider) {
      case 'openai':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/30';
      case 'anthropic':
        return 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/30';
      case 'gemini':
        return 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-sky-400 dark:bg-sky-500/10 dark:border-sky-500/30';
      case 'xai':
        return 'text-slate-700 bg-slate-100 border-slate-200 dark:text-zinc-200 dark:bg-zinc-500/10 dark:border-zinc-500/30';
      default:
        return 'text-slate-600 bg-slate-100 border-slate-200 dark:text-zinc-300 dark:bg-zinc-700/50 dark:border-zinc-600/50';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 relative">
      {/* Top ambient pastel mesh gradient aura matching reference image */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(196,181,253,0.45)_0%,rgba(251,207,232,0.3)_35%,rgba(254,240,138,0.2)_65%,transparent_100%)] dark:bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(99,102,241,0.18)_0%,rgba(147,51,234,0.12)_35%,transparent_80%)] -z-0" />

      {messages.length === 0 ? (
        /* Empty State / Welcome Screen matching AskFlow reference design */
        <div className="max-w-3xl mx-auto my-auto py-6 sm:py-12 flex flex-col items-center text-center space-y-6 sm:space-y-8 relative z-0">
          {/* Waving Hand Emoji */}
          <div className="flex flex-col items-center space-y-3">
            <span className="text-4xl sm:text-5xl select-none animate-wave">👋</span>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {getGreeting()}
              </h1>
              <p className="text-base sm:text-xl font-medium text-slate-500 dark:text-zinc-400">
                What are you thinking about?
              </p>
            </div>
          </div>

          {/* 3 Meaningful Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 w-full text-left">
            {/* Card 1: Internet Research */}
            <button
              onClick={() => onPromptSuggestion('Search the web for the latest artificial intelligence breakthroughs this week and synthesize key developments.')}
              className="p-5 rounded-2xl bg-white/90 dark:bg-[#1a1a22]/90 backdrop-blur-sm border border-slate-200/80 dark:border-zinc-800/80 hover:border-emerald-400 dark:hover:border-emerald-500/50 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between min-h-[140px] text-left hover:-translate-y-0.5"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                <Globe className="w-4 h-4" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-zinc-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors leading-relaxed">
                Search the web for the latest artificial intelligence breakthroughs this week and synthesize key developments.
              </p>
            </button>

            {/* Card 2: Gmail Inbox Assistant */}
            <button
              onClick={() => onPromptSuggestion('Review my recent emails, highlight high-priority requests, and summarize action items.')}
              className="p-5 rounded-2xl bg-white/90 dark:bg-[#1a1a22]/90 backdrop-blur-sm border border-slate-200/80 dark:border-zinc-800/80 hover:border-indigo-400 dark:hover:border-zinc-700 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between min-h-[140px] text-left hover:-translate-y-0.5"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-[#5B50E6] dark:text-indigo-400 mb-3">
                <Mail className="w-4 h-4" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-zinc-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors leading-relaxed">
                Review my recent emails, highlight high-priority requests, and summarize action items.
              </p>
            </button>

            {/* Card 3: Document RAG & Code */}
            <button
              onClick={() => onPromptSuggestion('Analyze uploaded documents to extract executive takeaways, data tables, and key findings.')}
              className="p-5 rounded-2xl bg-white/90 dark:bg-[#1a1a22]/90 backdrop-blur-sm border border-slate-200/80 dark:border-zinc-800/80 hover:border-violet-400 dark:hover:border-violet-500/50 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between min-h-[140px] text-left hover:-translate-y-0.5"
            >
              <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-[#7C3AED] dark:text-violet-400 mb-3">
                <FileText className="w-4 h-4" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-zinc-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors leading-relaxed">
                Analyze uploaded documents to extract executive takeaways, data tables, and key findings.
              </p>
            </button>
          </div>
        </div>
      ) : (
        /* Messages Stream */
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 relative z-10">
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
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md shadow-indigo-500/15">
                    <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                )}

                <div className={`space-y-1.5 sm:space-y-2 max-w-[92%] sm:max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Model & Source metadata badge for assistant messages */}
                  {!isUser && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${providerClass}`}
                      >
                        {modelName}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500">
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
                            className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-[#1a1a1d] text-xs overflow-hidden"
                          >
                            <button
                              onClick={() => toggleToolExpand(expandKey)}
                              className="w-full flex items-center justify-between px-3 py-1.5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 transition-colors"
                            >
                              <div className="flex items-center gap-2 overflow-hidden text-left">
                                {tc.tool === 'rag' && <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                                {tc.tool === 'tavily' && <Globe className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                {tc.tool === 'gmail' && <Mail className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                                <span className="font-semibold text-[11px] capitalize truncate">
                                  {tc.tool === 'rag' && `Document RAG (${tc.count} chunks)`}
                                  {tc.tool === 'tavily' && `Tavily Search: "${tc.query}" (${tc.resultsCount} sources)`}
                                  {tc.tool === 'gmail' && `Gmail IMAP (${tc.count} emails)`}
                                </span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3 text-slate-400 dark:text-zinc-500 shrink-0 ml-1" />
                              ) : (
                                <ChevronDown className="w-3 h-3 text-slate-400 dark:text-zinc-500 shrink-0 ml-1" />
                              )}
                            </button>

                            {isExpanded && (
                              <div className="p-3 border-t border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#161619] space-y-2 text-[11px] text-slate-600 dark:text-zinc-400">
                                {tc.sources && tc.sources.length > 0 && (
                                  <div>
                                    <p className="font-semibold text-slate-800 dark:text-zinc-300 mb-1">Sources:</p>
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
                                              className="text-indigo-600 dark:text-sky-400 hover:underline flex items-center gap-1 inline-flex"
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
                                    <p className="font-semibold text-slate-800 dark:text-zinc-300 mb-1">Emails Referenced:</p>
                                    <ul className="list-disc pl-4 space-y-0.5">
                                      {tc.emails.map((e: any, eIdx: number) => (
                                        <li key={eIdx}>
                                          <span className="text-slate-800 dark:text-zinc-200">{e.subject}</span> ({e.from})
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
                    className={`rounded-2xl px-4 py-3 text-xs sm:text-sm shadow-xs leading-relaxed ${
                      isUser
                        ? 'bg-[#5B50E6] text-white rounded-br-xs ml-auto shadow-md shadow-indigo-500/15'
                        : 'bg-white dark:bg-[#1a1a22] text-slate-800 dark:text-zinc-100 rounded-bl-xs border border-slate-200/80 dark:border-zinc-800 shadow-xs'
                    }`}
                  >
                    {/* User attachments */}
                    {isUser && msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pb-2 mb-2 border-b border-indigo-400/40">
                        {msg.attachments.map((a) => (
                          <div
                            key={a.id}
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-700/80 text-[10px] sm:text-[11px] text-white"
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
                          <div className="flex items-center gap-2 py-1 text-slate-500 dark:text-zinc-400 text-xs">
                            <span className="w-2 h-2 rounded-full bg-[#5B50E6] animate-ping"></span>
                            <span>Thinking & retrieving intelligence...</span>
                          </div>
                        )}
                        {msg.isStreaming && (
                          <span className="inline-block w-2 h-3.5 bg-[#5B50E6] ml-1 animate-pulse align-middle" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* LLM as a Judge Scorecard */}
                  {!isUser && !msg.isStreaming && msg.judge_evaluation && (
                    <JudgeScorecard
                      evaluation={msg.judge_evaluation}
                      onImprove={onImproveMessage ? () => onImproveMessage(msg.id) : undefined}
                      isImproving={improvingMessageId === msg.id}
                    />
                  )}

                  {/* Suggested follow-up questions */}
                  {!isUser && !msg.isStreaming && msg.suggested_questions && msg.suggested_questions.length > 0 && (
                    <div className="pt-1 flex flex-col gap-1.5 w-full">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                        <span>Suggested follow-ups</span>
                      </div>
                      <div className="flex flex-col gap-1.5 w-full">
                        {msg.suggested_questions.map((question, qIdx) => (
                          <button
                            key={qIdx}
                            onClick={() => onPromptSuggestion(question)}
                            className="text-left text-xs px-3.5 py-2 rounded-xl bg-white/90 dark:bg-[#1a1a22]/90 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200/80 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-600/50 transition-all flex items-center justify-between gap-2.5 group shadow-2xs hover:shadow-xs"
                          >
                            <span className="leading-snug">{question}</span>
                            <span className="text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 shrink-0 font-bold">→</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons on assistant message */}
                  {!isUser && !msg.isStreaming && msg.content && (
                    <div className="flex items-center gap-1 text-slate-400 dark:text-zinc-500 pt-0.5">
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-700 dark:hover:text-zinc-300 text-xs flex items-center gap-1 transition-colors"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Copied</span>
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
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-700 dark:hover:text-zinc-300 text-xs flex items-center gap-1 transition-colors"
                        title="Regenerate with current model"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Regenerate</span>
                      </button>

                      {/* On-demand LLM as a Judge evaluation */}
                      {!msg.judge_evaluation && onEvaluateJudge && (
                        <button
                          onClick={() => onEvaluateJudge(msg.id)}
                          disabled={evaluatingMessageId === msg.id}
                          className="p-1 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-600 dark:hover:text-purple-400 text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                          title="Evaluate response with LLM as a Judge across 6 metrics"
                        >
                          <Scale className={`w-3.5 h-3.5 ${evaluatingMessageId === msg.id ? 'animate-spin' : ''}`} />
                          <span className="text-[10px]">
                            {evaluatingMessageId === msg.id ? 'Evaluating...' : 'Judge'}
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 shrink-0 mt-0.5 shadow-xs">
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Active Tool Events Timeline during live generation */}
          {activeToolEvents.length > 0 && isStreaming && (
            <div className="flex gap-2.5 sm:gap-3.5 justify-start">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md shadow-indigo-500/15">
                <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="space-y-1.5 max-w-[92%] sm:max-w-[85%]">
                {activeToolEvents.map((evt, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1e1e22] border border-slate-200 dark:border-zinc-700/60 text-xs text-slate-700 dark:text-zinc-300 shadow-xs animate-pulse"
                  >
                    {evt.type === 'rag' && <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                    {evt.type === 'tavily' && <Globe className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                    {evt.type === 'gmail' && <Mail className="w-3.5 h-3.5 text-red-500 shrink-0" />}
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
