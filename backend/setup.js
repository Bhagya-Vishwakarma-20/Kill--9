const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function setup() {
    console.log("Connecting to database...");

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        const test = await pool.query("SELECT 1 as connected");
        console.log("Connected to Neon!");

        const schema = fs.readFileSync(
            path.join(__dirname, "..", "sql", "schema.sql"),
            "utf-8"
        );

        const statements = schema
            .split(";")
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const stmt of statements) {
            try {
                await pool.query(stmt);
                console.log("OK:", stmt.substring(0, 60) + "...");
            } catch (err) {
                if (err.message.includes("already exists")) {
                    console.log("SKIP (already exists):", stmt.substring(0, 60) + "...");
                } else {
                    console.error("FAIL:", err.message);
                    console.error("Statement:", stmt.substring(0, 100));
                }
            }
        }

        console.log("\nDone! All tables created.");
    } catch (err) {
        console.error("Connection failed:", err.message);
    }

    await pool.end();
    process.exit(0);
}

setup();
