const pool = require("./db");
const pgvector = require("pgvector/pg");

// Find similar chunks from a bucket using cosine similarity
async function findSimilarChunks(queryEmbedding, bucketId, limit = 5) {
    const embeddingStr = pgvector.toSql(queryEmbedding);
    const result = await pool.query(
        `SELECT chunk_text, url, 1 - (embedding <=> $1::vector) AS similarity
     FROM chunks
     WHERE bucket_id = $2
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
        [embeddingStr, bucketId, limit]
    );
    return result.rows;
}

// Get the most recent bucket
async function getDefaultBucket() {
    const result = await pool.query(
        `SELECT id FROM buckets ORDER BY created_at DESC LIMIT 1`
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
}

module.exports = { findSimilarChunks, getDefaultBucket };
