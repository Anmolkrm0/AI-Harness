import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Shield,
  Key,
  Globe,
  Mail,
  Sparkles,
  HelpCircle,
  X,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { ServiceStatus, ServiceTestResult } from '../types';
import { api } from '../services/api';

interface SetupScreenProps {
  status: ServiceStatus | null;
  hasAnyModelConfigured: boolean;
  onContinue: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({
  status,
  hasAnyModelConfigured,
  onContinue,
  isModal = false,
  onClose,
}) => {
  // Form input states
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [xaiKey, setXaiKey] = useState('');
  const [tavilyKey, setTavilyKey] = useState('');

  // Gmail IMAP states
  const [gmailUser, setGmailUser] = useState(status?.gmail?.user || '');
  const [gmailPass, setGmailPass] = useState('');
  const [gmailHost, setGmailHost] = useState(status?.gmail?.host || 'imap.gmail.com');
  const [gmailPort, setGmailPort] = useState(status?.gmail?.port || '993');
  const [showAdvancedGmail, setShowAdvancedGmail] = useState(false);

  // Testing states
  const [testingService, setTestingService] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ServiceTestResult>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleTestService = async (serviceName: string) => {
    setTestingService(serviceName);
    setSaveMessage(null);

    let creds: Record<string, any> = {};
    if (serviceName === 'openai' && openaiKey) creds.apiKey = openaiKey;
    if (serviceName === 'anthropic' && anthropicKey) creds.apiKey = anthropicKey;
    if (serviceName === 'gemini' && geminiKey) creds.apiKey = geminiKey;
    if (serviceName === 'xai' && xaiKey) creds.apiKey = xaiKey;
    if (serviceName === 'tavily' && tavilyKey) creds.apiKey = tavilyKey;
    if (serviceName === 'gmail') {
      if (gmailUser) creds.user = gmailUser;
      if (gmailPass) creds.pass = gmailPass;
      creds.host = gmailHost;
      creds.port = gmailPort;
    }

    try {
      const result = await api.testConnection(serviceName, Object.keys(creds).length > 0 ? creds : undefined);
      setTestResults((prev) => ({ ...prev, [serviceName]: result }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [serviceName]: {
          service: serviceName,
          success: false,
          message: err.message || 'Connection test failed',
        },
      }));
    } finally {
      setTestingService(null);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const payload: Record<string, any> = {};
      if (openaiKey) payload.openai_key = openaiKey;
      if (anthropicKey) payload.anthropic_key = anthropicKey;
      if (geminiKey) payload.gemini_key = geminiKey;
      if (xaiKey) payload.xai_key = xaiKey;
      if (tavilyKey) payload.tavily_key = tavilyKey;

      if (gmailUser) payload.gmail_user = gmailUser;
      if (gmailPass) payload.gmail_pass = gmailPass;
      if (gmailHost) payload.gmail_host = gmailHost;
      if (gmailPort) payload.gmail_port = gmailPort;

      await api.saveSettings(payload);
      setSaveMessage('Credentials saved securely!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setSaveMessage(`Error saving: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndProceed = async () => {
    await handleSaveAll();
    onContinue();
  };

  const getServiceStatusBadge = (
    serviceName: 'openai' | 'anthropic' | 'gemini' | 'xai' | 'tavily' | 'gmail'
  ) => {
    const isConfigured = status?.[serviceName]?.isConfigured;
    const testRes = testResults[serviceName];

    if (testingService === serviceName) {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-[#5B50E6] dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Testing...
        </span>
      );
    }

    if (testRes) {
      if (testRes.success) {
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Verified {testRes.latencyMs ? `(${testRes.latencyMs}ms)` : ''}
          </span>
        );
      } else {
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            Failed
          </span>
        );
      }
    }

    if (isConfigured) {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Connected
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
        <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        Pending
      </span>
    );
  };

