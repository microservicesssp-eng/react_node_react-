import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import express from "express";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const databasePath = resolve(process.env.DB_PATH || resolve(projectRoot, "data/messages.db"));
mkdirSync(dirname(databasePath), { recursive: true });

const database = new Database(databasePath);
database.pragma("journal_mode = WAL");
database.pragma("foreign_keys = ON");
database.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT NOT NULL CHECK(length(sender) BETWEEN 1 AND 60),
    text TEXT NOT NULL CHECK(length(text) BETWEEN 1 AND 2000),
    received_at TEXT NOT NULL
  )
`);

const insertMessage = database.prepare(
  "INSERT INTO messages (sender, text, received_at) VALUES (?, ?, ?)"
);
const listMessages = database.prepare(
  "SELECT id, sender, text, received_at AS receivedAt FROM messages ORDER BY id DESC LIMIT ?"
);

export const app = express();
app.use(express.json({ limit: "16kb" }));

app.get("/api/messages", (request, response) => {
  const rawLimit = Number(request.query.limit ?? 100);
  if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 500) {
    return response.status(400).json({ error: "Параметр limit должен быть числом от 1 до 500." });
  }

  return response.json(listMessages.all(rawLimit).reverse());
});

app.post("/api/messages", (request, response) => {
  const sender = typeof request.body?.sender === "string" ? request.body.sender.trim() : "";
  const text = typeof request.body?.text === "string" ? request.body.text.trim() : "";

  if (!sender || sender.length > 60) {
    return response.status(400).json({ error: "Имя отправителя должно содержать от 1 до 60 символов." });
  }
  if (!text || text.length > 2000) {
    return response.status(400).json({ error: "Сообщение должно содержать от 1 до 2000 символов." });
  }

  const receivedAt = new Date().toISOString();
  const result = insertMessage.run(sender, text, receivedAt);
  return response.status(201).json({
    id: Number(result.lastInsertRowid),
    sender,
    text,
    receivedAt
  });
});

app.use((error, _request, response, _next) => {
  console.error("Ошибка API:", error);
  if (error instanceof SyntaxError && "body" in error) {
    return response.status(400).json({ error: "Тело запроса должно быть корректным JSON." });
  }
  return response.status(500).json({ error: "Внутренняя ошибка сервера." });
});

const port = Number(process.env.PORT || 3001);
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`API работает: http://localhost:${port}`);
  console.log(`SQLite база: ${databasePath}`);
});

function closeServer() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on("SIGINT", closeServer);
process.on("SIGTERM", closeServer);
