import { db } from "./client";

export function initDatabase(): void {
  // Articles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      url TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      raw_content TEXT,
      source TEXT NOT NULL,
      published_at TEXT,
      crawled_at TEXT NOT NULL DEFAULT (datetime('now')),

      -- Analysis results
      is_video_worthy INTEGER DEFAULT 0,
      video_worthiness_score INTEGER,
      analysis_category TEXT,
      analysis_json TEXT,

      -- Alert tracking
      alerted_at TEXT,

      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);
    CREATE INDEX IF NOT EXISTS idx_articles_crawled_at ON articles(crawled_at);
    CREATE INDEX IF NOT EXISTS idx_articles_video_worthy ON articles(is_video_worthy);
    CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
    CREATE INDEX IF NOT EXISTS idx_articles_url ON articles(url);
  `);

  // Conversation threads for Slack Q&A
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversation_threads (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      slack_thread_ts TEXT UNIQUE NOT NULL,
      slack_channel_id TEXT NOT NULL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_activity_at TEXT NOT NULL DEFAULT (datetime('now')),
      messages_json TEXT
    )
  `);

  // Alert history
  db.exec(`
    CREATE TABLE IF NOT EXISTS alert_history (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      article_id TEXT NOT NULL,
      sent_at TEXT NOT NULL DEFAULT (datetime('now')),
      slack_message_ts TEXT,
      slack_channel_id TEXT,
      FOREIGN KEY (article_id) REFERENCES articles(id)
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_alert_history_article ON alert_history(article_id);
  `);

  console.log("Database initialized successfully");
}
