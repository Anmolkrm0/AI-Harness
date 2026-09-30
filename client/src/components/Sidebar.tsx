import React, { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Settings,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
} from 'lucide-react';
import { Conversation, ServiceStatus } from '../types';

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
}

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
}) => {
  const [searchQuery, setSearchQuery] = useState('');
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

  // Desktop collapsed view
  if (isCollapsed) {
    return (
      <div className="hidden md:flex w-16 h-full bg-[#18181b] border-r border-zinc-800 flex-col items-center py-4 space-y-4 shrink-0 select-none">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>

        <button
          onClick={onNewChat}
          className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 hover:scale-105 transition-all"
          title="New Chat"
        >
          <Plus className="w-5 h-5" />
        </button>

        <div className="flex-1 w-full overflow-y-auto flex flex-col items-center space-y-2 py-2">
          {conversations.slice(0, 10).map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectConversation(c.id)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                c.id === activeConversationId
                  ? 'bg-zinc-700 text-sky-400'
                  : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
              }`}
              title={c.title}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          ))}
        </div>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors relative"
          title="Settings & Services"
        >
          <Settings className="w-5 h-5" />
          {activeServiceCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400"></span>
          )}
        </button>
      </div>
    );
  }

  const sidebarContent = (
    <div className="w-72 h-full bg-[#18181b] border-r border-zinc-800 flex flex-col shrink-0 select-none">
      {/* Top Header */}
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white">AI Harness</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={() => {
            onNewChat();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-white text-sm font-medium border border-zinc-700/60 shadow-sm transition-all group"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
            <span>New Chat</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">⌘K</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1e1e22] border border-zinc-700/40 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500/50"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        <div className="px-2 py-1 text-[11px] font-semibold text-zinc-500 tracking-wider">
          CHATS
        </div>

        {filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-500">
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
                    ? 'bg-zinc-800 text-white font-medium'
                    : 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200'
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
                      className="flex-1 bg-zinc-900 border border-sky-500 rounded px-2 py-1 text-xs text-white focus:outline-none"
                    />
                    <button
                      onClick={() => saveEditing(c.id)}
                      className="p-1 text-emerald-400 hover:bg-zinc-700 rounded"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1 text-zinc-400 hover:bg-zinc-700 rounded"
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
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                      <span className="truncate pr-1">{c.title}</span>
                    </button>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(c);
                        }}
                        className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(c.id);
                        }}
                        className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-zinc-700 rounded transition-colors"
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

      {/* Bottom Services & Settings bar */}
      <div className="p-3 border-t border-zinc-800/80 bg-[#161618]">
        <button
          onClick={() => {
            onOpenSettings();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/40 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-700/60 flex items-center justify-center text-zinc-300">
              <Settings className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-white">Settings & Keys</p>
              <p className="text-[10px] text-zinc-400">
                {activeServiceCount} of 6 services connected
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                activeServiceCount > 0 ? 'bg-emerald-400' : 'bg-amber-400'
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
