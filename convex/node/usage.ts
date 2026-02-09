import type { UsageHandler } from '@convex-dev/agent';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

type UsageContext = {
    scanId?: Id<'scans'>;
    articleId?: Id<'articles'>;
};

export function createUsageHandler(context: UsageContext): UsageHandler {
    return async (ctx, args) => {
        const promptTokens = args.usage.inputTokens ?? 0;
        const completionTokens = args.usage.outputTokens ?? 0;
        const totalTokens = args.usage.totalTokens ?? promptTokens + completionTokens;

        await ctx.runMutation(internal.services.usage.recordUsage, {
            provider: args.provider,
            model: args.model,
            agentName: args.agentName,
            promptTokens,
            completionTokens,
            totalTokens,
            reasoningTokens: args.usage.reasoningTokens,
            cachedInputTokens: args.usage.cachedInputTokens,
            userId: args.userId,
            threadId: args.threadId,
            scanId: context.scanId,
            articleId: context.articleId,
        });
    };
}
