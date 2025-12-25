import { Database } from "bun:sqlite";
import { config } from "../config";

// Create database with WAL mode for better concurrent access
export const db = new Database(config.dbPath, { create: true });

// Enable WAL mode for better performance
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");
