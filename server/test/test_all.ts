import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dbService } from '../src/db/index.js';
import { DocumentParser } from '../src/services/rag/parser.js';
import { TextChunker } from '../src/services/rag/chunker.js';
import { EmbedderService } from '../src/services/rag/embedder.js';
import { VectorStore } from '../src/services/rag/vectorStore.js';
import { ModelRegistry } from '../src/services/providers/registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('🧪 Starting AI Harness Automated Test Suite...\n');

  // Test 1: Database Settings
  console.log('Test 1: Testing Settings Storage in SQLite...');
  dbService.setSetting('test_key', 'test_secret_123');
  const val = dbService.getSetting('test_key');
  assert.strictEqual(val, 'test_secret_123', 'Setting value should match');
  dbService.deleteSetting('test_key');
  assert.strictEqual(dbService.getSetting('test_key'), null, 'Setting should be deleted');
  console.log('✅ Settings storage working correctly.\n');

  // Test 2: Conversations CRUD
  console.log('Test 2: Testing Conversations and Messages in SQLite...');
  const testConvId = `test-conv-${Date.now()}`;
  const conv = dbService.createConversation(testConvId, 'Test Conversation', 'claude-3-7-sonnet-20250219');
  assert.strictEqual(conv.id, testConvId);
  assert.strictEqual(conv.model, 'claude-3-7-sonnet-20250219');

  // Update model (simulating mid-chat model switch)
  dbService.updateConversation(testConvId, { model: 'gpt-4o' });
  const updatedConv = dbService.getConversation(testConvId);
  assert.strictEqual(updatedConv?.model, 'gpt-4o', 'Model should be switched to gpt-4o');

  // Add messages
  const userMsg = dbService.addMessage({
    id: `msg-1-${Date.now()}`,
    conversation_id: testConvId,
    role: 'user',
    content: 'What is quantum computing?',
  });
  const asstMsg = dbService.addMessage({
    id: `msg-2-${Date.now()}`,
    conversation_id: testConvId,
    role: 'assistant',
    content: 'Quantum computing uses qubits and superposition.',
    model_used: 'gpt-4o',
    provider_used: 'openai',
  });

  const msgs = dbService.listMessages(testConvId);
  assert.strictEqual(msgs.length, 2, 'Should have 2 messages');
  assert.strictEqual(msgs[0].content, 'What is quantum computing?');
  assert.strictEqual(msgs[1].model_used, 'gpt-4o');
  console.log('✅ Conversations, messages, and model switching storage verified.\n');

  // Test 3: Document Parsing & Text Extraction
  console.log('Test 3: Testing Multi-Format Document Parsing...');
  const sampleTxtPath = path.resolve(__dirname, 'sample.txt');
  fs.writeFileSync(sampleTxtPath, 'Artificial Intelligence Harness\n\nThis system connects OpenAI, Anthropic Claude, Google Gemini, and xAI Grok with built-in RAG and Tavily web search.');

  const parsedTxt = await DocumentParser.parseFile(sampleTxtPath, 'sample.txt', 'text/plain');
  assert.ok(parsedTxt.text.includes('Artificial Intelligence Harness'));
  console.log('✅ Text parser verified.');

  const sampleCsvPath = path.resolve(__dirname, 'sample.csv');
  fs.writeFileSync(sampleCsvPath, 'Model,Provider,ContextWindow\nGPT-4o,OpenAI,128000\nClaude 3.7 Sonnet,Anthropic,200000\nGemini 2.5 Pro,Google,1000000\nGrok 2,xAI,131072\n');
  const parsedCsv = await DocumentParser.parseFile(sampleCsvPath, 'sample.csv', 'text/csv');
  assert.ok(parsedCsv.text.includes('Columns: Model, Provider, ContextWindow'));
  assert.ok(parsedCsv.text.includes('Claude 3.7 Sonnet'));
  console.log('✅ CSV structured table parser verified.\n');

  // Test 4: Semantic Chunking & Vector Store Indexing
  console.log('Test 4: Testing Chunking, Embedding & Vector Similarity Search (RAG)...');
  const chunks = TextChunker.chunkText(parsedCsv.text, 200, 40);
  assert.ok(chunks.length >= 1, 'Should generate chunks');

  const testDocId = `doc-${Date.now()}`;
  dbService.addDocument({
    id: testDocId,
    conversation_id: testConvId,
    filename: 'sample.csv',
    mime_type: 'text/csv',
    size: fs.statSync(sampleCsvPath).size,
    file_path: sampleCsvPath,
    text_content: parsedCsv.text,
  });

  const embeddings = await EmbedderService.getEmbeddings(chunks.map((c) => c.content));
  assert.strictEqual(embeddings.length, chunks.length, 'Embeddings count should match chunks count');

  const dbChunks = chunks.map((c, i) => ({
    id: `chunk-${i}-${Date.now()}`,
    document_id: testDocId,
    chunk_index: c.index,
    content: c.content,
    embedding: embeddings[i],
    metadata: { ...c.metadata, filename: 'sample.csv' },
  }));
  dbService.saveChunks(dbChunks);

  // Search vector store
  const results = await VectorStore.search('Gemini context window', testConvId, 3);
  assert.ok(results.length > 0, 'Should retrieve matching chunks');
  assert.ok(results[0].content.includes('Gemini') || results[0].content.includes('ContextWindow'));
  console.log(`✅ VectorStore retrieved ${results.length} relevant chunks with top score ${results[0].score.toFixed(3)}.\n`);

  // Test 5: Model Registry
  console.log('Test 5: Testing Model Registry and Provider Mappings...');
  const availableModels = ModelRegistry.getAvailableModels();
  assert.ok(availableModels.length >= 8, 'Should support at least 8 models');
  const gpt4o = ModelRegistry.getModel('gpt-4o');
  assert.strictEqual(gpt4o?.provider, 'openai');
  const claude = ModelRegistry.getModel('claude-3-7-sonnet-20250219');
  assert.strictEqual(claude?.provider, 'anthropic');
  const gemini = ModelRegistry.getModel('gemini-2.5-pro');
  assert.strictEqual(gemini?.provider, 'gemini');
  const grok = ModelRegistry.getModel('grok-2-1212');
  assert.strictEqual(grok?.provider, 'xai');
  console.log('✅ Model Registry verified across OpenAI, Anthropic, Gemini, and xAI.\n');

  // Clean up test files and DB records
  try {
    fs.unlinkSync(sampleTxtPath);
    fs.unlinkSync(sampleCsvPath);
    dbService.deleteConversation(testConvId);
    dbService.deleteDocument(testDocId);
  } catch {}

  console.log('🎉 ALL AUTOMATED TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
