import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { dbService, uploadsDir } from '../db/index.js';
import { DocumentParser } from '../services/rag/parser.js';
import { TextChunker } from '../services/rag/chunker.js';
import { EmbedderService } from '../services/rag/embedder.js';

export const documentsRouter = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});

// POST upload and index document
documentsRouter.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const conversationId = req.body.conversationId || null;
  const docId = crypto.randomUUID();

  try {
    // 1. Parse document text
    const parsed = await DocumentParser.parseFile(file.path, file.originalname, file.mimetype);

    // 2. Save document record in DB
    const docRecord = dbService.addDocument({
      id: docId,
      conversation_id: conversationId,
      filename: file.originalname,
      mime_type: file.mimetype,
      size: file.size,
      file_path: file.path,
      text_content: parsed.text.slice(0, 50000), // store up to 50k chars in preview
    });

    // 3. Chunk text
    const chunks = TextChunker.chunkText(parsed.text);

    // 4. Generate embeddings for chunks
    if (chunks.length > 0) {
      const textsToEmbed = chunks.map((c) => c.content);
      const embeddings = await EmbedderService.getEmbeddings(textsToEmbed);

      const dbChunks = chunks.map((c, i) => ({
        id: crypto.randomUUID(),
        document_id: docId,
        chunk_index: c.index,
        content: c.content,
        embedding: embeddings[i] || undefined,
        metadata: {
          ...c.metadata,
          filename: file.originalname,
          docMetadata: parsed.metadata,
        },
      }));

      // 5. Save chunks to SQLite
      dbService.saveChunks(dbChunks);
    }

    res.json({
      success: true,
      document: {
        ...docRecord,
        chunk_count: chunks.length,
      },
    });
  } catch (err: any) {
    console.error('Error processing document upload:', err);
    res.status(500).json({ error: err.message || 'Failed to process document' });
  }
});

// GET documents list
documentsRouter.get('/', (req, res) => {
  const { conversationId } = req.query;
  const docs = dbService.listDocuments(typeof conversationId === 'string' ? conversationId : undefined);
  res.json(docs);
});

// DELETE document
documentsRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  dbService.deleteDocument(id);
  res.json({ success: true, id });
});
