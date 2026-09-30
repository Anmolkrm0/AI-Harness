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

// GET current settings status for authenticated user
settingsRouter.get('/', (req, res) => {
  const userId = req.user?.id;
  const all = userId ? dbService.getUserSettings(userId) : dbService.getAllSettings();

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

// POST update settings for authenticated user
settingsRouter.post('/', (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { openai_key, anthropic_key, gemini_key, xai_key, tavily_key, gmail_user, gmail_pass, gmail_host, gmail_port } = req.body;

  if (openai_key !== undefined) {
    if (openai_key.trim()) dbService.setUserSetting(userId, 'openai_key', openai_key.trim());
    else dbService.deleteUserSetting(userId, 'openai_key');
  }

  if (anthropic_key !== undefined) {
    if (anthropic_key.trim()) dbService.setUserSetting(userId, 'anthropic_key', anthropic_key.trim());
    else dbService.deleteUserSetting(userId, 'anthropic_key');
  }

  if (gemini_key !== undefined) {
    if (gemini_key.trim()) dbService.setUserSetting(userId, 'gemini_key', gemini_key.trim());
    else dbService.deleteUserSetting(userId, 'gemini_key');
  }

  if (xai_key !== undefined) {
    if (xai_key.trim()) dbService.setUserSetting(userId, 'xai_key', xai_key.trim());
    else dbService.deleteUserSetting(userId, 'xai_key');
  }

  if (tavily_key !== undefined) {
    if (tavily_key.trim()) dbService.setUserSetting(userId, 'tavily_key', tavily_key.trim());
    else dbService.deleteUserSetting(userId, 'tavily_key');
  }

  if (gmail_user !== undefined) {
    if (gmail_user.trim()) dbService.setUserSetting(userId, 'gmail_user', gmail_user.trim());
    else dbService.deleteUserSetting(userId, 'gmail_user');
  }

  if (gmail_pass !== undefined) {
    if (gmail_pass.trim()) dbService.setUserSetting(userId, 'gmail_pass', gmail_pass.trim());
    else dbService.deleteUserSetting(userId, 'gmail_pass');
  }

  if (gmail_host !== undefined) {
    dbService.setUserSetting(userId, 'gmail_host', gmail_host.trim() || 'imap.gmail.com');
  }

  if (gmail_port !== undefined) {
    dbService.setUserSetting(userId, 'gmail_port', String(gmail_port).trim() || '993');
  }

  res.json({ success: true, message: 'Settings saved successfully.' });
});

// POST test connection for a service using user's credentials
settingsRouter.post('/test', async (req, res) => {
  const userId = req.user?.id;
  const { service, credentials } = req.body;

  if (!service) {
    return res.status(400).json({ success: false, message: 'Service name is required' });
  }

  const credsToTest: Record<string, any> = { ...credentials };
  if (!credsToTest.apiKey && userId) {
    if (service === 'openai') credsToTest.apiKey = dbService.getUserSetting(userId, 'openai_key');
    if (service === 'anthropic') credsToTest.apiKey = dbService.getUserSetting(userId, 'anthropic_key');
    if (service === 'gemini') credsToTest.apiKey = dbService.getUserSetting(userId, 'gemini_key');
    if (service === 'xai') credsToTest.apiKey = dbService.getUserSetting(userId, 'xai_key');
    if (service === 'tavily') credsToTest.apiKey = dbService.getUserSetting(userId, 'tavily_key');
  }
  if (service === 'gmail' && userId) {
    if (!credsToTest.user) credsToTest.user = dbService.getUserSetting(userId, 'gmail_user');
    if (!credsToTest.pass) credsToTest.pass = dbService.getUserSetting(userId, 'gmail_pass');
    if (!credsToTest.host) credsToTest.host = dbService.getUserSetting(userId, 'gmail_host') || 'imap.gmail.com';
    if (!credsToTest.port) credsToTest.port = dbService.getUserSetting(userId, 'gmail_port') || '993';
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

// GET all models with configured status for authenticated user
settingsRouter.get('/models', (req, res) => {
  const userId = req.user?.id;
  const models = ModelRegistry.getAvailableModels(userId);
  res.json(models);
});
