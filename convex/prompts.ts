export type VideoAnalyzerPromptConfig = {
    version: number;
    focusAreas: string[];
    recommendationGuidelines: string[];
    styleNotes: string;
};

const MAX_LIST_ITEMS = 20;
const MAX_LINE_LENGTH = 300;
const MAX_STYLE_NOTES_LENGTH = 1200;

export const DEFAULT_VIDEO_ANALYZER_PROMPT_CONFIG: VideoAnalyzerPromptConfig = {
    version: 1,
    focusAreas: [
        'AI coding tools (Claude Code, Cursor, GitHub Copilot, Kiro.dev, Windsurf, etc.)',
        'LLM releases and updates (GPT, Claude, Gemini, Llama, etc.)',
        'Best practices for AI-assisted development',
        'AI impact on software developer jobs and economics',
        'AI infrastructure (data centers, compute, training costs)',
        'Agentic AI and autonomous coding systems',
        'Practical tutorials and workflows using AI tools',
    ],
    recommendationGuidelines: [
        'highly_recommended: Breaking news about major AI tools/models, significant industry shifts, or highly actionable developer content',
        'recommended: Useful updates, interesting trends, or solid tutorial material',
        'maybe: Tangentially relevant or already well-covered elsewhere',
        'not_recommended: Off-topic, outdated, or not relevant to AI software development',
    ],
    styleNotes:
        'Prioritize practical insights for software engineers and concrete implications for building products.',
};

function normalizeLines(value: unknown): string[] {
    if (!Array.isArray(value)) return [];

    return value
        .filter((line): line is string => typeof line === 'string')
        .map((line) => line.trim().replace(/\s+/g, ' '))
        .filter((line) => line.length > 0)
        .map((line) => line.slice(0, MAX_LINE_LENGTH))
        .slice(0, MAX_LIST_ITEMS);
}

export function normalizeVideoAnalyzerPromptConfig(value: unknown): VideoAnalyzerPromptConfig {
    if (!value || typeof value !== 'object') {
        return DEFAULT_VIDEO_ANALYZER_PROMPT_CONFIG;
    }

    const config = value as Record<string, unknown>;
    const parsedVersion = Number(config.version);
    const version =
        Number.isInteger(parsedVersion) && parsedVersion > 0
            ? parsedVersion
            : DEFAULT_VIDEO_ANALYZER_PROMPT_CONFIG.version;

    const focusAreas = normalizeLines(config.focusAreas);
    const recommendationGuidelines = normalizeLines(config.recommendationGuidelines);
    const styleNotes =
        typeof config.styleNotes === 'string'
            ? config.styleNotes.trim().slice(0, MAX_STYLE_NOTES_LENGTH)
            : '';

    return {
        version,
        focusAreas:
            focusAreas.length > 0
                ? focusAreas
                : DEFAULT_VIDEO_ANALYZER_PROMPT_CONFIG.focusAreas,
        recommendationGuidelines:
            recommendationGuidelines.length > 0
                ? recommendationGuidelines
                : DEFAULT_VIDEO_ANALYZER_PROMPT_CONFIG.recommendationGuidelines,
        styleNotes: styleNotes || DEFAULT_VIDEO_ANALYZER_PROMPT_CONFIG.styleNotes,
    };
}

export const VIDEO_ANALYZER_INSTRUCTIONS = `
You are an AI content analyst for a software developer who creates YouTube videos about AI in software development. Your job is to evaluate news articles and determine their potential for video content aimed at developers interested in AI tooling and the future of software engineering.

Score each article on these criteria (1-10 scale). For each criterion, provide both a numeric score and a brief 1-sentence explanation justifying that score:

1. Relevance: How relevant is this to AI-assisted software development or the AI developer ecosystem?
2. Uniqueness: Does this offer fresh insights, breaking news, or an underexplored angle?
3. Engagement: Would this spark discussion among developers? Is it timely or controversial?
4. Credibility: Is the source reputable? Is the information verifiable?

Respond with a JSON object in this exact format:
{
    "summary": "Brief 2-3 sentence summary focused on why developers should care",
    "relevance": 7,
    "relevanceSummary": "Brief explanation for the relevance score",
    "uniqueness": 8,
    "uniquenessSummary": "Brief explanation for the uniqueness score",
    "engagement": 6,
    "engagementSummary": "Brief explanation for the engagement score",
    "credibility": 9,
    "credibilitySummary": "Brief explanation for the credibility score",
    "recommendation": "recommended",
    "videoAngle": "Specific video hook or title angle for a developer audience"
}

Scores must be integers from 1-10.
`;

export const videoAnalyzerPrompt = (article: {
    title: string;
    url: string;
    publishedAt: string;
    content?: string;
}, config: VideoAnalyzerPromptConfig) => `Analyze this article for YouTube video potential targeting software developers interested in AI:

Prompt Version: ${config.version}

Configured Focus Areas:
${config.focusAreas.map((area) => `- ${area}`).join('\n')}

Recommendation Rubric:
${config.recommendationGuidelines.map((guideline) => `- ${guideline}`).join('\n')}

Style Notes:
${config.styleNotes}

Title: ${article.title}
URL: ${article.url}
Published: ${article.publishedAt}

Article Content:
${article.content || 'No extracted content available. Analyze using title and source context only.'}

Respond with the JSON analysis.`;
