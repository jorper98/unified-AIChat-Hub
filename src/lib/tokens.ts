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

export const MODEL_PRICING: Record<string, { input: number; output: number; name: string }> = {
  'openai/gpt-4o': { input: 2.50, output: 10.00, name: 'GPT-4o' },
  'anthropic/claude-3.5-sonnet': { input: 3.00, output: 15.00, name: 'Claude 3.5 Sonnet' },
  'anthropic/claude-3-opus': { input: 15.00, output: 75.00, name: 'Claude 3 Opus' },
  'deepseek/deepseek-chat': { input: 0.14, output: 0.28, name: 'DeepSeek Chat' },
  'google/gemini-pro': { input: 0.50, output: 1.50, name: 'Gemini Pro' },
  'google/gemini-flash-lite': { input: 0.075, output: 0.30, name: 'Gemini Flash Lite' },
  'qwen/qwen-2.5-72b-instruct': { input: 0.40, output: 0.40, name: 'Qwen 2.5 72B' },
  'xiaomi/mimo-v2-pro': { input: 0.50, output: 0.50, name: 'Mimo V2 Pro' },
  'minimax/minimax-m2.7': { input: 0.30, output: 0.60, name: 'MiniMax M2.7' },
  'moonshot/kimi-k2': { input: 0.20, output: 0.60, name: 'Kimi K2' },
};

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function formatTokenCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}
