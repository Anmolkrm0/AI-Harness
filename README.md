# 🚀 AI Harness: Unified Multi-Model AI Platform

A production-ready, self-hosted AI platform with a ChatGPT/Gemini-style interface where users connect multiple AI models, upload documents for built-in automatic RAG, search the web via Tavily, manage their Gmail inbox via IMAP, evaluate responses with an LLM Judge, and collaborate with complete multi-user data isolation—all within a single, unified interface.

---

## 🌟 Key Capabilities

### 1. Multi-User Support & Strict Tenant Data Isolation
* **Multi-Tenant Architecture**: Supports multiple users accessing the platform concurrently with independent workspaces.
* **Cryptographic Security**: Built with Node 22 native crypto—PBKDF2 with salt + 100,000 iterations of SHA-512 for password hashing, and 256-bit cryptographically secure session tokens.
* **Per-User API Keys & Credentials**: Every user configures their own API keys (OpenAI, Claude, Gemini, Grok, Tavily, Gmail). One user's keys are never visible to or used by another user.
* **Private Conversations & History**: Conversations, messages, tool events, and suggested questions are strictly scoped to the authenticated `user_id`.
* **Private Document RAG**: Uploaded files, chunk embeddings, and similarity searches are private to the user who uploaded them.
* **Cross-Tenant Protection**: API routes and database queries enforce strict boundaries with `401 Unauthorized`, `403 Forbidden`, and `404 Not Found` guards.
* **Default Workspace Account**: Pre-seeded demo user `user@aiharness.local` (`password123`) for instant testing.

---

### 2. Multi-Model Support & Mid-Chat Switching
* **Supported Integrations**:
  * **OpenAI / ChatGPT**: GPT-4o, GPT-4o-mini, o3-mini
  * **Anthropic / Claude**: Claude Sonnet 5.5, Claude Haiku 4.5, Claude Opus 5.5
  * **Google Gemini**: Gemini Flash (Latest), Gemini 3.5 Flash, Gemini 3.8 Flash, Gemini 3.1 Pro
  * **xAI / Grok**: Grok 2, Grok Beta
  * **Tavily Search**: Real-time web browsing and source citations
  * **Gmail IMAP**: Email search, reading, and summarization via Google App Passwords
* **Mid-Conversation Switching**: Seamlessly change AI models at any turn (e.g., start with Gemini Flash, switch to Claude Sonnet 5.5 for coding, and Grok 2 for research) while retaining full chat history.
* **Per-Message Model Badges**: Every assistant reply displays an attribution badge identifying the exact model and provider that produced it.

---

### 3. ⚖️ LLM as a Judge (6-Dimension Evaluation & Refinement)
* **Automated Audit**: Evaluates model responses across 6 industry-standard dimensions:
  1. **Accuracy**: Factuality, precision, and verification against ground truth.
  2. **Relevance**: Direct alignment with user's core intent.
  3. **Completeness**: Depth of coverage and absence of missing details.
  4. **Hallucination Prevention**: Strict verification against retrieved documents and live tool data.
  5. **Tone & Style**: Clarity, professionalism, and conciseness.
  6. **Citation Quality**: Precision of source quotes and links.
* **Interactive Scorecard UI**:
  * Displays Overall Score (e.g., `9.2/10`) and Verdict pill (`Excellent`, `Good`, `Needs Improvement`, `Critical Flaws`).
  * Expandable progress bars and qualitative feedback for each metric.
  * Executive critique and concrete recommendations.
* **🔄 One-Click Response Improvement**:
  * Click **"Improve (Regenerate)"** to immediately refine the answer using the Judge's specific critiques.
  * Automatically re-scores the improved answer to show measurable quality gains.

---

### 4. Built-in Automatic RAG (Retrieval-Augmented Generation)
* **Zero Configuration**: Attach files to your prompt or upload them to your personal Document Knowledge Base.
* **Multi-Format Support**:
  * **PDF** (`.pdf`)
  * **Word Documents** (`.docx`, `.doc`)
  * **PowerPoint** (`.pptx`, `.ppt`)
  * **Spreadsheets & CSV** (`.csv`)
  * **Code & Text** (`.txt`, `.md`, `.json`, `.py`, `.ts`, `.js`, etc.)
  * **Images** (`.png`, `.jpg`, `.jpeg`, `.webp`)
* **Vector Index**: Paragraph-aware chunking, provider embeddings (OpenAI `text-embedding-3-small`, Gemini `text-embedding-004`) with local TF-IDF vectorizer fallback.
* **Hybrid Search**: Cosine similarity combined with keyword matching for precision context retrieval.

---

