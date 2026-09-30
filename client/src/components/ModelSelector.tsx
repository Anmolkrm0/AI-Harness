import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Eye } from 'lucide-react';
import { ModelInfo, ProviderType } from '../types';

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  onOpenSettings: () => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModelId,
  onSelectModel,
  onOpenSettings,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedModel = models.find((m) => m.id === selectedModelId) || models[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getProviderColor = (provider: ProviderType) => {
    switch (provider) {
      case 'openai':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/30';
      case 'anthropic':
        return 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/30';
      case 'gemini':
        return 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-sky-400 dark:bg-sky-500/10 dark:border-sky-500/30';
      case 'xai':
        return 'text-slate-700 bg-slate-100 border-slate-200 dark:text-zinc-200 dark:bg-zinc-500/10 dark:border-zinc-500/30';
    }
  };

  const getProviderLabel = (provider: ProviderType) => {
    switch (provider) {
      case 'openai':
        return 'OpenAI';
      case 'anthropic':
        return 'Anthropic';
      case 'gemini':
        return 'Google';
      case 'xai':
        return 'xAI';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800/90 hover:bg-slate-50 dark:hover:bg-zinc-700/80 border border-slate-200/90 dark:border-zinc-700/60 text-slate-800 dark:text-white text-xs sm:text-sm font-semibold transition-all shadow-xs max-w-[200px] sm:max-w-none"
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
              selectedModel ? getProviderColor(selectedModel.provider) : ''
            }`}
          >
            {selectedModel ? getProviderLabel(selectedModel.provider) : 'AI'}
          </span>
          <span className="font-semibold text-slate-800 dark:text-zinc-100 truncate text-xs sm:text-sm">
            {selectedModel?.name || 'Select Model'}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 dark:text-zinc-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Backdrop overlay prevents click-through, closes dropdown on click outside, and dims overlapping screen content */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        />
      )}

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-[calc(100vw-32px)] sm:w-96 max-w-sm max-h-[75vh] flex flex-col rounded-2xl bg-white dark:bg-[#18181D] border border-slate-200/90 dark:border-zinc-800 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
          {/* Header bar pinned to top so it never scrolls away or gets cut off */}
          <div className="px-4 py-3 bg-slate-50/90 dark:bg-zinc-850 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              SWITCH AI MODEL
            </span>
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="text-[#5B50E6] dark:text-indigo-400 hover:underline text-xs font-semibold"
            >
              Configure Keys
            </button>
          </div>

          {/* Scrollable list of models */}
          <div className="overflow-y-auto p-2 space-y-1 divide-y divide-slate-100/60 dark:divide-zinc-800/60 overscroll-contain">
            {models.map((model) => {
              const isSelected = model.id === selectedModelId;
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start justify-between p-2.5 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-indigo-50/90 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30'
                      : 'hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 border border-transparent'
                  }`}
                >
                  <div className="space-y-1 pr-2 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 ${getProviderColor(
                          model.provider
                        )}`}
                      >
                        {getProviderLabel(model.provider)}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {model.name}
                      </span>
                      {model.supportsVision && (
                        <span title="Supports Vision / Images" className="text-slate-400 dark:text-zinc-400 shrink-0">
                          <Eye className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                      {model.description}
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      {model.isConfigured ? (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Ready
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400/90 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Needs Key
                        </span>
                      )}
                      {model.contextWindow && (
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                          {(model.contextWindow / 1000).toFixed(0)}k context
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-[#5B50E6] dark:text-indigo-400 shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
