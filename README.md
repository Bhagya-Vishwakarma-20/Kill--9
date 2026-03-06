# Context Stack

Browser extension + backend RAG system for contextual LLM assistance.

Save page context into **Context Buckets**, then ask questions that get answered using the saved context via RAG (Retrieval Augmented Generation).

## Tech Stack

| Component | Tool |
|-----------|------|
| Backend | Node.js + Express |
| Database | PostgreSQL + pgvector |
| Embeddings | Gemini `text-embedding-004` (free) |
| LLM | Gemini `gemini-2.0-flash` (free) |
| Extension | Chrome Manifest V3 |

## Setup

### 1. Prerequisites

- **Node.js** 18+
- **PostgreSQL** with [pgvector extension](https://github.com/pgvector/pgvector)
- **Gemini API Key** (free): [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 2. Database Setup

Create a PostgreSQL database and run the schema:

```bash
createdb contextstack
psql contextstack < sql/schema.sql
```

> **Note**: pgvector must be installed. On Ubuntu: `sudo apt install postgresql-16-pgvector`. On Mac: `brew install pgvector`.

### 3. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL and GEMINI_API_KEY

npm install
npm start
```

Server runs on `http://localhost:3000`.

### 4. Extension Setup

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Pin the extension to toolbar

## How It Works

1. **Create a bucket** (e.g., "research", "docs")
2. Browse to any page → click **Load Context** to save page content
3. Type a question → get AI answers using your saved context
4. Similar questions return cached answers instantly

## API Examples

### Create Bucket

```bash
curl -X POST http://localhost:3000/bucket \
  -H "Content-Type: application/json" \
  -d '{"name": "research"}'
```

### Save Context

```bash
curl -X POST http://localhost:3000/context \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "title": "Example Page",
    "text": "This is the full page text content...",
    "bucket_id": 1
  }'
```

### Ask Question

```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is this page about?",
    "bucket_id": 1
  }'
```

### List Buckets

```bash
curl http://localhost:3000/buckets
```

### Health Check

```bash
curl http://localhost:3000/health
```

## File Structure

```
Context Stack/
├── backend/
│   ├── package.json
│   ├── server.js        # Express entry point
│   ├── db.js            # PostgreSQL connection
│   ├── chunker.js       # Text splitting
│   ├── embedding.js     # Gemini embeddings
│   ├── rag.js           # RAG logic + LLM
│   ├── routes.js        # API endpoints
│   └── .env.example
├── extension/
│   ├── manifest.json    # MV3 config
│   ├── popup.html       # Extension UI
│   ├── popup.js         # UI logic
│   ├── content.js       # Page text extraction
│   └── background.js    # Service worker
├── sql/
│   └── schema.sql       # Database schema
└── README.md
```
