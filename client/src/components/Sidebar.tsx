import React, { useState } from 'react';
import {
  Home,
  MessageSquarePlus,
  Search,
  History,
  FolderKanban,
  Bot,
  UserCircle,
  Settings,
  Trash2,
  Edit2,
  Check,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { Conversation, ServiceStatus, User } from '../types';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onOpenSettings: () => void;
  serviceStatus: ServiceStatus | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenLibrary?: () => void;
  onGoHome?: () => void;
  currentUser?: User | null;
  onLogout?: () => void;
  onOpenAuthModal?: () => void;
}

// AskFlow Iris Logo Component matching reference image
const AskFlowLogo = () => (
  <svg className="w-7 h-7 shrink-0" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="15" fill="url(#askflow-grad-bg)" />
    <path
      d="M16 6C16 11.5228 11.5228 16 6 16C11.5228 16 16 20.4772 16 26C16 20.4772 20.4772 16 26 16C20.4772 16 16 11.5228 16 6Z"
      fill="white"
      fillOpacity="0.95"
    />
    <defs>
      <linearGradient id="askflow-grad-bg" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="0.45" stopColor="#8B5CF6" />
        <stop offset="1" stopColor="#EC4899" />
      </linearGradient>
    </defs>
  </svg>
);

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onOpenSettings,
  serviceStatus,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenLibrary,
  onGoHome,
  currentUser,
  onLogout,
  onOpenAuthModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startEditing = (c: Conversation) => {
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const saveEditing = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  // Count active services
  let activeServiceCount = 0;
  if (serviceStatus?.openai?.isConfigured) activeServiceCount++;
  if (serviceStatus?.anthropic?.isConfigured) activeServiceCount++;
  if (serviceStatus?.gemini?.isConfigured) activeServiceCount++;
  if (serviceStatus?.xai?.isConfigured) activeServiceCount++;
  if (serviceStatus?.tavily?.isConfigured) activeServiceCount++;
  if (serviceStatus?.gmail?.isConfigured) activeServiceCount++;

  // Desktop Collapsed Icon Rail
  if (isCollapsed) {
    return (
      <div className="hidden md:flex w-16 h-full bg-white dark:bg-[#141418] border-r border-slate-200/80 dark:border-zinc-800/80 flex-col items-center py-4 space-y-4 shrink-0 select-none transition-colors">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>

        <button
          onClick={onGoHome}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            !activeConversationId
              ? 'bg-[#5B50E6] text-white shadow-md shadow-indigo-500/25'
              : 'text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
          title="Home"
        >
          <Home className="w-5 h-5" />
        </button>

        <button
          onClick={onNewChat}
          className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 flex items-center justify-center transition-all"
          title="New Chat"
        >
          <MessageSquarePlus className="w-5 h-5" />
        </button>

        <div className="flex-1 w-full overflow-y-auto flex flex-col items-center space-y-1.5 py-2 no-scrollbar">
          {conversations.slice(0, 10).map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectConversation(c.id)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                c.id === activeConversationId
                  ? 'bg-indigo-50 dark:bg-zinc-700 text-[#5B50E6] dark:text-indigo-400 font-bold'
                  : 'text-slate-400 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
              title={c.title}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          ))}
        </div>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors relative"
          title="Settings & Services"
        >
          <Settings className="w-5 h-5" />
          {activeServiceCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900"></span>
          )}
        </button>
      </div>
    );
  }

  // Full Expanded Sidebar Content
  const sidebarContent = (
    <div className="w-64 sm:w-72 h-full bg-white dark:bg-[#141418] border-r border-slate-200/80 dark:border-zinc-800/80 flex flex-col shrink-0 select-none text-slate-700 dark:text-zinc-200 transition-colors">
      {/* Top Header / Logo */}
      <div className="p-4 sm:p-5 flex items-center justify-between">
        <div
          onClick={onGoHome}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <AskFlowLogo />
          <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white group-hover:opacity-90 transition-opacity">
            AI Harness
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
            title="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Navigation Items matching AskFlow design */}
      <div className="px-3.5 space-y-1 pb-3">
        {/* Home Pill */}
        <button
          onClick={() => {
            onGoHome?.();
            onCloseMobile();
          }}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            !activeConversationId
              ? 'bg-[#5B50E6] text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/70'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </button>

        {/* New Chats */}
        <button
          onClick={() => {
            onNewChat();
            onCloseMobile();
          }}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/70 transition-colors group"
        >
          <MessageSquarePlus className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
          <span>New Chats</span>
        </button>

        {/* Search */}
        <button
          onClick={() => setShowSearchInput(!showSearchInput)}
          className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
            showSearchInput
              ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white'
              : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/70'
          }`}
        >
          <div className="flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400" />
            <span>Search</span>
          </div>
          {searchQuery && (
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-semibold">
              {filteredConversations.length}
            </span>
          )}
        </button>

        {/* Search input field if open */}
        {showSearchInput && (
          <div className="pt-1 pb-1 px-1">
            <input
              type="text"
              placeholder="Search chat history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full bg-slate-50 dark:bg-[#1c1c22] border border-slate-200 dark:border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-[#5B50E6]"
            />
          </div>
        )}

        {/* History Toggle */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/70 transition-colors"
        >
          <div className="flex items-center gap-3">
            <History className="w-4 h-4 text-slate-400" />
            <span>History</span>
          </div>
          <span className="text-xs text-slate-400 dark:text-zinc-500 font-mono">
            {conversations.length}
          </span>
        </button>

        {/* Library (RAG Documents) */}
        <button
          onClick={() => {
            onOpenLibrary?.();
            onCloseMobile();
          }}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/70 transition-colors group"
        >
          <FolderKanban className="w-4 h-4 text-slate-400 group-hover:text-sky-500 transition-colors" />
          <span>Library</span>
        </button>

        {/* GPTs / AI Models */}
        <button
          onClick={() => {
            onOpenSettings();
            onCloseMobile();
          }}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/70 transition-colors group"
        >
          <Bot className="w-4 h-4 text-slate-400 group-hover:text-purple-500 transition-colors" />
          <span>GPTs & Models</span>
        </button>
      </div>

      {/* History / Conversations List */}
      {showHistory && (
        <div className="flex-1 overflow-y-auto px-3.5 space-y-0.5 border-t border-slate-100 dark:border-zinc-800/70 pt-3">
          <div className="px-2 py-1 text-[11px] font-bold text-slate-400 dark:text-zinc-500 tracking-wider uppercase">
            Recent Chats
          </div>

          {filteredConversations.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400 dark:text-zinc-500">
              {searchQuery ? 'No chats found' : 'No chats yet'}
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isActive = c.id === activeConversationId;
              const isEditing = c.id === editingId;

              return (
                <div
                  key={c.id}
                  className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-zinc-800/90 text-[#5B50E6] dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditing(c.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="flex-1 bg-white dark:bg-zinc-900 border border-indigo-500 rounded px-2 py-1 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                      <button
                        onClick={() => saveEditing(c.id)}
                        className="p-1 text-emerald-600 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          onSelectConversation(c.id);
                          onCloseMobile();
                        }}
                        className="flex items-center gap-2 overflow-hidden text-left flex-1"
                      >
                        <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#5B50E6] dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-500'}`} />
                        <span className="truncate pr-1">{c.title}</span>
                      </button>

                      <div className="flex items-center gap-0.5 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(c);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(c.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Bottom Nav matching AskFlow design: Account & Settings */}
      <div className="p-3 border-t border-slate-200/80 dark:border-zinc-800/80 space-y-1">
        {/* Account Button / User Profile */}
        {currentUser ? (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/70 transition-colors group">
            <div className="flex items-center gap-2.5 min-w-0 pr-1">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm">
                {(currentUser.name?.[0] || currentUser.email[0] || 'U').toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold truncate text-slate-800 dark:text-zinc-200 leading-tight">
                  {currentUser.name || currentUser.email.split('@')[0]}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 truncate leading-tight">
                  {currentUser.email}
                </span>
              </div>
            </div>
            {onLogout && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLogout();
                }}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              onOpenAuthModal?.();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/70 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <UserCircle className="w-4 h-4 text-slate-400 dark:text-zinc-400" />
              <span className="text-xs sm:text-sm">Sign In</span>
            </div>
            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">
              Login
            </span>
          </button>
        )}

        {/* Settings Button */}
        <button
          onClick={() => {
            onOpenSettings();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/70 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-slate-400 dark:text-zinc-400" />
            <span className="text-xs sm:text-sm">Settings</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 dark:text-zinc-500">
              {activeServiceCount}/6
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                activeServiceCount > 0 ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            ></span>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop view */}
      <div className="hidden md:flex h-full">{sidebarContent}</div>

      {/* Mobile Drawer with Backdrop */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
