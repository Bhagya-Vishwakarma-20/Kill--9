const express = require("express");
const pool = require("./db");
const { chunkText } = require("./chunker");
const { getEmbedding, getEmbeddings } = require("./embedding");
const { findSimilarChunks, getDefaultBucket } = require("./rag");
const { detectIntent } = require("./intentDetector");
const { expandQuery } = require("./queryExpander");
const pgvector = require("pgvector/pg");

const router = express.Router();

router.post("/bucket", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name)
      return res.status(400).json({ error: "Bucket name is required" });

    const result = await pool.query(
      "INSERT INTO buckets (name) VALUES ($1) RETURNING *",
      [name],
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

router.get("/buckets", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM buckets ORDER BY created_at DESC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get buckets" });
  }
});

router.post("/context", async (req, res) => {
  try {
    const { url, title, text, bucket_id, severity } = req.body;

    if (!text || !bucket_id) {
      return res.status(400).json({ error: "text and bucket_id are required" });
    }

    const validSeverities = ["low", "medium", "high"];
    const normalizedSeverity = validSeverities.includes(severity)
      ? severity
      : "medium";

    const pageResult = await pool.query(
      "INSERT INTO pages (bucket_id, url, title, severity) VALUES ($1, $2, $3, $4) RETURNING id",
      [bucket_id, url || "", title || "", normalizedSeverity],
    );
    const pageId = pageResult.rows[0].id;

    const chunks = chunkText(text);
    console.log(
      `Chunked into ${chunks.length} chunks with severity: ${normalizedSeverity}`,
    );

    const embeddings = await getEmbeddings(chunks);

    for (let i = 0; i < chunks.length; i++) {
      const embeddingStr = pgvector.toSql(embeddings[i]);
      await pool.query(
        `INSERT INTO chunks (page_id, bucket_id, chunk_text, url, severity, embedding) 
         VALUES ($1, $2, $3, $4, $5, $6::vector)`,
        [
          pageId,
          bucket_id,
          chunks[i],
          url || "",
          normalizedSeverity,
          embeddingStr,
        ],
      );
    }

    res.json({
      message: "Context saved",
      page_id: pageId,
      chunks_count: chunks.length,
      severity: normalizedSeverity,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save context" });
  }
});

router.post("/retrieve", async (req, res) => {
  try {
    let { query, bucket_id, bucket_ids } = req.body;

    if (!query) return res.status(400).json({ error: "query is required" });

    let ids = [];
    if (bucket_ids && Array.isArray(bucket_ids) && bucket_ids.length > 0) {
      ids = bucket_ids.map((id) => parseInt(id));
    } else if (bucket_id) {
      ids = [parseInt(bucket_id)];
    } else {
      const defaultId = await getDefaultBucket();
      if (!defaultId) {
        return res
          .status(400)
          .json({ error: "No buckets found. Create one first." });
      }
      ids = [defaultId];
    }

    const { intent, confidence, scores } = await detectIntent(query);
    const expandedQuery = expandQuery(query, intent);
    console.log(`[Intent] "${query}" → intent=${intent} (confidence=${confidence}) → "${expandedQuery}"`);

    const queryEmbedding = await getEmbedding(expandedQuery);
    const chunks = await findSimilarChunks(queryEmbedding, ids);

    if (chunks.length === 0) {
      return res.json({ chunks: [], context: "", intent, expandedQuery });
    }

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
      intent,
      expandedQuery,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve chunks" });
  }
});
router.delete("/bucket/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const bucket = await pool.query("SELECT name FROM buckets WHERE id = $1", [id]);
    if (bucket.rows.length === 0) {
      return res.status(404).json({ error: "Bucket not found" });
    }

    const queryIds = await pool.query("SELECT id FROM queries WHERE bucket_id = $1", [id]);
    for (const q of queryIds.rows) {
      await pool.query("DELETE FROM answers WHERE query_id = $1", [q.id]);
    }
    await pool.query("DELETE FROM queries WHERE bucket_id = $1", [id]);
    await pool.query("DELETE FROM chunks WHERE bucket_id = $1", [id]);
    const pageIds = await pool.query("SELECT id FROM pages WHERE bucket_id = $1", [id]);
    for (const p of pageIds.rows) {
      await pool.query("DELETE FROM chunks WHERE page_id = $1", [p.id]);
    }
    await pool.query("DELETE FROM pages WHERE bucket_id = $1", [id]);
    await pool.query("DELETE FROM buckets WHERE id = $1", [id]);

    res.json({ message: "Bucket deleted", name: bucket.rows[0].name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete bucket" });
  }
});

module.exports = router;
