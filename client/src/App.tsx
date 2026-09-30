import { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Database,
  Menu,
  Sun,
  Moon,
  Plus,
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  Conversation,
  DocumentRecord,
  Message,
  ModelInfo,
  ServiceStatus,
  ToolEvent,
  User,
} from './types';
import { api } from './services/api';
import { Sidebar } from './components/Sidebar';
import { SetupScreen } from './components/SetupScreen';
import { ModelSelector } from './components/ModelSelector';
import { ChatArea } from './components/ChatArea';
import { ChatInput } from './components/ChatInput';
import { DocumentDrawer } from './components/DocumentDrawer';
import { AuthModal } from './components/AuthModal';

export function App() {
  // Authentication & multi-user state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Theme state ('light' | 'dark')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('gemini-flash-latest');

  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
  const [hasAnyModelConfigured, setHasAnyModelConfigured] = useState<boolean>(false);
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [isFirstVisit, setIsFirstVisit] = useState<boolean>(false);

  const [isDocumentDrawerOpen, setIsDocumentDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [isStreaming, setIsStreaming] = useState(false);
  const [activeToolEvents, setActiveToolEvents] = useState<ToolEvent[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [evaluatingMessageId, setEvaluatingMessageId] = useState<string | null>(null);
  const [improvingMessageId, setImprovingMessageId] = useState<string | null>(null);

  // Sync theme changes with DOM and localStorage
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Verify authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsAuthLoading(true);
    try {
      const user = await api.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        await loadUserData();
      } else {
        setCurrentUser(null);
        setShowAuthModal(true);
      }
    } catch (err) {
      console.error('Auth verification error:', err);
      setCurrentUser(null);
      setShowAuthModal(true);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const loadUserData = async () => {
    await Promise.all([
      loadSettings(),
      loadModels(),
      loadConversations(),
      loadDocuments(),
    ]);
  };

  const handleAuthSuccess = async (user: User) => {
    setCurrentUser(user);
    setShowAuthModal(false);
    await loadUserData();
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setConversations([]);
    setActiveConversationId(null);
    setMessages([]);
    setDocuments([]);
    setServiceStatus(null);
    setHasAnyModelConfigured(false);
    setShowAuthModal(true);
  };

  const loadSettings = async () => {
    try {
      const res = await api.getSettings();
      setServiceStatus(res.status);
      setHasAnyModelConfigured(res.hasAnyModelConfigured);

      if (!res.hasAnyModelConfigured) {
        setIsFirstVisit(true);
      } else {
        setIsFirstVisit(false);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const loadModels = async () => {
    try {
      const res = await api.getModels();
      setModels(res);

      // Prioritize active working models (Gemini Flash or Claude Sonnet 5.5)
      const activeGemini = res.find((m) => m.id === 'gemini-flash-latest' && m.isConfigured);
      const activeClaude = res.find((m) => m.id === 'claude-sonnet-5-5' && m.isConfigured);
      const anyConfigured = res.find((m) => m.isConfigured);

      if (activeGemini) {
        setSelectedModelId(activeGemini.id);
      } else if (activeClaude) {
        setSelectedModelId(activeClaude.id);
      } else if (anyConfigured) {
        setSelectedModelId(anyConfigured.id);
      }
    } catch (err) {
      console.error('Failed to load models:', err);
    }
  };

  const loadConversations = async () => {
    try {
      const list = await api.getConversations();
      setConversations(list);
      if (list.length > 0 && !activeConversationId) {
        selectConversation(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadDocuments = async () => {
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const selectConversation = async (id: string) => {
    setActiveConversationId(id);
    try {
      const res = await api.getConversation(id);
      // Filter out any blank assistant bubbles
      const cleanMessages = res.messages.filter(
        (m) => m.role === 'user' || (m.role === 'assistant' && m.content.trim().length > 0)
      );
      setMessages(cleanMessages);

      // Resolve valid model ID
      if (res.conversation.model) {
        setSelectedModelId(res.conversation.model);
      }
    } catch (err) {
      console.error('Failed to load conversation details:', err);
    }
  };

  const handleNewChat = async () => {
    try {
      const conv = await api.createConversation('New Conversation', selectedModelId);
      setConversations((prev) => [conv, ...prev]);
      setActiveConversationId(conv.id);
      setMessages([]);
    } catch (err) {
      console.error('Failed to create new conversation:', err);
    }
  };

  const handleModelChange = async (newModelId: string) => {
    setSelectedModelId(newModelId);
    if (activeConversationId) {
      try {
        await api.updateConversation(activeConversationId, { model: newModelId });
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConversationId ? { ...c, model: newModelId } : c))
        );
      } catch (err) {
        console.error('Failed to update conversation model:', err);
      }
    }
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      await api.updateConversation(id, { title: newTitle });
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
      );
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        const remaining = conversations.filter((c) => c.id !== id);
        if (remaining.length > 0) {
          selectConversation(remaining[0].id);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleSendMessage = async (
    userText: string,
    options: {
      enableWeb: boolean;
      enableGmail: boolean;
      enableJudge?: boolean;
      attachments: DocumentRecord[];
    }
  ) => {
    let convId = activeConversationId;

    // Create a new conversation if none selected
    if (!convId) {
      try {
        const title = userText.slice(0, 30) || 'New Conversation';
        const newConv = await api.createConversation(title, selectedModelId);
        convId = newConv.id;
        setActiveConversationId(convId);
        setConversations((prev) => [newConv, ...prev]);
      } catch (err) {
        console.error('Failed to create conversation:', err);
        return;
      }
    } else {
      // If this was a default titled conversation and it's the first message, rename it nicely
      const currentConv = conversations.find((c) => c.id === convId);
      if (currentConv && currentConv.title === 'New Conversation' && messages.length === 0) {
        const newTitle = userText.slice(0, 35);
        handleRenameConversation(convId, newTitle);
      }
    }

    const tempUserMsgId = `user-${Date.now()}`;
    const userMsg: Message = {
      id: tempUserMsgId,
      conversation_id: convId,
      role: 'user',
      content: userText,
      attachments: options.attachments,
      created_at: Date.now(),
    };

    const tempAssistantMsgId = `asst-${Date.now()}`;
    const initialAssistantMsg: Message = {
      id: tempAssistantMsgId,
      conversation_id: convId,
      role: 'assistant',
      content: '',
      model_used: selectedModelId,
      created_at: Date.now(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    setIsStreaming(true);
    setActiveToolEvents([]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await api.streamChat(
        {
          conversationId: convId,
          message: userText,
          model: selectedModelId,
          enableWeb: options.enableWeb,
          enableGmail: options.enableGmail,
          enableJudge: options.enableJudge,
          attachments: options.attachments,
        },
        {
          onInit: (data) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantMsgId
                  ? {
                      ...m,
                      id: data.assistantMessageId,
                      model_used: data.model,
                      provider_used: data.provider,
                    }
                  : m
              )
            );
          },
          onToolEvent: (event) => {
            setActiveToolEvents((prev) => [...prev, event]);
          },
          onToken: (token) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.role === 'assistant' && (m.id === tempAssistantMsgId || m.isStreaming)
                  ? { ...m, content: m.content + token }
                  : m
              )
            );
          },
          onDone: (data) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.role === 'assistant' && (m.id === data.messageId || m.isStreaming)
                  ? {
                      ...m,
                      id: data.messageId,
                      content: data.content || m.content,
                      model_used: data.model_used,
                      provider_used: data.provider_used,
                      tool_calls: data.tool_calls,
                      suggested_questions: data.suggested_questions,
                      judge_evaluation: data.judge_evaluation,
                      isStreaming: false,
                    }
                  : m
              )
            );
            setIsStreaming(false);
            setActiveToolEvents([]);
          },
          onError: (errMsg) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.role === 'assistant' && (m.id === tempAssistantMsgId || m.isStreaming)
                  ? {
                      ...m,
                      content: errMsg,
                      isStreaming: false,
                    }
                  : m
              )
            );
            setIsStreaming(false);
            setActiveToolEvents([]);
          },
        },
        controller.signal
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Streaming failed:', err);
        setMessages((prev) =>
          prev.map((m) =>
            m.isStreaming
              ? {
                  ...m,
                  content: `⚠️ **Connection Error:** ${err.message}`,
                  isStreaming: false,
                }
              : m
          )
        );
      }
      setIsStreaming(false);
      setActiveToolEvents([]);
    }
  };

  const handleEvaluateJudge = async (messageId: string) => {
    if (!activeConversationId || evaluatingMessageId) return;
    setEvaluatingMessageId(messageId);
    try {
      const res = await api.evaluateMessage(messageId, activeConversationId);
      if (res.evaluation) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, judge_evaluation: res.evaluation } : m
          )
        );
      }
    } catch (err: any) {
      console.error('Judge evaluation failed:', err);
      alert(`Judge evaluation failed: ${err.message}`);
    } finally {
      setEvaluatingMessageId(null);
    }
  };

  const handleImproveMessage = async (messageId: string) => {
    if (!activeConversationId || improvingMessageId) return;
    setImprovingMessageId(messageId);
    try {
      const res = await api.improveMessage(messageId, activeConversationId, selectedModelId);
      if (res.improvedContent) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  content: res.improvedContent,
                  judge_evaluation: res.judge_evaluation,
                }
              : m
          )
        );
      }
    } catch (err: any) {
      console.error('Improve message failed:', err);
      alert(`Failed to improve response: ${err.message}`);
    } finally {
      setImprovingMessageId(null);
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setActiveToolEvents([]);
      setMessages((prev) =>
        prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
      );
    }
  };

  const handleRegenerate = (msgIndex: number) => {
    const assistantMsg = messages[msgIndex];
    if (!assistantMsg || assistantMsg.role !== 'assistant') return;

    let userMsg: Message | null = null;
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMsg = messages[i];
        break;
      }
    }

    if (!userMsg) return;

    setMessages((prev) => prev.slice(0, msgIndex));
    handleSendMessage(userMsg.content, {
      enableWeb: false,
      enableGmail: false,
      attachments: (userMsg.attachments as DocumentRecord[]) || [],
    });
  };

  // While verifying session, show clean loading screen
  if (isAuthLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FAFBFD] dark:bg-[#0E0E12] text-slate-800 dark:text-zinc-200">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4 animate-pulse">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
          AI Harness
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
          <span>Initializing secure workspace...</span>
        </div>
      </div>
    );
  }

  // If not logged in, show AuthModal gate
  if (!currentUser) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#FAFBFD] dark:bg-[#0E0E12]">
        <AuthModal
          isOpen={true}
          onSuccess={handleAuthSuccess}
          canDismiss={false}
        />
      </div>
    );
  }

  // If first visit and no models configured, show onboarding setup page for this user
  if (isFirstVisit && !hasAnyModelConfigured) {
    return (
      <SetupScreen
        status={serviceStatus}
        hasAnyModelConfigured={hasAnyModelConfigured}
        onContinue={() => {
          setIsFirstVisit(false);
          loadSettings();
          loadModels();
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FAFBFD] dark:bg-[#0E0E12] text-slate-900 dark:text-zinc-100 font-sans transition-colors">
      {/* Responsive Sidebar (Collapsible desktop rail, Drawer mobile) */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={selectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onOpenSettings={() => setShowSetupModal(true)}
        serviceStatus={serviceStatus}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenLibrary={() => setIsDocumentDrawerOpen(true)}
        onGoHome={() => {
          setActiveConversationId(null);
          setMessages([]);
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAuthModal={() => setShowAuthModal(true)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header Bar matching AskFlow design */}
        <header className="h-14 border-b border-slate-200/80 dark:border-zinc-800/80 px-3 sm:px-6 flex items-center justify-between bg-white/80 dark:bg-[#141418]/80 backdrop-blur-md shrink-0 relative z-30 transition-colors">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
              title="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Dynamic Model Selector Dropdown */}
            <ModelSelector
              models={models}
              selectedModelId={selectedModelId}
              onSelectModel={handleModelChange}
              onOpenSettings={() => setShowSetupModal(true)}
            />
          </div>

          {/* Right Header Controls matching AskFlow */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Quick "+ New Chats" button matching reference */}
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs sm:text-sm font-semibold shadow-2xs transition-all"
              title="Start a new chat"
            >
              <Plus className="w-3.5 h-3.5 text-[#5B50E6] dark:text-indigo-400" />
              <span className="hidden xs:inline sm:inline">New Chats</span>
            </button>

            {/* Document RAG count pill */}
            <button
              onClick={() => setIsDocumentDrawerOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/70 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700/50 text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-colors"
              title="View & upload documents for RAG"
            >
              <Database className="w-3.5 h-3.5 text-[#5B50E6] dark:text-sky-400 shrink-0" />
              <span>{documents.length}</span>
              <span className="hidden sm:inline">Docs</span>
            </button>

            {/* Dark / Light Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* Settings & Credentials Launcher */}
            <button
              onClick={() => setShowSetupModal(true)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
              title="Configure API Keys & Services"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* User Profile Avatar */}
            <div
              onClick={() => setShowAuthModal(true)}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 border border-indigo-400/30 flex items-center justify-center text-xs font-bold text-white shadow-2xs select-none cursor-pointer hover:scale-105 transition-transform"
              title={currentUser ? `${currentUser.name || currentUser.email} (Click to switch account)` : 'Sign In'}
            >
              {(currentUser?.name?.[0] || currentUser?.email?.[0] || 'U').toUpperCase()}
            </div>
          </div>
        </header>

        {/* Chat Message Stream */}
        <ChatArea
          messages={messages}
          models={models}
          isStreaming={isStreaming}
          activeToolEvents={activeToolEvents}
          onPromptSuggestion={(text) =>
            handleSendMessage(text, { enableWeb: true, enableGmail: true, enableJudge: false, attachments: [] })
          }
          onRegenerate={handleRegenerate}
          onEvaluateJudge={handleEvaluateJudge}
          onImproveMessage={handleImproveMessage}
          evaluatingMessageId={evaluatingMessageId}
          improvingMessageId={improvingMessageId}
        />

        {/* Input Bar */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isStreaming={isStreaming}
          onStopStreaming={handleStopStreaming}
          conversationId={activeConversationId || undefined}
          onDocumentUploaded={(doc) => {
            setDocuments((prev) => [doc, ...prev]);
          }}
        />
      </div>

      {/* Document RAG Slide-over Drawer */}
      <DocumentDrawer
        isOpen={isDocumentDrawerOpen}
        onClose={() => setIsDocumentDrawerOpen(false)}
        documents={documents}
        conversationId={activeConversationId || undefined}
        onDocumentUploaded={(doc) => setDocuments((prev) => [doc, ...prev])}
        onDocumentDeleted={(id) => setDocuments((prev) => prev.filter((d) => d.id !== id))}
      />

      {/* Connect Services / Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 dark:bg-black/75 backdrop-blur-sm overflow-y-auto">
          <SetupScreen
            status={serviceStatus}
            hasAnyModelConfigured={hasAnyModelConfigured}
            onContinue={() => {
              setShowSetupModal(false);
              loadSettings();
              loadModels();
            }}
            isModal={true}
            onClose={() => {
              setShowSetupModal(false);
              loadSettings();
              loadModels();
            }}
          />
        </div>
      )}

      {/* Account / Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        canDismiss={!!currentUser}
      />
    </div>
  );
}

export default App;
