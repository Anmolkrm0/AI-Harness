import { Router } from 'express';
import { dbService } from '../db/index.js';
import crypto from 'crypto';

export const conversationsRouter = Router();

// GET all conversations
conversationsRouter.get('/', (req, res) => {
  const list = dbService.listConversations();
  res.json(list);
});

// POST create conversation
conversationsRouter.post('/', (req, res) => {
  const { title = 'New Conversation', model = 'gpt-4o' } = req.body;
  const id = crypto.randomUUID();
  const conv = dbService.createConversation(id, title, model);
  res.json(conv);
});

// GET conversation by ID with messages
conversationsRouter.get('/:id', (req, res) => {
  const { id } = req.params;
  const conv = dbService.getConversation(id);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  const rawMessages = dbService.listMessages(id);
  const messages = rawMessages.map((m) => ({
    id: m.id,
    conversation_id: m.conversation_id,
    role: m.role,
    content: m.content,
    model_used: m.model_used,
    provider_used: m.provider_used,
    tool_calls: m.tool_calls ? JSON.parse(m.tool_calls) : null,
    attachments: m.attachments ? JSON.parse(m.attachments) : null,
    suggested_questions: m.suggested_questions ? JSON.parse(m.suggested_questions) : null,
    created_at: m.created_at,
  }));

  const docs = dbService.listDocuments(id);

  res.json({
    conversation: conv,
    messages,
    documents: docs,
  });
});

// PATCH update conversation (title or model)
conversationsRouter.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { title, model } = req.body;

  const conv = dbService.getConversation(id);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  dbService.updateConversation(id, { title, model });
  const updated = dbService.getConversation(id);
  res.json(updated);
});

// DELETE conversation
conversationsRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  dbService.deleteConversation(id);
  res.json({ success: true, id });
});
