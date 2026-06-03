const CHARS_PER_TOKEN = 3;

export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  'openai/gpt-4o': 128000,
  'anthropic/claude-3.5-sonnet': 200000,
  'anthropic/claude-3-opus': 200000,
  'deepseek/deepseek-chat': 128000,
  'google/gemini-pro': 32000,
  'google/gemini-flash-lite': 1000000,
  'qwen/qwen-2.5-72b-instruct': 128000,
  'xiaomi/mimo-v2-pro': 32000,
  'minimax/minimax-m2.7': 245000,
  'moonshot/kimi-k2': 128000,
};

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function formatTokenCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}
