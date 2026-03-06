const { Pool } = require("pg");
const pgvector = require("pgvector/pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Register pgvector type on first connect
pool.on("connect", async (client) => {
  await pgvector.registerTypes(client);
});

module.exports = pool;
