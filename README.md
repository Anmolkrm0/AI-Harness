# 🚀 AI Harness: Unified Multi-Model AI Workspace

A complete, self-hosted AI harness with a ChatGPT/Gemini-style interface where users connect multiple AI models, upload documents for built-in automatic RAG, search the web via Tavily, and interact with their Gmail inbox via IMAP—all within a single, unified chat interface.

---

## 🌟 Key Features

### 1. Initial Setup & Connect Services Screen
* **Onboarding & Configuration**: On your first visit, you are presented with the **Connect Services** page.
* **Supported Integrations**:
  * **OpenAI / ChatGPT**: GPT-4o, GPT-4o-mini, o3-mini
  * **Anthropic / Claude**: Claude Sonnet 5.5, Claude Haiku 4.5, Claude Opus 5.5
  * **Google Gemini**: Gemini Flash (Latest), Gemini 3.5 Flash, Gemini 3.8 Flash, Gemini 3.1 Pro
  * **xAI / Grok**: Grok 2, Grok Beta
  * **Tavily Search**: Real-time web browsing and source citations
  * **Gmail IMAP**: Email search, reading, and summarization via Google App Passwords
* **Live Connection Testing**: Each service features a "Test Connection" button that validates credentials in real-time, displays response latency, and verifies API/folder access.
* **Local & Private**: All keys and credentials are stored strictly on your local machine in SQLite (`server/data/harness.db`).

### 2. Modern ChatGPT & Gemini-Style Chat Interface
* **Model Switcher Dropdown**: Switch models **at any moment mid-conversation** (e.g., `Gemini Flash` → `Claude Sonnet 5.5` → `GPT-4o` → `Grok 2`).
* **Model-Agnostic Context**: The entire conversation history is preserved across model switches without any provider-specific lock-in.
* **Per-Message Model Badges**: Every assistant reply displays a badge identifying which model generated it.
* **Collapsible & Mobile Drawer Sidebar**: Create new chats (`⌘K`), search past conversations, rename conversations inline, and delete conversations. Fully responsive on mobile screens with a hamburger menu.
* **Live Tool Execution Cards**: Interactive status pills showing real-time Tavily search queries, cited web links, retrieved RAG excerpts, and referenced Gmail messages.
* **Markdown & Code Highlighting**: Syntax-highlighted code blocks with one-click copy buttons and formatted tables.

### 3. Built-in Automatic RAG (Retrieval-Augmented Generation)
* **Zero Configuration**: Simply attach files to your message or upload them via the Document Knowledge Base drawer.
* **Supported File Formats**:
  * **PDF** (`.pdf`)
  * **Word** (`.docx`, `.doc`)
  * **PowerPoint** (`.pptx`, `.ppt`)
  * **Spreadsheets** (`.csv`)
  * **Text & Code** (`.txt`, `.md`, `.json`, `.py`, `.js`, `.ts`, etc.)
  * **Images** (`.png`, `.jpg`, `.jpeg`, `.webp`)
* **Vector Index**: Intelligent paragraph-aware chunking, provider embeddings (OpenAI `text-embedding-3-small`, Gemini `text-embedding-004`) with a deterministic local TF-IDF vectorizer fallback.
* **Hybrid Search**: Cosine vector similarity combined with keyword matching for precision retrieval.

### 4. Internet Access (Tavily Search)
* Real-time web search tool integrated directly into the agent reasoning loop.
* Toggle between Auto, Enabled, and Disabled.
* Automatically triggers when questions require current news, prices, or live facts.
* Provides direct answer summaries and cited source cards with links.

