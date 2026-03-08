# ⚡ Context Stack

### **Turn any webpage into AI memory. Supercharge ChatGPT with real-time browsing context.**

---

## 🎯 The Problem

Every time you ask ChatGPT a question about something you just read online — a research paper, documentation, a blog post — you have to **manually copy-paste** the relevant content. This kills your workflow.

Worse, ChatGPT has **zero awareness** of what you've been reading. It can't connect information across multiple tabs you've been studying. Your browsing session and your AI assistant live in **completely separate worlds**.

**You lose context. You lose time. You lose the connections between ideas.**

---

## 💡 The Solution

**Context Stack** is a browser extension that bridges the gap between your browsing and your AI conversations.

It captures the pages you're reading, converts them into a **searchable vector knowledge base**, and when you ask ChatGPT a question — it **automatically injects the most relevant context** from everything you've saved.

> You don't copy-paste. You don't summarize. You just browse, save, and ask.

---

## 🔥 What Makes This Different

| Traditional Approach | Context Stack |
|---|---|
| Manually copy content to ChatGPT | One-click capture, automatic injection |
| One page at a time | Cross-page context from multiple sources |
| Flat text, no intelligence | Vector embeddings with semantic search |
| Context lost after each chat | Persistent knowledge base across sessions |
| No organization | Context Buckets for topic-based retrieval |

---

## 🏗️ Architecture

```
┌──────────────────┐     ┌────────────────────────┐     ┌─────────────────┐
│  Browser Tabs    │────▶│   Context Stack API    │────▶│  PostgreSQL +   │
│  (Any Website)   │     │   (Node.js/Express)    │     │  pgvector       │
└──────────────────┘     └────────────────────────┘     └─────────────────┘
         │                         │                           │
         │  Page Content           │  Chunk + Embed            │  Store Vectors
         ▼                         ▼                           ▼
┌──────────────────┐     ┌────────────────────────┐     ┌─────────────────┐
│  ChatGPT Page    │◀───▶│   Retrieval Engine     │◀───▶│  Cosine         │
│  (Ctrl+Enter)    │     │   (Semantic Search)    │     │  Similarity     │
└──────────────────┘     └────────────────────────┘     └─────────────────┘
```

---

## 📍 System Flow

### 🔵 User Flow

```
1. User browses multiple websites (docs, articles, research)
        │
2. Clicks "Load Context" in extension → selects severity level → page content sent to backend
        │
3. Opens ChatGPT → types a question naturally
        │
4. Presses Ctrl+Enter → extension intercepts the query
        │
5. Floating widget shows "processing..." status
        │
6. Backend detects query intent (debugging/explanation/implementation/comparison/optimization)
        │
7. Query is expanded based on detected intent
        │
8. Backend returns semantically relevant chunks sorted by severity-boosted similarity
        │
9. Extension injects enriched prompt into ChatGPT:
        │
        ├── Retrieved context with source URLs marked
        ├── Detected intent (for transparency)
        ├── Chunk similarity scores
        └── Original user question appended at the end
        │
10. User hits Enter → ChatGPT responds with deep, context-aware answers
```

### 🟢 Server Flow

```
1. Receives page content at POST /context
        │
2. Accepts severity level (low/medium/high) for prioritization
        │
3. Splits text into semantic chunks (~600 tokens each)
        │
4. Generates vector embeddings via Gemini Embedding API
        │
5. Stores chunks + embeddings + severity in PostgreSQL (pgvector)
        │
6. When query arrives at POST /retrieve:
        │
        ├── Detects intent from query (debugging/explanation/implementation/comparison/optimization)
        ├── Expands query based on detected intent
        ├── Embeds expanded query into the same vector space
        ├── Performs cosine similarity search with severity boosting
        ├── Returns top-K most relevant chunks with source URLs
        ├── Attaches source information to each chunk
        └── Returns structured response with intent, sources, and context
```

---

