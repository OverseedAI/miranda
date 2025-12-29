import { action } from './_generated/server';
import { v } from 'convex/values';
import { createThread } from '@convex-dev/agent';
import { components } from './_generated/api';

import { Agent } from '@convex-dev/agent';
import { openai } from '@ai-sdk/openai';

const agent = new Agent(components.agent, {
    name: 'My Agent',
    languageModel: openai.chat('gpt-4o-mini'),
    instructions: 'You are a weather forecaster.',
    // tools: { getWeather, getGeocoding },
    maxSteps: 10,
});

export const startScan = action({
    args: { city: v.string() },
    handler: async (ctx, { city }) => {
        const threadId = await createThread(ctx, components.agent);
        const prompt = `What is the weather in ${city}?`;
        const result = await agent.generateText(ctx, { threadId }, { prompt });
        return result.text;
    },
});
