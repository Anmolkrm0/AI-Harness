import { Router } from 'express';
import { dbService } from '../db/index.js';
import crypto from 'crypto';

export const conversationsRouter = Router();

// GET all conversations for authenticated user
conversationsRouter.get('/', (req, res) => {
  const userId = req.user?.id;
  const list = dbService.listConversations(userId);
  res.json(list);
});

// POST create conversation for authenticated user
conversationsRouter.post('/', (req, res) => {
  const userId = req.user?.id;
  const { title = 'New Conversation', model = 'gpt-4o' } = req.body;
  const id = crypto.randomUUID();
  const conv = dbService.createConversation(id, title, model, userId);
  res.json(conv);
});

// GET conversation by ID with messages (verifying ownership)
conversationsRouter.get('/:id', (req, res) => {
  const userId = req.user?.id;
  const { id } = req.params;
  const conv = dbService.getConversation(id, userId);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found or access denied' });
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
    judge_evaluation: m.judge_evaluation ? JSON.parse(m.judge_evaluation) : null,
    created_at: m.created_at,
  }));

  const docs = dbService.listDocuments(userId, id);

  res.json({
    conversation: conv,
    messages,
    documents: docs,
  });
});

// PATCH update conversation (title or model)
conversationsRouter.patch('/:id', (req, res) => {
  const userId = req.user?.id;
  const { id } = req.params;
  const { title, model } = req.body;

  const conv = dbService.getConversation(id, userId);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found or access denied' });
  }

  dbService.updateConversation(id, { title, model }, userId);
  const updated = dbService.getConversation(id, userId);
  res.json(updated);
});

// DELETE conversation (scoped to authenticated user)
conversationsRouter.delete('/:id', (req, res) => {
  const userId = req.user?.id;
  const { id } = req.params;
  const conv = dbService.getConversation(id, userId);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found or access denied' });
  }

  dbService.deleteConversation(id, userId);
  res.json({ success: true, id });
});