### 5. Internet Access & Gmail IMAP Tools
* **Tavily Web Search**: Real-time web crawling with cited link cards. Triggers automatically when queries require current news, documentation, or facts.
* **Gmail IMAP Integration**: Connect your Gmail inbox via a 16-character [Google App Password](https://myaccount.google.com/apppasswords) to search, read, and summarize emails with natural language queries:
  * *"Summarize my unread emails from today"*
  * *"Find invoice and receipt emails from this month"*
  * *"Do I have any calendar invites or flight confirmations?"*

---

### 6. Intelligent Follow-Up Suggestions
* Automatically generates **exactly 3 contextual follow-up questions** after every assistant reply to guide conversation flow.
* One-click prompt pills to immediately continue the conversation.

---

### 7. Modern UI & Dark / Light Theme
* **AskFlow Aesthetic**: Fluid ambient gradients, welcoming hero area with feature prompts, and clean typography.
* **Theme Switching**: Dedicated Sun/Moon toggle with automatic system preference detection and `localStorage` persistence.
* **Fully Responsive**: Collapsible desktop sidebar rail, touch-friendly mobile drawer menu, and auto-adapting layouts across phones, tablets, and wide monitors.

---

## 🚀 Quick Start

### Prerequisites
* **Node.js** v18+ (tested on Node.js v22)
* **npm** v10+

### Installation

Clone the repository and install all dependencies:
```bash
git clone https://github.com/Anmolkrm0/AI-Harness.git
cd AI-Harness
npm run install:all
```

---

### Running Locally

#### Development Mode (Frontend HMR + Backend)
```bash
npm run dev
```
* **Frontend**: `http://localhost:5173` (Vite dev server)
* **Backend API**: `http://localhost:3001` (Express API)

#### Production Mode
```bash
npm run build
npm start
```
* Serves the compiled production frontend and API together at `http://localhost:3001`.

---

## 🔑 Service Configuration Guide

Upon first login, click **Settings** or visit the **Connect Services** screen to enter your personal API keys:

| Service | Where to Get Credentials |
| :--- | :--- |
| **OpenAI** | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| **Anthropic** | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| **Google Gemini** | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| **xAI (Grok)** | [console.x.ai](https://console.x.ai) |
| **Tavily Search** | [app.tavily.com](https://app.tavily.com) |
| **Gmail IMAP** | Generate a 16-char App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) |

> [!NOTE]
> Every service includes a **"Test Connection"** button that validates your credentials in real-time, displays ping latency, and verifies folder or API access before saving.

---

## ☁️ Deployment Guide (Render.com)

AI Harness is configured for instant deployment on [Render](https://render.com) as a single Web Service:

1. **Create Web Service** on Render and link your GitHub repository: `https://github.com/Anmolkrm0/AI-Harness`.
2. Configure settings:
   * **Environment**: `Node`
   * **Node Version**: `22.14.0` (set in environment variable `NODE_VERSION=22.14.0`)
   * **Build Command**:
     ```bash
     npm run build
     ```
   * **Start Command**:
     ```bash
     npm start
     ```
3. **Persistent Disk (Optional but Recommended)**:
   * Mount a disk at `/server/data` to persist user accounts, chat histories, and SQLite databases across service restarts.

---

## 📂 Project Structure

```
AI-Harness/
├── package.json               # Root scripts (dev, build, start, install:all)
├── server/                    # Node.js + Express backend
│   ├── src/
│   │   ├── index.ts           # Server entry point & static SPA router
│   │   ├── middleware/
│   │   │   └── auth.ts        # Bearer token tenant authentication middleware
│   │   ├── db/
│   │   │   └── index.ts       # SQLite database (users, sessions, user_settings, chats, chunks)
│   │   ├── services/
│   │   │   ├── providers/     # OpenAI, Claude, Gemini, Grok unified model registry
│   │   │   ├── rag/           # Parser, chunker, embedder, vectorStore
│   │   │   └── tools/         # Tavily search, Gmail IMAP client, Question Suggester, LLM Judge
│   │   └── routes/
│   │       ├── auth.ts        # User registration, login, logout, me
│   │       ├── settings.ts    # Tenant-scoped API keys & connection test
│   │       ├── conversations.ts # Tenant-isolated conversations CRUD
│   │       ├── documents.ts   # Private RAG document upload & management
│   │       └── chat.ts        # SSE streaming completions, evaluation, improvement
│   └── test/
│       └── test_all.ts        # Automated verification tests
└── client/                    # Vite + React 18 + Tailwind CSS frontend
    ├── src/
    │   ├── App.tsx            # Main layout, auth guard, dark/light theme
    │   ├── types.ts           # Shared TypeScript interfaces
    │   ├── components/
    │   │   ├── AuthModal.tsx         # Sign in / Register modal with data isolation guarantee
    │   │   ├── SetupScreen.tsx       # Connect Services & credentials configuration
    │   │   ├── Sidebar.tsx           # Conversations, search, user profile, sign out
    │   │   ├── ChatArea.tsx          # Chat feed, message badges, tool status pills
    │   │   ├── ChatInput.tsx         # Input bar, attachment dropzone, web/gmail/judge toggles
    │   │   ├── ModelSelector.tsx     # Dynamic mid-chat model switcher
    │   │   ├── JudgeScorecard.tsx    # Interactive 6-dimension evaluation scorecard & refine
    │   │   ├── DocumentDrawer.tsx    # Uploaded documents & RAG status
    │   │   └── MarkdownRenderer.tsx  # Code syntax highlighting & markdown tables
    │   └── services/
    │       └── api.ts                # REST API client & SSE streaming reader
```

---

## 🔒 Security & Data Privacy

* **Strict Isolation**: Each user's API keys, chat histories, uploaded files, and emails are strictly isolated to their own account.
* **Encrypted Credentials**: Stored securely in SQLite (`server/data/harness.db`) using salted PBKDF2 with SHA-512.
* **Zero Telemetry**: No user data or keys are sent to third parties. API calls are sent directly and solely to the official provider APIs (OpenAI, Anthropic, Google, xAI, Tavily, Google IMAP).

---

## 📄 License

MIT License. Free to use, modify, and distribute for personal or commercial projects.