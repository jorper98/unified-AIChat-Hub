const UNCERTAINTY_PATTERNS = [
  "I don't have access",
  "I don't have real-time",
  "I don't have current",
  "I don't have up-to-date",
  "I cannot access",
  "I can't access",
  "I do not have access",
  "I'm not able to",
  "I am not able to",
  "I don't have the ability",
  "I cannot browse",
  "I can't browse",
  "I don't have real-time data",
  "I don't have live",
  "I don't have current information",
  "I cannot provide real-time",
  "I don't have access to real-time",
  "I'm unable to access",
  "I am unable to access",
  "I don't know the current",
  "I cannot check",
  "I can't check",
  "I do not have the ability",
  "My knowledge cutoff",
  "I cannot provide real-time",
  "I don't have the capability",
  "I do not have real-time",
  "I'm not equipped to",
  "I am not equipped to",
  "I cannot fetch",
  "I can't fetch",
  "I cannot retrieve",
  "I can't retrieve",
];

const RECHECK_PATTERNS = [
  "recheck with perplexity",
  "recheck using perplexity",
  "check with perplexity",
  "check using perplexity",
  "ask perplexity",
  "ask perplexity to",
  "use perplexity",
  "run through perplexity",
  "try perplexity",
  "perplexity please",
  "please use perplexity",
  "recheck with sonar",
  "check with sonar",
  "search with perplexity",
  "look it up with perplexity",
  "google it",
  "search the web",
  "look this up",
];

export function isUncertainResponse(response: string): boolean {
  const lower = response.toLowerCase();
  return UNCERTAINTY_PATTERNS.some(pattern => lower.includes(pattern.toLowerCase()));
}

export function isPerplexityRecheck(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return RECHECK_PATTERNS.some(pattern => lower.includes(pattern));
}

const EXIT_PERPLEXITY_PATTERNS = [
  "switch back to",
  "switch back",
  "exit perplexity",
  "stop perplexity",
  "stop using perplexity",
  "back to normal",
  "use normal model",
  "use the regular model",
  "turn off perplexity",
  "disable perplexity",
  "end perplexity mode",
  "back to the model",
  "back to the ai",
];

export function isExitPerplexityMode(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return EXIT_PERPLEXITY_PATTERNS.some(pattern => lower.includes(pattern));
}

export async function queryPerplexityForSnippets(
  searchQuery: string,
): Promise<{ snippets: string; citations: string[]; promptTokens: number; completionTokens: number; cost: number } | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log('[Perplexity Snippets] OpenRouter API key not configured');
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const messages = [
      {
        role: 'system',
        content: `You are a research assistant that provides concise, numbered snippets from web search results. 
For the user's query, return 3-5 key findings as numbered snippets, each with source attribution.
Format your response as:
1. [Finding] - [Source URL]
2. [Finding] - [Source URL]
3. [Finding] - [Source URL]

Keep each snippet to 1-2 sentences. Include actual source URLs for citation.`,
      },
    ];

    messages.push({ role: 'user', content: searchQuery });

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3031',
        'X-Title': 'Unified Chat Hub',
      },
      body: JSON.stringify({
        model: 'perplexity/sonar',
        messages,
        max_tokens: 600,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Perplexity Snippets via OpenRouter] API error (${response.status}): ${errorText}`);
      return null;
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    let snippets = message?.content;
    const citations = message?.citations || [];
    const usage = data.usage || {};
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;

    const cost = (promptTokens / 1_000_000) * 1.0 + (completionTokens / 1_000_000) * 1.0;

    if (snippets) {
      // Replace [n] citation markers with markdown links if citations are available
      if (citations && citations.length > 0) {
        snippets = snippets.replace(/\[(\d+)\]/g, (match, num) => {
          const idx = parseInt(num, 10) - 1;
          if (citations[idx]) {
            return `[${num}](${citations[idx]})`;
          }
          return match;
        });
      } else {
        snippets = snippets.replace(/\[\d+\]/g, '');
      }

      const extractedCitations: string[] = [];
      if (citations && citations.length > 0) {
        extractedCitations.push(...citations);
      }
      const urlMatches = snippets.match(/https?:\/\/[^\s\)]+/g);
      if (urlMatches) {
        extractedCitations.push(...urlMatches);
      }

      console.log(`[Perplexity Snippets via OpenRouter] Successfully fetched snippets for: "${searchQuery.substring(0, 50)}..." (${promptTokens} in, ${completionTokens} out, $${cost.toFixed(6)})`);
      return { snippets, citations: Array.from(new Set(extractedCitations)), promptTokens, completionTokens, cost };
    }

    return null;
  } catch (error: any) {
    console.error('[Perplexity Snippets via OpenRouter] Query failed:', error.message);
    return null;
  }
}

export async function queryPerplexity(userQuery: string, conversationHistory: Array<{ role: string; content: string }> = []): Promise<{ answer: string; promptTokens: number; completionTokens: number; cost: number } | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log('[Perplexity] OpenRouter API key not configured');
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const messages = [
      {
        role: 'system',
        content: 'You are a helpful assistant with real-time web search capabilities. Provide concise, accurate answers based on current information. Keep responses brief and factual.'
      },
    ];

    if (conversationHistory.length > 0) {
      messages.push(...conversationHistory.map(msg => ({ role: msg.role, content: msg.content })));
    }

    // Always ensure the user query is the last message
    messages.push({ role: 'user', content: userQuery });

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3031',
        'X-Title': 'Unified Chat Hub',
      },
      body: JSON.stringify({
        model: 'perplexity/sonar',
        messages,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Perplexity via OpenRouter] API error (${response.status}): ${errorText}`);
      return null;
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    let answer = message?.content;
    const citations = message?.citations || [];
    const usage = data.usage || {};
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;

    // Perplexity Sonar via OpenRouter pricing: $1/1M input, $1/1M output
    const cost = (promptTokens / 1_000_000) * 1.0 + (completionTokens / 1_000_000) * 1.0;

    if (answer) {
      // Replace [n] citation markers with markdown links if citations are available
      if (citations && citations.length > 0) {
        answer = answer.replace(/\[(\d+)\]/g, (match, num) => {
          const idx = parseInt(num, 10) - 1;
          if (citations[idx]) {
            return `[${num}](${citations[idx]})`;
          }
          return match;
        });
      } else {
        // Strip any remaining citation markers if no citations provided
        answer = answer.replace(/\[\d+\]/g, '');
      }

      console.log(`[Perplexity via OpenRouter] Successfully fetched answer for: "${userQuery.substring(0, 50)}..." (${promptTokens} in, ${completionTokens} out, $${cost.toFixed(6)})`);
      return { answer, promptTokens, completionTokens, cost };
    }

    return null;
  } catch (error: any) {
    console.error('[Perplexity via OpenRouter] Query failed:', error.message);
    return null;
  }
}
