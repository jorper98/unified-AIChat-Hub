import { logToServer } from './logger';
import { queryPerplexity } from './perplexity';
import { MODEL_PRICING } from './tokens';

export interface RouterResult {
  route: 'web_search' | 'direct_reply' | 'image_generation';
  searchQuery?: string;
  imagePrompt?: string;
  format?: 'full_answer' | 'snippets';
  promptTokens: number;
  completionTokens: number;
  cost: number;
}

const ROUTER_SYSTEM_PROMPT = `You are an intent classification router for a chatbot. Analyze the user's latest message and classify it into exactly one route:

- "web_search": The user is asking about real-time information, current events, news, live data, recent updates, time-sensitive facts, sports scores, stock prices, weather forecasts, or anything requiring current web knowledge beyond a static knowledge cutoff. ALSO route here when the user asks about familiarity with a person, place, concept, or topic (e.g., "are you familiar with...", "do you know about...", "have you heard of...") since these often require verifying current information.
- "image_generation": The user is requesting, asking for, or describing an image to be generated. This includes requests like "draw me...", "create an image of...", "generate a picture of...", "show me a photo of...", etc.
- "direct_reply": The user is asking about general knowledge, creative writing, code help, analysis, opinions, math, logic, conversation, greetings, or anything that can be answered without live web data.

When classifying as "web_search", also:
1. Provide a refined, concise search query optimized for web search engines
2. Decide the response format:
   - "full_answer": For factual, straightforward, time-sensitive queries (news, scores, prices, simple facts)
   - "snippets": For complex, multi-part, analytical, comparison, or opinion-seeking queries that need multiple sources

When classifying as "image_generation", also provide an "imagePrompt" field with a clear, detailed prompt suitable for an image generation model.

Rules:
- Follow-up messages that reference prior context may still need web search if the topic requires real-time data
- When the user asks about familiarity or knowledge of a specific topic/person/thing, prefer "web_search" to verify current information
- Do NOT route to "web_search" for simple time, date, or day-of-week questions (e.g., "what time is it", "what day is today", "what's the date"). These are already answered by the system context injection and should go to "direct_reply"
- Keep search queries concise and specific
- Only output valid JSON matching the schema`;

const ROUTER_JSON_SCHEMA = {
  type: 'object' as const,
  properties: {
    route: {
      type: 'string' as const,
      enum: ['web_search', 'direct_reply', 'image_generation'],
    },
    searchQuery: {
      type: 'string' as const,
      description: 'Refined search query for web search. Use empty string if route is not web_search.',
    },
    imagePrompt: {
      type: 'string' as const,
      description: 'Detailed image generation prompt. Use empty string if route is not image_generation.',
    },
    format: {
      type: 'string' as const,
      enum: ['full_answer', 'snippets'],
      description: 'Response format for web search. Use full_answer if route is not web_search.',
    },
  },
  required: ['route', 'searchQuery', 'imagePrompt', 'format'],
  additionalProperties: false,
};

export async function classifyIntent(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  routerModel: string = 'openai/gpt-4o-mini',
): Promise<RouterResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log('[Router] OpenRouter API key not configured, defaulting to direct_reply');
    return { route: 'direct_reply', promptTokens: 0, completionTokens: 0, cost: 0 };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), parseInt(process.env.ROUTER_TIMEOUT_MS || '5000', 10));

    const messages = [
      { role: 'system', content: ROUTER_SYSTEM_PROMPT },
    ];

    const recentHistory = conversationHistory.slice(-10);
    messages.push(...recentHistory);

    messages.push({ role: 'user', content: userMessage });

    // Get pricing for the router model
    const pricing = MODEL_PRICING[routerModel] || { input: 0.15, output: 0.60 };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3031',
        'X-Title': 'Unified Chat Hub',
      },
      body: JSON.stringify({
        model: routerModel,
        messages,
        max_tokens: 100,
        temperature: 0,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'router_classification',
            schema: ROUTER_JSON_SCHEMA,
            strict: true,
          },
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Router] API error (${response.status}): ${errorText}`);
      logToServer(`Router API error (${response.status}): ${errorText.substring(0, 200)}`, 'error');
      return { route: 'direct_reply', promptTokens: 0, completionTokens: 0, cost: 0 };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const usage = data.usage || {};
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const cost = (promptTokens / 1_000_000) * pricing.input + (completionTokens / 1_000_000) * pricing.output;

    if (!content) {
      console.log('[Router] Empty response from router, defaulting to direct_reply');
      return { route: 'direct_reply', promptTokens, completionTokens, cost };
    }

    const result: Omit<RouterResult, 'promptTokens' | 'completionTokens' | 'cost'> = JSON.parse(content);

    if (result.route !== 'web_search' && result.route !== 'direct_reply' && result.route !== 'image_generation') {
      console.log(`[Router] Invalid route "${result.route}", defaulting to direct_reply`);
      return { route: 'direct_reply', promptTokens, completionTokens, cost };
    }

    if (result.route === 'web_search') {
      result.searchQuery = result.searchQuery || userMessage;
      result.format = result.format || 'full_answer';
    }

    if (result.route === 'image_generation') {
      result.imagePrompt = result.imagePrompt || userMessage;
    }

    const routeLabel = result.route === 'web_search' ? 'web_search (→ Perplexity)' : result.route === 'image_generation' ? 'image_generation (→ Image Gen)' : 'direct_reply';
    console.log(`[Router] Classification: route=${result.route}, model=${routerModel}, query="${result.searchQuery || 'N/A'}", format=${result.format || 'N/A'}, imagePrompt="${result.imagePrompt ? result.imagePrompt.substring(0, 50) : 'N/A'}..." (${promptTokens} in, ${completionTokens} out, $${cost.toFixed(6)})`);
    logToServer(`Router [${routerModel}]: ${routeLabel} query="${result.searchQuery || 'N/A'}" cost=$${cost.toFixed(6)}`, 'info');
    return { ...result, promptTokens, completionTokens, cost };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('[Router] Classification timed out, defaulting to direct_reply');
      logToServer('Router timed out', 'warn');
    } else {
      console.error('[Router] Classification failed:', error.message);
    }
    logToServer(`Router failed: ${error.message}`, 'error');
    return { route: 'direct_reply', promptTokens: 0, completionTokens: 0, cost: 0 };
  }
}
