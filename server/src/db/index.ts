import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.resolve(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.resolve(dataDir, 'harness.db');
export const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.pragma('journal_mode = WAL');

// Initialize base schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY(user_id, key),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    model_used TEXT,
    provider_used TEXT,
    tool_calls TEXT,
    attachments TEXT,
    suggested_questions TEXT,
    judge_evaluation TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    conversation_id TEXT,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    text_content TEXT,
    chunk_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding TEXT,
    metadata TEXT,
    FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);
  CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id);
`);

// Safe migrations for existing SQLite databases
try {
  db.exec('ALTER TABLE conversations ADD COLUMN user_id TEXT;');
} catch (_) {}

try {
  db.exec('ALTER TABLE documents ADD COLUMN user_id TEXT;');
} catch (_) {}

try {
  db.exec('ALTER TABLE messages ADD COLUMN suggested_questions TEXT;');
} catch (_) {}

try {
  db.exec('ALTER TABLE messages ADD COLUMN judge_evaluation TEXT;');
} catch (_) {}

// Create indexes on user-scoped columns after migrations
try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
  `);
} catch (_) {}

// Cryptographic Password Hashing (PBKDF2 with SHA-512)
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(hash, 'hex'));
  } catch (_) {
    return false;
  }
}

// Initial Tenant Migration: seed default user if users table is empty and preserve existing data
try {
  const defaultUserId = 'user-default-workspace';
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0;
  if (userCount === 0) {
    const now = Date.now();
    const defaultPassHash = hashPassword('password123');
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(defaultUserId, 'user@aiharness.local', defaultPassHash, 'Primary User', now, now);
  } else {
    // Ensure default demo user has password123
    try {
      const defaultPassHash = hashPassword('password123');
      db.prepare("UPDATE users SET password_hash = ? WHERE email = 'user@aiharness.local'").run(defaultPassHash);
    } catch (_) {}

    // Link any existing conversations & documents to the default workspace user
    db.prepare('UPDATE conversations SET user_id = ? WHERE user_id IS NULL').run(defaultUserId);
    db.prepare('UPDATE documents SET user_id = ? WHERE user_id IS NULL').run(defaultUserId);

    // Copy global settings to this user's user_settings so existing configured keys stay active
    const globalSettings = db.prepare('SELECT * FROM settings').all() as SettingRecord[];
    const insertUserSetting = db.prepare(`
      INSERT OR REPLACE INTO user_settings (user_id, key, value, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    for (const s of globalSettings) {
      insertUserSetting.run(defaultUserId, s.key, s.value, s.updated_at);
    }
  }
} catch (migrationErr) {
  console.warn('Initial tenant migration notice:', migrationErr);
}

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: number;
  updated_at: number;
}

export interface SessionRecord {
  token: string;
  user_id: string;
  expires_at: number;
  created_at: number;
}

export interface SettingRecord {
  key: string;
  value: string;
  updated_at: number;
}

export interface ConversationRecord {
  id: string;
  user_id?: string | null;
  title: string;
  model: string;
  created_at: number;
  updated_at: number;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_used?: string | null;
  provider_used?: string | null;
  tool_calls?: string | null;
  attachments?: string | null;
  suggested_questions?: string | null;
  judge_evaluation?: string | null;
  created_at: number;
}

export interface DocumentRecord {
  id: string;
  user_id?: string | null;
  conversation_id?: string | null;
  filename: string;
  mime_type: string;
  size: number;
  file_path: string;
  text_content?: string | null;
  chunk_count: number;
  created_at: number;
}

export interface DocumentChunkRecord {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  embedding?: string | null;
  metadata?: string | null;
}

export const dbService = {
  // User Management
  createUser: (email: string, passwordHash: string, name: string): UserRecord => {
    const id = crypto.randomUUID();
    const now = Date.now();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, email.toLowerCase().trim(), passwordHash, name.trim(), now, now);

    return {
      id,
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      name: name.trim(),
      created_at: now,
      updated_at: now,
    };
  },

  getUserByEmail: (email: string): UserRecord | null => {
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as UserRecord | undefined;
    return row || null;
  },

  getUserById: (id: string): UserRecord | null => {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRecord | undefined;
    return row || null;
  },

  // Session Management
  createSession: (userId: string, durationDays = 30): { token: string; expires_at: number } => {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expires_at = now + durationDays * 24 * 60 * 60 * 1000;

    db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(token, userId, expires_at, now);

    return { token, expires_at };
  },

  getSessionUser: (token: string): { id: string; email: string; name: string } | null => {
    const now = Date.now();
    const row = db.prepare(`
      SELECT u.id, u.email, u.name, s.expires_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > ?
    `).get(token, now) as { id: string; email: string; name: string; expires_at: number } | undefined;

    if (!row) return null;
    return { id: row.id, email: row.email, name: row.name };
  },

  deleteSession: (token: string): void => {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  },

  // User-Isolated Settings
  getUserSetting: (userId: string, key: string): string | null => {
    const row = db.prepare('SELECT value FROM user_settings WHERE user_id = ? AND key = ?').get(userId, key) as { value: string } | undefined;
    if (row) return row.value;
    // Fall back to environment variable or global setting if present
    const globalRow = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return globalRow ? globalRow.value : null;
  },

  getUserSettings: (userId: string): Record<string, string> => {
    const rows = db.prepare('SELECT key, value FROM user_settings WHERE user_id = ?').all(userId) as { key: string; value: string }[];
    const res: Record<string, string> = {};
    for (const r of rows) {
      res[r.key] = r.value;
    }
    return res;
  },

  setUserSetting: (userId: string, key: string, value: string): void => {
    const now = Date.now();
    db.prepare(`
      INSERT INTO user_settings (user_id, key, value, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(userId, key, value, now);
  },

  deleteUserSetting: (userId: string, key: string): void => {
    db.prepare('DELETE FROM user_settings WHERE user_id = ? AND key = ?').run(userId, key);
  },

  // Legacy Global Settings (for system-wide defaults)
  getSetting: (key: string): string | null => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? row.value : null;
  },

  getAllSettings: (): Record<string, string> => {
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const res: Record<string, string> = {};
    for (const row of rows) {
      res[row.key] = row.value;
    }
    return res;
  },

  setSetting: (key: string, value: string): void => {
    const now = Date.now();
    db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, value, now);
  },

  deleteSetting: (key: string): void => {
    db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  },

  // Tenant-Isolated Conversations
  listConversations: (userId?: string): ConversationRecord[] => {
    if (userId) {
      return db.prepare('SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC').all(userId) as ConversationRecord[];
    }
    return db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC').all() as ConversationRecord[];
  },

  getConversation: (id: string, userId?: string): ConversationRecord | null => {
    if (userId) {
      const row = db.prepare('SELECT * FROM conversations WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(id, userId) as ConversationRecord | undefined;
      return row || null;
    }
    const row = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as ConversationRecord | undefined;
    return row || null;
  },

  createConversation: (id: string, title: string, model: string, userId?: string): ConversationRecord => {
    const now = Date.now();
    db.prepare(`
      INSERT INTO conversations (id, user_id, title, model, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId || null, title, model, now, now);
    return { id, user_id: userId || null, title, model, created_at: now, updated_at: now };
  },

  updateConversation: (id: string, updates: { title?: string; model?: string }, userId?: string): void => {
    const now = Date.now();
    const userClause = userId ? ' AND (user_id = ? OR user_id IS NULL)' : '';
    const params: any[] = [];

    if (updates.title !== undefined && updates.model !== undefined) {
      params.push(updates.title, updates.model, now, id);
      if (userId) params.push(userId);
      db.prepare(`UPDATE conversations SET title = ?, model = ?, updated_at = ? WHERE id = ?${userClause}`).run(...params);
    } else if (updates.title !== undefined) {
      params.push(updates.title, now, id);
      if (userId) params.push(userId);
      db.prepare(`UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?${userClause}`).run(...params);
    } else if (updates.model !== undefined) {
      params.push(updates.model, now, id);
      if (userId) params.push(userId);
      db.prepare(`UPDATE conversations SET model = ?, updated_at = ? WHERE id = ?${userClause}`).run(...params);
    }
  },

  deleteConversation: (id: string, userId?: string): void => {
    if (userId) {
      db.prepare('DELETE FROM conversations WHERE id = ? AND (user_id = ? OR user_id IS NULL)').run(id, userId);
    } else {
      db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
    }
  },

  // Messages
  listMessages: (conversationId: string): MessageRecord[] => {
    return db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(conversationId) as MessageRecord[];
  },

  addMessage: (msg: {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    model_used?: string;
    provider_used?: string;
    tool_calls?: any;
    attachments?: any;
    suggested_questions?: any;
    judge_evaluation?: any;
  }): MessageRecord => {
    const now = Date.now();
    const toolCallsStr = msg.tool_calls ? JSON.stringify(msg.tool_calls) : null;
    const attachmentsStr = msg.attachments ? JSON.stringify(msg.attachments) : null;
    const suggestedStr = msg.suggested_questions ? JSON.stringify(msg.suggested_questions) : null;
    const judgeStr = msg.judge_evaluation ? JSON.stringify(msg.judge_evaluation) : null;

    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, model_used, provider_used, tool_calls, attachments, suggested_questions, judge_evaluation, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      msg.id,
      msg.conversation_id,
      msg.role,
      msg.content,
      msg.model_used || null,
      msg.provider_used || null,
      toolCallsStr,
      attachmentsStr,
      suggestedStr,
      judgeStr,
      now
    );

    // Update conversation timestamp
    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(now, msg.conversation_id);

    return {
      id: msg.id,
      conversation_id: msg.conversation_id,
      role: msg.role,
      content: msg.content,
      model_used: msg.model_used || null,
      provider_used: msg.provider_used || null,
      tool_calls: toolCallsStr,
      attachments: attachmentsStr,
      suggested_questions: suggestedStr,
      judge_evaluation: judgeStr,
      created_at: now,
    };
  },

  getMessage: (id: string): MessageRecord | null => {
    const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as MessageRecord | undefined;
    return row || null;
  },

  updateMessage: (id: string, updates: { content?: string; judge_evaluation?: any; suggested_questions?: any }): void => {
    if (updates.judge_evaluation !== undefined && updates.content !== undefined) {
      const judgeStr = updates.judge_evaluation ? JSON.stringify(updates.judge_evaluation) : null;
      db.prepare('UPDATE messages SET content = ?, judge_evaluation = ? WHERE id = ?').run(updates.content, judgeStr, id);
    } else if (updates.judge_evaluation !== undefined) {
      const judgeStr = updates.judge_evaluation ? JSON.stringify(updates.judge_evaluation) : null;
      db.prepare('UPDATE messages SET judge_evaluation = ? WHERE id = ?').run(judgeStr, id);
    } else if (updates.content !== undefined) {
      db.prepare('UPDATE messages SET content = ? WHERE id = ?').run(updates.content, id);
    }
  },

  // Tenant-Isolated Documents
  addDocument: (doc: {
    id: string;
    user_id?: string | null;
    conversation_id?: string | null;
    filename: string;
    mime_type: string;
    size: number;
    file_path: string;
    text_content?: string;
  }): DocumentRecord => {
    const now = Date.now();
    db.prepare(`
      INSERT INTO documents (id, user_id, conversation_id, filename, mime_type, size, file_path, text_content, chunk_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      doc.id,
      doc.user_id || null,
      doc.conversation_id || null,
      doc.filename,
      doc.mime_type,
      doc.size,
      doc.file_path,
      doc.text_content || null,
      now
    );

    return {
      id: doc.id,
      user_id: doc.user_id || null,
      conversation_id: doc.conversation_id || null,
      filename: doc.filename,
      mime_type: doc.mime_type,
      size: doc.size,
      file_path: doc.file_path,
      text_content: doc.text_content || null,
      chunk_count: 0,
      created_at: now,
    };
  },

  listDocuments: (userId?: string, conversationId?: string): DocumentRecord[] => {
    if (userId && conversationId) {
      return db.prepare(`
        SELECT * FROM documents
        WHERE (user_id = ? OR user_id IS NULL) AND (conversation_id = ? OR conversation_id IS NULL)
        ORDER BY created_at DESC
      `).all(userId, conversationId) as DocumentRecord[];
    }
    if (userId) {
      return db.prepare(`
        SELECT * FROM documents
        WHERE user_id = ? OR user_id IS NULL
        ORDER BY created_at DESC
      `).all(userId) as DocumentRecord[];
    }
    if (conversationId) {
      return db.prepare('SELECT * FROM documents WHERE conversation_id = ? OR conversation_id IS NULL ORDER BY created_at DESC').all(conversationId) as DocumentRecord[];
    }
    return db.prepare('SELECT * FROM documents ORDER BY created_at DESC').all() as DocumentRecord[];
  },

  getDocument: (id: string, userId?: string): DocumentRecord | null => {
    if (userId) {
      const row = db.prepare('SELECT * FROM documents WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(id, userId) as DocumentRecord | undefined;
      return row || null;
    }
    const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as DocumentRecord | undefined;
    return row || null;
  },

  deleteDocument: (id: string, userId?: string): void => {
    const doc = dbService.getDocument(id, userId);
    if (!doc) return;

    if (fs.existsSync(doc.file_path)) {
      try {
        fs.unlinkSync(doc.file_path);
      } catch (e) {
        console.error('Failed to remove file from disk:', e);
      }
    }
    db.prepare('DELETE FROM document_chunks WHERE document_id = ?').run(id);
    db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  },

  // Document Chunks
  saveChunks: (chunks: { id: string; document_id: string; chunk_index: number; content: string; embedding?: number[]; metadata?: any }[]): void => {
    const insert = db.prepare(`
      INSERT INTO document_chunks (id, document_id, chunk_index, content, embedding, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const updateDoc = db.prepare('UPDATE documents SET chunk_count = ? WHERE id = ?');

    const transaction = db.transaction((chunkList: typeof chunks) => {
      for (const c of chunkList) {
        insert.run(
          c.id,
          c.document_id,
          c.chunk_index,
          c.content,
          c.embedding ? JSON.stringify(c.embedding) : null,
          c.metadata ? JSON.stringify(c.metadata) : null
        );
      }
      if (chunkList.length > 0) {
        updateDoc.run(chunkList.length, chunkList[0].document_id);
      }
    });

    transaction(chunks);
  },

  getChunksForDocument: (documentId: string): DocumentChunkRecord[] => {
    return db.prepare('SELECT * FROM document_chunks WHERE document_id = ? ORDER BY chunk_index ASC').all(documentId) as DocumentChunkRecord[];
  },

  getAllChunks: (userId?: string, conversationId?: string): (DocumentChunkRecord & { filename: string })[] => {
    if (userId && conversationId) {
      return db.prepare(`
        SELECT c.*, d.filename
        FROM document_chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE (d.user_id = ? OR d.user_id IS NULL)
          AND (d.conversation_id = ? OR d.conversation_id IS NULL)
      `).all(userId, conversationId) as (DocumentChunkRecord & { filename: string })[];
    }
    if (userId) {
      return db.prepare(`
        SELECT c.*, d.filename
        FROM document_chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE d.user_id = ? OR d.user_id IS NULL
      `).all(userId) as (DocumentChunkRecord & { filename: string })[];
    }
    if (conversationId) {
      return db.prepare(`
        SELECT c.*, d.filename
        FROM document_chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE d.conversation_id = ? OR d.conversation_id IS NULL
      `).all(conversationId) as (DocumentChunkRecord & { filename: string })[];
    }
    return db.prepare(`
      SELECT c.*, d.filename
      FROM document_chunks c
      JOIN documents d ON c.document_id = d.id
    `).all() as (DocumentChunkRecord & { filename: string })[];
  },
};

export { dataDir, uploadsDir };
