import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
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

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
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
    created_at INTEGER NOT NULL,
    FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    text_content TEXT,
    chunk_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
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

  CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id);
`);

export interface SettingRecord {
  key: string;
  value: string;
  updated_at: number;
}

export interface ConversationRecord {
  id: string;
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
  created_at: number;
}

export interface DocumentRecord {
  id: string;
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
  // Settings
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

  setSetting: (key: string, value: string) => {
    const now = Date.now();
    db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, value, now);
  },

  deleteSetting: (key: string) => {
    db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  },

  // Conversations
  listConversations: (): ConversationRecord[] => {
    return db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC').all() as ConversationRecord[];
  },

  getConversation: (id: string): ConversationRecord | null => {
    const row = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as ConversationRecord | undefined;
    return row || null;
  },

  createConversation: (id: string, title: string, model: string): ConversationRecord => {
    const now = Date.now();
    db.prepare(`
      INSERT INTO conversations (id, title, model, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, title, model, now, now);
    return { id, title, model, created_at: now, updated_at: now };
  },

  updateConversation: (id: string, updates: { title?: string; model?: string }) => {
    const now = Date.now();
    if (updates.title !== undefined && updates.model !== undefined) {
      db.prepare('UPDATE conversations SET title = ?, model = ?, updated_at = ? WHERE id = ?').run(updates.title, updates.model, now, id);
    } else if (updates.title !== undefined) {
      db.prepare('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?').run(updates.title, now, id);
    } else if (updates.model !== undefined) {
      db.prepare('UPDATE conversations SET model = ?, updated_at = ? WHERE id = ?').run(updates.model, now, id);
    }
  },

  deleteConversation: (id: string) => {
    db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
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
  }): MessageRecord => {
    const now = Date.now();
    const toolCallsStr = msg.tool_calls ? JSON.stringify(msg.tool_calls) : null;
    const attachmentsStr = msg.attachments ? JSON.stringify(msg.attachments) : null;

    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, model_used, provider_used, tool_calls, attachments, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      msg.id,
      msg.conversation_id,
      msg.role,
      msg.content,
      msg.model_used || null,
      msg.provider_used || null,
      toolCallsStr,
      attachmentsStr,
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
      created_at: now,
    };
  },

  // Documents
  addDocument: (doc: {
    id: string;
    conversation_id?: string | null;
    filename: string;
    mime_type: string;
    size: number;
    file_path: string;
    text_content?: string;
  }): DocumentRecord => {
    const now = Date.now();
    db.prepare(`
      INSERT INTO documents (id, conversation_id, filename, mime_type, size, file_path, text_content, chunk_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      doc.id,
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

  listDocuments: (conversationId?: string): DocumentRecord[] => {
    if (conversationId) {
      return db.prepare('SELECT * FROM documents WHERE conversation_id = ? OR conversation_id IS NULL ORDER BY created_at DESC').all(conversationId) as DocumentRecord[];
    }
    return db.prepare('SELECT * FROM documents ORDER BY created_at DESC').all() as DocumentRecord[];
  },

  getDocument: (id: string): DocumentRecord | null => {
    const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as DocumentRecord | undefined;
    return row || null;
  },

  deleteDocument: (id: string) => {
    const doc = dbService.getDocument(id);
    if (doc && fs.existsSync(doc.file_path)) {
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
  saveChunks: (chunks: { id: string; document_id: string; chunk_index: number; content: string; embedding?: number[]; metadata?: any }[]) => {
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

  getAllChunks: (conversationId?: string): (DocumentChunkRecord & { filename: string })[] => {
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
