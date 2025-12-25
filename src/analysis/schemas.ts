import * as z from "zod";

export const VideoWorthinessSchema = z.object({
  isVideoWorthy: z
    .boolean()
    .describe("Whether this article warrants creating a YouTube video"),
  score: z
    .number()
    .min(0)
    .max(100)
    .describe("Video-worthiness score from 0-100"),
  category: z
    .enum([
      "major_product_launch",
      "industry_impact",
      "trending_viral",
      "developer_tools",
      "research_breakthrough",
      "pricing_change",
      "api_update",
      "not_video_worthy",
    ])
    .describe("Primary category of the news"),
  reasoning: z
    .string()
    .describe("Brief 1-2 sentence explanation for the decision"),
  suggestedTitle: z
    .string()
    .optional()
    .describe("Suggested YouTube video title if worthy"),
  keyPoints: z
    .array(z.string())
    .describe("3-5 key talking points for potential video"),
  urgency: z
    .enum(["breaking", "timely", "evergreen"])
    .describe("How time-sensitive is this news"),
});

export type VideoWorthiness = z.infer<typeof VideoWorthinessSchema>;
