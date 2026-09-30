import { Router } from 'express';
import { dbService } from '../db/index.js';
import { ConnectionTester } from '../services/testConnection.js';
import { ModelRegistry } from '../services/providers/registry.js';

export const settingsRouter = Router();

function maskSecret(val: string | null): string {
  if (!val) return '';
  if (val.length <= 8) return '••••••••';
  return val.slice(0, 3) + '••••••••' + val.slice(-4);
}

// GET current settings status
settingsRouter.get('/', (req, res) => {
  const all = dbService.getAllSettings();

  const status = {
    openai: {
      isConfigured: !!all.openai_key,
      maskedKey: maskSecret(all.openai_key),
    },
    anthropic: {
      isConfigured: !!all.anthropic_key,
      maskedKey: maskSecret(all.anthropic_key),
    },
    gemini: {
      isConfigured: !!all.gemini_key,
      maskedKey: maskSecret(all.gemini_key),
    },
    xai: {
      isConfigured: !!all.xai_key,
      maskedKey: maskSecret(all.xai_key),
    },
    tavily: {
      isConfigured: !!all.tavily_key,
      maskedKey: maskSecret(all.tavily_key),
    },
    gmail: {
      isConfigured: !!all.gmail_user && !!all.gmail_pass,
      user: all.gmail_user || '',
      maskedPass: maskSecret(all.gmail_pass),
      host: all.gmail_host || 'imap.gmail.com',
      port: all.gmail_port || '993',
    },
  };

  res.json({
    status,
    hasAnyModelConfigured: !!(all.openai_key || all.anthropic_key || all.gemini_key || all.xai_key),
  });
});

// POST update settings
settingsRouter.post('/', (req, res) => {
  const { openai_key, anthropic_key, gemini_key, xai_key, tavily_key, gmail_user, gmail_pass, gmail_host, gmail_port } = req.body;

  if (openai_key !== undefined) {
    if (openai_key.trim()) dbService.setSetting('openai_key', openai_key.trim());
    else dbService.deleteSetting('openai_key');
  }

  if (anthropic_key !== undefined) {
    if (anthropic_key.trim()) dbService.setSetting('anthropic_key', anthropic_key.trim());
    else dbService.deleteSetting('anthropic_key');
  }

  if (gemini_key !== undefined) {
    if (gemini_key.trim()) dbService.setSetting('gemini_key', gemini_key.trim());
    else dbService.deleteSetting('gemini_key');
  }

  if (xai_key !== undefined) {
    if (xai_key.trim()) dbService.setSetting('xai_key', xai_key.trim());
    else dbService.deleteSetting('xai_key');
  }

  if (tavily_key !== undefined) {
    if (tavily_key.trim()) dbService.setSetting('tavily_key', tavily_key.trim());
    else dbService.deleteSetting('tavily_key');
  }

  if (gmail_user !== undefined) {
    if (gmail_user.trim()) dbService.setSetting('gmail_user', gmail_user.trim());
    else dbService.deleteSetting('gmail_user');
  }

  if (gmail_pass !== undefined) {
    if (gmail_pass.trim()) dbService.setSetting('gmail_pass', gmail_pass.trim());
    else dbService.deleteSetting('gmail_pass');
  }

  if (gmail_host !== undefined) {
    dbService.setSetting('gmail_host', gmail_host.trim() || 'imap.gmail.com');
  }

  if (gmail_port !== undefined) {
    dbService.setSetting('gmail_port', String(gmail_port).trim() || '993');
  }

  res.json({ success: true, message: 'Settings saved successfully.' });
});

// POST test connection for a service
settingsRouter.post('/test', async (req, res) => {
  const { service, credentials } = req.body;

  if (!service) {
    return res.status(400).json({ success: false, message: 'Service name is required' });
  }

  // If credentials not passed explicitly, load stored credentials from DB
  const credsToTest: Record<string, any> = { ...credentials };
  if (!credsToTest.apiKey) {
    if (service === 'openai') credsToTest.apiKey = dbService.getSetting('openai_key');
    if (service === 'anthropic') credsToTest.apiKey = dbService.getSetting('anthropic_key');
    if (service === 'gemini') credsToTest.apiKey = dbService.getSetting('gemini_key');
    if (service === 'xai') credsToTest.apiKey = dbService.getSetting('xai_key');
    if (service === 'tavily') credsToTest.apiKey = dbService.getSetting('tavily_key');
  }
  if (service === 'gmail') {
    if (!credsToTest.user) credsToTest.user = dbService.getSetting('gmail_user');
    if (!credsToTest.pass) credsToTest.pass = dbService.getSetting('gmail_pass');
    if (!credsToTest.host) credsToTest.host = dbService.getSetting('gmail_host') || 'imap.gmail.com';
    if (!credsToTest.port) credsToTest.port = dbService.getSetting('gmail_port') || '993';
  }

  try {
    const result = await ConnectionTester.testService(service, credsToTest);
    res.json(result);
  } catch (err: any) {
    res.json({
      service,
      success: false,
      message: err.message || 'Connection test failed',
    });
  }
});

// GET all models with configured status
settingsRouter.get('/models', (req, res) => {
  const models = ModelRegistry.getAvailableModels();
  res.json(models);
});
