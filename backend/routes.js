const express = require("express");
const pool = require("./db");
const { chunkText } = require("./chunker");
const { getEmbedding, getEmbeddings } = require("./embedding");
const { findSimilarChunks, getDefaultBucket } = require("./rag");
const pgvector = require("pgvector/pg");

const router = express.Router();

// Create a new bucket
router.post("/bucket", async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: "Bucket name is required" });

        const result = await pool.query(
            "INSERT INTO buckets (name) VALUES ($1) RETURNING *",
            [name]
        );
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === "23505") {
            return res.status(400).json({ error: "Bucket already exists" });
        }
        console.error(err);
        res.status(500).json({ error: "Failed to create bucket" });
    }
});

// List all buckets
router.get("/buckets", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM buckets ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to get buckets" });
    }
});

// Save page context - chunk, embed, store
router.post("/context", async (req, res) => {
    try {
        const { url, title, text, bucket_id } = req.body;

        if (!text || !bucket_id) {
            return res.status(400).json({ error: "text and bucket_id are required" });
        }

        const pageResult = await pool.query(
            "INSERT INTO pages (bucket_id, url, title) VALUES ($1, $2, $3) RETURNING id",
            [bucket_id, url || "", title || ""]
        );
        const pageId = pageResult.rows[0].id;

        const chunks = chunkText(text);
        console.log(`Chunked into ${chunks.length} chunks`);

        const embeddings = await getEmbeddings(chunks);

        for (let i = 0; i < chunks.length; i++) {
            const embeddingStr = pgvector.toSql(embeddings[i]);
            await pool.query(
                `INSERT INTO chunks (page_id, bucket_id, chunk_text, url, embedding) 
         VALUES ($1, $2, $3, $4, $5::vector)`,
                [pageId, bucket_id, chunks[i], url || "", embeddingStr]
            );
        }

        res.json({
            message: "Context saved",
            page_id: pageId,
            chunks_count: chunks.length,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save context" });
    }
});

// Retrieve relevant chunks (no LLM call)
router.post("/retrieve", async (req, res) => {
    try {
        let { query, bucket_id } = req.body;

        if (!query) return res.status(400).json({ error: "query is required" });

        if (!bucket_id) {
            bucket_id = await getDefaultBucket();
            if (!bucket_id) {
                return res.status(400).json({ error: "No buckets found. Create one first." });
            }
        }

        const queryEmbedding = await getEmbedding(query);
        const chunks = await findSimilarChunks(queryEmbedding, bucket_id);

        if (chunks.length === 0) {
            return res.json({ chunks: [], context: "" });
        }

        // Build formatted context string
        const context = chunks
            .map((c) => `[Source: ${c.url}]\n${c.chunk_text}`)
            .join("\n\n---\n\n");

        res.json({
            chunks: chunks.map((c) => ({
                text: c.chunk_text,
                url: c.url,
                similarity: c.similarity,
            })),
            context,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to retrieve chunks" });
    }
});

module.exports = router;
