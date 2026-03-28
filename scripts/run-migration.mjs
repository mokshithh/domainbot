import pg from "pg";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, "../migration_v2.sql"), "utf8");

// Try multiple connection strings
const configs = [
  // IPv4 pooler — session mode (port 5432)
  "postgresql://postgres.ycweeokolwzziqcsdpww:ClaudeCodeisthebest@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
  "postgresql://postgres.ycweeokolwzziqcsdpww:ClaudeCodeisthebest@aws-0-eu-west-1.pooler.supabase.com:5432/postgres",
  "postgresql://postgres.ycweeokolwzziqcsdpww:ClaudeCodeisthebest@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
  // transaction pooler (port 6543)
  "postgresql://postgres.ycweeokolwzziqcsdpww:ClaudeCodeisthebest@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
];

async function tryConnect(connString) {
  const client = new pg.Client({
    connectionString: connString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    console.log("Connected via:", connString.split("@")[1]);
    return client;
  } catch (e) {
    console.log("Failed:", connString.split("@")[1], "—", e.message.slice(0, 80));
    return null;
  }
}

async function main() {
  let client = null;

  for (const c of configs) {
    client = await tryConnect(c);
    if (client) break;
  }

  if (!client) {
    console.error("\nAll connections failed. Check your Supabase dashboard for the correct connection string.");
    process.exit(1);
  }

  try {
    console.log("\nRunning migration...");
    // Split on semicolons but skip comment-only blocks
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const stmt of statements) {
      try {
        await client.query(stmt);
        const preview = stmt.replace(/\s+/g, " ").slice(0, 60);
        console.log("  ✓", preview);
      } catch (e) {
        // Ignore "already exists" errors gracefully
        if (e.message.includes("already exists") || e.message.includes("does not exist")) {
          console.log("  ~ skipped (idempotent):", stmt.replace(/\s+/g, " ").slice(0, 50));
        } else {
          console.error("  ✗ Error:", e.message, "\n   SQL:", stmt.replace(/\s+/g, " ").slice(0, 80));
        }
      }
    }
    console.log("\nMigration complete!");
  } finally {
    await client.end();
  }
}

main().catch(console.error);
