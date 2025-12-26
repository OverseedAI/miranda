import { db } from "../client";
import type { Statement } from "bun:sqlite";

export interface Article {
    id: string;
    url: string;
    title: string;
    summary: string | null;
    rawContent: string | null;
    source: string;
    publishedAt: string | null;
    crawledAt: string;
    isVideoWorthy: boolean;
    videoWorthinessScore: number | null;
    analysisCategory: string | null;
    analysisJson: string | null;
    alertedAt: string | null;
    createdAt: string;
}

export interface InsertArticle {
    url: string;
    title: string;
    summary?: string | null;
    rawContent?: string | null;
    source: string;
    publishedAt?: string | null;
    isVideoWorthy?: boolean;
    videoWorthinessScore?: number | null;
    analysisCategory?: string | null;
    analysisJson?: string | null;
}

// Convert snake_case DB row to camelCase Article
function rowToArticle(row: Record<string, unknown>): Article {
    return {
        id: row.id as string,
        url: row.url as string,
        title: row.title as string,
        summary: row.summary as string | null,
        rawContent: row.raw_content as string | null,
        source: row.source as string,
        publishedAt: row.published_at as string | null,
        crawledAt: row.crawled_at as string,
        isVideoWorthy: Boolean(row.is_video_worthy),
        videoWorthinessScore: row.video_worthiness_score as number | null,
        analysisCategory: row.analysis_category as string | null,
        analysisJson: row.analysis_json as string | null,
        alertedAt: row.alerted_at as string | null,
        createdAt: row.created_at as string,
    };
}

// Lazy-loaded prepared statements (initialized on first use after DB is ready)
let _insertStmt: Statement | null = null;
let _findByUrlStmt: Statement | null = null;
let _findByIdStmt: Statement | null = null;
let _findRecentStmt: Statement | null = null;
let _findRecentVideoWorthyStmt: Statement | null = null;
let _markAsAlertedStmt: Statement | null = null;
let _searchByContentStmt: Statement | null = null;
let _findSimilarRecentStmt: Statement | null = null;
let _findUnalertedVideoWorthyStmt: Statement | null = null;

function getInsertStmt() {
    if (!_insertStmt) {
        _insertStmt = db.prepare(`
      INSERT INTO articles (url, title, summary, raw_content, source, published_at, is_video_worthy, video_worthiness_score, analysis_category, analysis_json)
      VALUES ($url, $title, $summary, $rawContent, $source, $publishedAt, $isVideoWorthy, $videoWorthinessScore, $analysisCategory, $analysisJson)
      RETURNING *
    `);
    }
    return _insertStmt;
}

function getFindByUrlStmt() {
    if (!_findByUrlStmt) {
        _findByUrlStmt = db.prepare(`SELECT * FROM articles WHERE url = $url`);
    }
    return _findByUrlStmt;
}

function getFindByIdStmt() {
    if (!_findByIdStmt) {
        _findByIdStmt = db.prepare(`SELECT * FROM articles WHERE id = $id`);
    }
    return _findByIdStmt;
}

function getFindRecentStmt() {
    if (!_findRecentStmt) {
        _findRecentStmt = db.prepare(
            `SELECT * FROM articles ORDER BY crawled_at DESC LIMIT $limit`
        );
    }
    return _findRecentStmt;
}

function getFindRecentVideoWorthyStmt() {
    if (!_findRecentVideoWorthyStmt) {
        _findRecentVideoWorthyStmt = db.prepare(
            `SELECT * FROM articles WHERE is_video_worthy = 1 ORDER BY crawled_at DESC LIMIT $limit`
        );
    }
    return _findRecentVideoWorthyStmt;
}

function getMarkAsAlertedStmt() {
    if (!_markAsAlertedStmt) {
        _markAsAlertedStmt = db.prepare(
            `UPDATE articles SET alerted_at = datetime('now') WHERE id = $id`
        );
    }
    return _markAsAlertedStmt;
}

function getSearchByContentStmt() {
    if (!_searchByContentStmt) {
        _searchByContentStmt = db.prepare(`
      SELECT * FROM articles
      WHERE title LIKE $query OR summary LIKE $query OR raw_content LIKE $query
      ORDER BY crawled_at DESC
      LIMIT $limit
    `);
    }
    return _searchByContentStmt;
}

function getFindSimilarRecentStmt() {
    if (!_findSimilarRecentStmt) {
        _findSimilarRecentStmt = db.prepare(`
      SELECT * FROM articles
      WHERE (title LIKE $query OR summary LIKE $query)
      AND crawled_at > datetime('now', $daysAgo)
      ORDER BY crawled_at DESC
      LIMIT $limit
    `);
    }
    return _findSimilarRecentStmt;
}

function getFindUnalertedVideoWorthyStmt() {
    if (!_findUnalertedVideoWorthyStmt) {
        _findUnalertedVideoWorthyStmt = db.prepare(`
      SELECT * FROM articles
      WHERE is_video_worthy = 1
      AND alerted_at IS NULL
      AND video_worthiness_score >= $threshold
      ORDER BY video_worthiness_score DESC
    `);
    }
    return _findUnalertedVideoWorthyStmt;
}

export const articlesRepo = {
    insert(article: InsertArticle): Article {
        const row = getInsertStmt().get({
            $url: article.url,
            $title: article.title,
            $summary: article.summary ?? null,
            $rawContent: article.rawContent ?? null,
            $source: article.source,
            $publishedAt: article.publishedAt ?? null,
            $isVideoWorthy: article.isVideoWorthy ? 1 : 0,
            $videoWorthinessScore: article.videoWorthinessScore ?? null,
            $analysisCategory: article.analysisCategory ?? null,
            $analysisJson: article.analysisJson ?? null,
        }) as Record<string, unknown>;
        return rowToArticle(row);
    },

    findByUrl(url: string): Article | null {
        const row = getFindByUrlStmt().get({ $url: url }) as Record<string, unknown> | null;
        return row ? rowToArticle(row) : null;
    },

    findById(id: string): Article | null {
        const row = getFindByIdStmt().get({ $id: id }) as Record<string, unknown> | null;
        return row ? rowToArticle(row) : null;
    },

    findRecent(limit = 20): Article[] {
        const rows = getFindRecentStmt().all({ $limit: limit }) as Record<string, unknown>[];
        return rows.map(rowToArticle);
    },

    findRecentVideoWorthy(limit = 20): Article[] {
        const rows = getFindRecentVideoWorthyStmt().all({
            $limit: limit,
        }) as Record<string, unknown>[];
        return rows.map(rowToArticle);
    },

    markAsAlerted(id: string): void {
        getMarkAsAlertedStmt().run({ $id: id });
    },

    searchByContent(query: string, limit = 10): Article[] {
        const rows = getSearchByContentStmt().all({
            $query: `%${query}%`,
            $limit: limit,
        }) as Record<string, unknown>[];
        return rows.map(rowToArticle);
    },

    findSimilarRecent(topic: string, daysBack = 7, limit = 5): Article[] {
        const rows = getFindSimilarRecentStmt().all({
            $query: `%${topic}%`,
            $daysAgo: `-${daysBack} days`,
            $limit: limit,
        }) as Record<string, unknown>[];
        return rows.map(rowToArticle);
    },

    findUnalertedVideoWorthy(threshold = 70): Article[] {
        const rows = getFindUnalertedVideoWorthyStmt().all({
            $threshold: threshold,
        }) as Record<string, unknown>[];
        return rows.map(rowToArticle);
    },

    exists(url: string): boolean {
        return this.findByUrl(url) !== null;
    },
};
