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
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'anthropic':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'gemini':
        return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
      case 'xai':
        return 'text-zinc-200 bg-zinc-500/10 border-zinc-500/30';
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
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 text-white text-xs sm:text-sm font-medium transition-all shadow-sm max-w-[200px] sm:max-w-none"
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider border shrink-0 ${
              selectedModel ? getProviderColor(selectedModel.provider) : ''
            }`}
          >
            {selectedModel ? getProviderLabel(selectedModel.provider) : 'AI'}
          </span>
          <span className="font-semibold text-zinc-100 truncate text-xs sm:text-sm">
            {selectedModel?.name || 'Select Model'}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-[calc(100vw-32px)] sm:w-80 max-w-sm max-h-96 overflow-y-auto rounded-2xl bg-[#1e1e22] border border-zinc-700/80 shadow-2xl p-2 z-50 divide-y divide-zinc-800 backdrop-blur-md">
          <div className="px-3 py-2 text-xs font-semibold text-zinc-400 flex items-center justify-between">
            <span>SWITCH MODEL FOR THIS CHAT</span>
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="text-sky-400 hover:text-sky-300 text-[11px] underline"
            >
              API Keys
            </button>
          </div>

          <div className="py-1 space-y-1">
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
                    isSelected ? 'bg-sky-500/10 border border-sky-500/30' : 'hover:bg-zinc-800/70 border border-transparent'
                  }`}
                >
                  <div className="space-y-1 pr-2 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border shrink-0 ${getProviderColor(
                          model.provider
                        )}`}
                      >
                        {getProviderLabel(model.provider)}
                      </span>
                      <span className="text-sm font-semibold text-white truncate">{model.name}</span>
                      {model.supportsVision && (
                        <span title="Supports Vision / Images" className="text-zinc-400 shrink-0">
                          <Eye className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-1">{model.description}</p>
                    <div className="flex items-center gap-2 pt-0.5">
                      {model.isConfigured ? (
                        <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Ready
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400/90 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Needs Key
                        </span>
                      )}
                      {model.contextWindow && (
                        <span className="text-[10px] text-zinc-500">
                          {(model.contextWindow / 1000).toFixed(0)}k context
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-sky-400 shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
