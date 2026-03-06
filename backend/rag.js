const pool = require("./db");
const pgvector = require("pgvector/pg");

async function findSimilarChunks(queryEmbedding, bucketIds, limit = 5) {
  const ids = Array.isArray(bucketIds) ? bucketIds : [bucketIds];
  const embeddingStr = pgvector.toSql(queryEmbedding);
  const result = await pool.query(
    `SELECT chunk_text, url, severity,
                1 - (embedding <=> $1::vector) AS similarity,
                CASE 
                    WHEN severity = 'high' THEN 0.15
                    WHEN severity = 'medium' THEN 0.05
                    WHEN severity = 'low' THEN 0.0
                    ELSE 0.0
                END AS severity_boost,
                (1 - (embedding <=> $1::vector)) + 
                CASE 
                    WHEN severity = 'high' THEN 0.15
                    WHEN severity = 'medium' THEN 0.05
                    WHEN severity = 'low' THEN 0.0
                    ELSE 0.0
                END AS final_score
     FROM chunks
     WHERE bucket_id = ANY($2::int[])
     ORDER BY final_score DESC, embedding <=> $1::vector
     LIMIT $3`,
    [embeddingStr, ids, limit],
  );
  return result.rows;
}

async function getDefaultBucket() {
  const result = await pool.query(
    `SELECT id FROM buckets ORDER BY created_at DESC LIMIT 1`,
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
}

module.exports = { findSimilarChunks, getDefaultBucket };