### 5. Gmail IMAP Integration
* Connect your Gmail using a 16-character [Google App Password](https://myaccount.google.com/apppasswords).
* Query your inbox with natural language:
  * *"Check my recent emails and summarize any important messages"*
  * *"Search emails for invoices or receipts from this month"*
  * *"Do I have any flight confirmations or meeting invitations?"*
* Displays sender, subject, date, and body excerpts.

### 6. Unified Context Fusion
* Combine **AI Models + Chat History + Uploaded Documents + Live Web Search + Gmail Inbox** in a single prompt!

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** v18+ (tested on Node.js v22)
* **npm** v10+

### Installation

From the root directory:
```bash
npm run install:all
```
*(Or install root, `server/`, and `client/` dependencies individually)*

### Running the Application

#### Option A: Unified Fullstack Dev Mode (with Hot Reloading)
```bash
npm run dev
```
* **Frontend**: `http://localhost:5173` (Vite with instant HMR)
* **Backend**: `http://localhost:3001` (Express API)

#### Option B: Production Server Mode
```bash
npm run build
npm start
```
* The Express server serves both the API and the optimized React frontend at `http://localhost:3001`.

---

## 🔑 Setting Up Gmail IMAP

To connect your Gmail inbox:
1. Ensure **2-Step Verification** is enabled on your Google Account: [myaccount.google.com/security](https://myaccount.google.com/security)
2. Go to **App Passwords**: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Enter an app name (e.g. `AI Harness`) and generate a 16-character password (e.g. `abcd efgh ijkl mnop`).
4. In the AI Harness Setup screen, enter:
   * **Email**: `your.email@gmail.com`
   * **Password**: The 16-character App Password
5. Click **Test Connection** to verify that your inbox is reached and unread emails can be listed!

---

## 🧪 Running Automated Tests

To run the automated test suite verifying database storage, multi-format document parsing, semantic chunking, vector similarity search, and model registry mappings:

```bash
cd server
npx tsx test/test_all.ts
```

---

## 📂 Project Architecture

```
AI-Harness/
├── package.json               # Root scripts (dev, build, start)
├── server/                    # Node.js + Express backend
│   ├── src/
│   │   ├── index.ts           # Express server entry point & static client server
│   │   ├── db/
│   │   │   └── index.ts       # SQLite database (settings, chats, messages, chunks)
│   │   ├── services/
│   │   │   ├── providers/     # OpenAI, Anthropic, Gemini, xAI unified streaming
│   │   │   ├── rag/           # Parser, chunker, embedder, vectorStore
│   │   │   ├── tools/         # Tavily web search, Gmail IMAP client, agent coordinator
│   │   │   └── testConnection.ts # Live testing for all 6 integrations
│   │   └── routes/
│   │       ├── settings.ts    # Credentials & connection testing
│   │       ├── conversations.ts # CRUD for conversations & history
│   │       ├── documents.ts   # Upload & RAG indexing
│   │       └── chat.ts        # SSE streaming chat completions
│   └── test/
│       └── test_all.ts        # Automated verification tests
└── client/                    # Vite + React 18 + Tailwind CSS frontend
    ├── src/
    │   ├── App.tsx            # Main application coordinator (responsive layout)
    │   ├── types.ts           # Shared TypeScript interfaces
    │   ├── components/
    │   │   ├── SetupScreen.tsx       # Connect Services onboarding & settings modal
    │   │   ├── Sidebar.tsx           # History, search, new chat, mobile drawer
    │   │   ├── ChatArea.tsx          # Chat feed, model badges, tool activity pills
    │   │   ├── ChatInput.tsx         # Responsive input bar, attachment dropzone, toggles
    │   │   ├── ModelSelector.tsx     # Mid-conversation model switcher
    │   │   ├── DocumentDrawer.tsx    # Uploaded documents & RAG status
    │   │   └── MarkdownRenderer.tsx  # Code syntax highlighting & markdown tables
    │   └── services/
    │       └── api.ts               # REST API & SSE streaming reader
```

---

## 🔒 Privacy & Security

All your configured API keys, Gmail credentials, conversation histories, and uploaded document embeddings are stored **locally in SQLite** on your machine (`server/data/harness.db`). Credentials are never sent anywhere except directly to the official provider endpoints during live requests.