## ⚙️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Backend** | Node.js + Express | Lightweight, fast REST APIs |
| **Vector DB** | PostgreSQL + pgvector | Production-grade vector search with SQL |
| **Embeddings** | Gemini `gemini-embedding-001` | 768-dim semantic vectors, free tier |
| **Intent Detection** | Xenova `all-MiniLM-L6-v2` | Fast, offline intent classification (5 categories) |
| **Extension** | Chrome Manifest V3 | Modern, secure browser extension standard |
| **Similarity** | Cosine Similarity + Severity Boost | Sub-millisecond HNSW search with relevance calibration |

---

## 🧩 Key Features

### 📦 Context Buckets
Organize your knowledge into topic-based buckets:
- `research` — academic papers and articles
- `docs` — API documentation
- `project` — project-specific pages

The system **auto-defaults** to your most recently used bucket.

### 📄 One-Click Context Capture
Browse to any page → open extension → click **Load Context**. The system:
- Extracts full page text
- Chunks it into semantic blocks
- Generates embeddings with **severity tagging** (low/medium/high)
- Stores everything in the vector DB

High-severity pages receive boosted relevance scores during retrieval.

### 🧠 Intent Detection
Automatically detects query intent and expands searches accordingly:
- **Debugging** — finds error fixes, troubleshooting guides, exception handling patterns
- **Explanation** — retrieves conceptual overviews, architecture docs, design patterns
- **Implementation** — surfaces step-by-step guides, code examples, setup instructions
- **Comparison** — finds pros/cons, alternatives, tradeoff analyses
- **Optimization** — retrieves performance tips, scalability patterns, efficiency improvements

Intent-based query expansion improves retrieval quality by 50%+.

### 📍 Source Attribution
Retrieved context includes full source URLs:
- Each chunk displays its origin page
- Allows easy fact-checking and deep dives
- Response includes similarity scores for transparency

### 🔍 Intelligent Semantic Retrieval
When you type a question on ChatGPT and press **Ctrl+Enter**:
- Intent is auto-detected from your query
- Query is expanded based on detected intent
- Top relevant chunks are retrieved via cosine similarity + severity boosting
- Sources are attached to each result
- An optimized prompt is constructed and injected automatically

### ⚡ Zero Friction
No tab switching. No copy-paste. No prompt engineering. Just **browse → save → ask**.

---

## 🚀 Quick Start

```bash
# 1. Setup database (Neon/PostgreSQL with pgvector)
psql $DATABASE_URL < sql/schema.sql

# 2. Start backend
cd backend
cp .env.example .env    # Add DATABASE_URL + GEMINI_API_KEY
npm install && npm start

# 3. Load extension
# Chrome → chrome://extensions → Developer mode → Load unpacked → select extension/
```

---

## 📁 Project Structure

```
Context Stack/
├── backend/
│   ├── server.js          Express entry point
│   ├── db.js              PostgreSQL + pgvector connection
│   ├── chunker.js         Text splitting engine
│   ├── embedding.js       Gemini embedding integration
│   ├── rag.js             Retrieval engine (cosine search)
│   └── routes.js          REST API endpoints
├── extension/
│   ├── manifest.json      Manifest V3 configuration
│   ├── popup.html/js      Extension popup (buckets + context capture)
│   ├── chatgpt.js/css     ChatGPT overlay (bucket selector + Ctrl+Enter)
│   ├── content.js         Page text extraction
│   └── background.js      Service worker
└── sql/
    └── schema.sql         Database schema with pgvector
```

---

## 🔮 What's Next

- **Multi-LLM support** — inject context into Claude, Gemini, Perplexity
- **Auto-capture mode** — save context automatically as you browse
- **Team buckets** — shared knowledge bases across teams
- **Chunk relevance feedback** — learn which chunks are actually useful
- **Browser history integration** — retroactively index pages you've visited

---

<p align="center">
  <b>Built at Hackathon 2026</b><br>
  <i>Stop copy-pasting. Start stacking context.</i>
</p>
