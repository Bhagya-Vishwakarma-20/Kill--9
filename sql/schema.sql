-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Buckets table
CREATE TABLE buckets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pages table
CREATE TABLE pages (
  id SERIAL PRIMARY KEY,
  bucket_id INTEGER REFERENCES buckets(id),
  url TEXT NOT NULL,
  title TEXT,
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Chunks table with vector embedding
CREATE TABLE chunks (
  id SERIAL PRIMARY KEY,
  page_id INTEGER REFERENCES pages(id),
  bucket_id INTEGER REFERENCES buckets(id),
  chunk_text TEXT NOT NULL,
  url TEXT,
  severity VARCHAR(20) DEFAULT 'medium',
  embedding vector(768),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Queries table
CREATE TABLE queries (
  id SERIAL PRIMARY KEY,
  query_text TEXT NOT NULL,
  embedding vector(768),
  bucket_id INTEGER REFERENCES buckets(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Answers table
CREATE TABLE answers (
  id SERIAL PRIMARY KEY,
  query_id INTEGER REFERENCES queries(id),
  answer_text TEXT NOT NULL,
  context_used TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast cosine similarity search on chunks
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);

-- Index for fast cosine similarity search on queries
CREATE INDEX ON queries USING hnsw (embedding vector_cosine_ops);