  return (
    <div className={`flex flex-col items-center justify-center p-2 sm:p-4 md:p-8 ${isModal ? 'w-full max-w-4xl' : 'min-h-screen bg-[#FAFBFD] dark:bg-[#0E0E12] text-slate-800 dark:text-zinc-100'}`}>
      <div className="w-full max-w-4xl bg-white dark:bg-[#16161a] rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 relative max-h-[92vh] overflow-y-auto">
        {/* Header */}
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-zinc-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Connect Services & API Keys
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
                  Configure your AI models, internet web search, and Gmail IMAP credentials.
                </p>
              </div>
            </div>
          </div>
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Security / Privacy Banner */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-indigo-50/80 dark:bg-sky-950/30 border border-indigo-200/80 dark:border-sky-800/40 text-slate-700 dark:text-sky-200 text-xs sm:text-sm">
          <Shield className="w-5 h-5 text-[#5B50E6] dark:text-sky-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900 dark:text-sky-300">Locally Secured:</span> All API keys and Gmail credentials are encrypted and stored locally in your SQLite database. Credentials never leave your machine except when contacting the respective provider API.
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {/* 1. OpenAI Card */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#1e1e24] border border-slate-200 dark:border-zinc-800/80 hover:border-indigo-300 dark:hover:border-zinc-700 transition-all space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  AI
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">OpenAI / ChatGPT</h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">GPT-4o, GPT-4o-mini, o3-mini</p>
                </div>
              </div>
              {getServiceStatusBadge('openai')}
            </div>

            <div className="space-y-1.5">
              <div className="relative">
                <input
                  type="password"
                  placeholder={status?.openai?.maskedKey || 'sk-... (Enter OpenAI API key)'}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  className="w-full bg-white dark:bg-[#141418] border border-slate-200 dark:border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-[#5B50E6]"
                />
              </div>
              {testResults.openai && (
                <p className={`text-[11px] ${testResults.openai.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {testResults.openai.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-slate-500 hover:text-[#5B50E6] dark:text-zinc-400 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
              >
                Get API Key <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => handleTestService('openai')}
                disabled={testingService === 'openai'}
                className="px-3 py-1 bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-transparent text-xs font-semibold rounded-lg transition-colors"
              >
                Test Connection
              </button>
            </div>
          </div>

          {/* 2. Anthropic Card */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#1e1e24] border border-slate-200 dark:border-zinc-800/80 hover:border-indigo-300 dark:hover:border-zinc-700 transition-all space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-xs">
                  CL
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Anthropic / Claude</h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">Claude 3.7 Sonnet, 3.5 Sonnet, Haiku</p>
                </div>
              </div>
              {getServiceStatusBadge('anthropic')}
            </div>

            <div className="space-y-1.5">
              <input
                type="password"
                placeholder={status?.anthropic?.maskedKey || 'sk-ant-... (Enter Anthropic API key)'}
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                className="w-full bg-white dark:bg-[#141418] border border-slate-200 dark:border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-[#5B50E6]"
              />
              {testResults.anthropic && (
                <p className={`text-[11px] ${testResults.anthropic.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {testResults.anthropic.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-slate-500 hover:text-[#5B50E6] dark:text-zinc-400 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
              >
                Get API Key <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => handleTestService('anthropic')}
                disabled={testingService === 'anthropic'}
                className="px-3 py-1 bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-transparent text-xs font-semibold rounded-lg transition-colors"
              >
                Test Connection
              </button>
            </div>
          </div>

          {/* 3. Google Gemini Card */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#1e1e24] border border-slate-200 dark:border-zinc-800/80 hover:border-indigo-300 dark:hover:border-zinc-700 transition-all space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-sky-500/10 border border-indigo-200 dark:border-sky-500/30 flex items-center justify-center text-[#5B50E6] dark:text-sky-400 font-bold text-xs">
                  GE
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Google Gemini</h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">Gemini 2.5 Pro, 2.5 Flash, 2.0 Flash</p>
                </div>
              </div>
              {getServiceStatusBadge('gemini')}
            </div>

            <div className="space-y-1.5">
              <input
                type="password"
                placeholder={status?.gemini?.maskedKey || 'AIzaSy... (Enter Gemini API key)'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full bg-white dark:bg-[#141418] border border-slate-200 dark:border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-[#5B50E6]"
              />
              {testResults.gemini && (
                <p className={`text-[11px] ${testResults.gemini.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {testResults.gemini.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-slate-500 hover:text-[#5B50E6] dark:text-zinc-400 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
              >
                Get API Key <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => handleTestService('gemini')}
                disabled={testingService === 'gemini'}
                className="px-3 py-1 bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-transparent text-xs font-semibold rounded-lg transition-colors"
              >
                Test Connection
              </button>
            </div>
          </div>

          {/* 4. xAI Grok Card */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#1e1e24] border border-slate-200 dark:border-zinc-800/80 hover:border-indigo-300 dark:hover:border-zinc-700 transition-all space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-500/10 border border-slate-200 dark:border-zinc-500/30 flex items-center justify-center text-slate-700 dark:text-zinc-300 font-bold text-xs">
                  X
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">xAI / Grok</h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">Grok 2, Grok Beta</p>
                </div>
              </div>
              {getServiceStatusBadge('xai')}
            </div>

            <div className="space-y-1.5">
              <input
                type="password"
                placeholder={status?.xai?.maskedKey || 'xai-... (Enter xAI API key)'}
                value={xaiKey}
                onChange={(e) => setXaiKey(e.target.value)}
                className="w-full bg-white dark:bg-[#141418] border border-slate-200 dark:border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-[#5B50E6]"
              />
              {testResults.xai && (
                <p className={`text-[11px] ${testResults.xai.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {testResults.xai.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <a
                href="https://console.x.ai/"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-slate-500 hover:text-[#5B50E6] dark:text-zinc-400 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
              >
                Get API Key <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => handleTestService('xai')}
                disabled={testingService === 'xai'}
                className="px-3 py-1 bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-transparent text-xs font-semibold rounded-lg transition-colors"
              >
                Test Connection
              </button>
            </div>
          </div>

          {/* 5. Tavily Search Card */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#1e1e24] border border-slate-200 dark:border-zinc-800/80 hover:border-indigo-300 dark:hover:border-zinc-700 transition-all space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-[#5B50E6] dark:text-indigo-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Tavily Web Search</h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">Live web browsing & citation grounding</p>
                </div>
              </div>
              {getServiceStatusBadge('tavily')}
            </div>

            <div className="space-y-1.5">
              <input
                type="password"
                placeholder={status?.tavily?.maskedKey || 'tvly-... (Enter Tavily API key)'}
                value={tavilyKey}
                onChange={(e) => setTavilyKey(e.target.value)}
                className="w-full bg-white dark:bg-[#141418] border border-slate-200 dark:border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-[#5B50E6]"
              />
              {testResults.tavily && (
                <p className={`text-[11px] ${testResults.tavily.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {testResults.tavily.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <a
                href="https://tavily.com/"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-slate-500 hover:text-[#5B50E6] dark:text-zinc-400 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
              >
                Get API Key <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => handleTestService('tavily')}
                disabled={testingService === 'tavily'}
                className="px-3 py-1 bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-transparent text-xs font-semibold rounded-lg transition-colors"
              >
                Test Connection
              </button>
            </div>
          </div>

          {/* 6. Gmail IMAP Card */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#1e1e24] border border-slate-200 dark:border-zinc-800/80 hover:border-indigo-300 dark:hover:border-zinc-700 transition-all space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 flex items-center justify-center text-red-500 dark:text-red-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Gmail Integration</h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">IMAP access to search & summarize emails</p>
                </div>
              </div>
              {getServiceStatusBadge('gmail')}
            </div>

            <div className="space-y-2">
              <input
                type="email"
                placeholder="your.email@gmail.com"
                value={gmailUser}
                onChange={(e) => setGmailUser(e.target.value)}
                className="w-full bg-white dark:bg-[#141418] border border-slate-200 dark:border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-[#5B50E6]"
              />
              <input
                type="password"
                placeholder={status?.gmail?.maskedPass || '16-character Google App Password (abcd efgh ijkl mnop)'}
                value={gmailPass}
                onChange={(e) => setGmailPass(e.target.value)}
                className="w-full bg-white dark:bg-[#141418] border border-slate-200 dark:border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-[#5B50E6]"
              />

              <button
                type="button"
                onClick={() => setShowAdvancedGmail(!showAdvancedGmail)}
                className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-300 flex items-center gap-1 font-medium"
              >
                {showAdvancedGmail ? 'Hide IMAP Settings' : 'Advanced IMAP Host/Port'}
              </button>

              {showAdvancedGmail && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Host (imap.gmail.com)"
                    value={gmailHost}
                    onChange={(e) => setGmailHost(e.target.value)}
                    className="bg-white dark:bg-[#141418] border border-slate-200 dark:border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-300"
                  />
                  <input
                    type="text"
                    placeholder="Port (993)"
                    value={gmailPort}
                    onChange={(e) => setGmailPort(e.target.value)}
                    className="bg-white dark:bg-[#141418] border border-slate-200 dark:border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-300"
                  />
                </div>
              )}

              {testResults.gmail && (
                <p className={`text-[11px] ${testResults.gmail.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {testResults.gmail.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-slate-500 hover:text-[#5B50E6] dark:text-zinc-400 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
                title="Requires 2-Step Verification enabled on Google Account"
              >
                Create App Password <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => handleTestService('gmail')}
                disabled={testingService === 'gmail'}
                className="px-3 py-1 bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-transparent text-xs font-semibold rounded-lg transition-colors"
              >
                Test Connection
              </button>
            </div>
          </div>
        </div>

        {/* Save message notice */}
        {saveMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs text-center font-medium">
            {saveMessage}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
          <div className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#5B50E6] animate-pulse"></span>
            Configure at least one AI provider (OpenAI, Claude, Gemini, or Grok) to start chatting.
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs sm:text-sm font-semibold transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Keys'}
            </button>

            <button
              onClick={handleSaveAndProceed}
              disabled={!hasAnyModelConfigured && !openaiKey && !anthropicKey && !geminiKey && !xaiKey}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl bg-[#5B50E6] hover:bg-[#4C40D4] text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span>{isModal ? 'Done & Return' : 'Launch Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


