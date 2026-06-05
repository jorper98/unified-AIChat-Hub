export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  modelUsed?: string;
  promptName?: string;
  systemInstruction?: string;
  perplexityUsed?: boolean;
  routingTool?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    imageTokens?: number;
    actualCost?: number;
    perplexityTokens?: number;
    perplexityCost?: number;
    routerTokens?: number;
    routerCost?: number;
    imageGenTokens?: number;
    imageGenCost?: number;
    imageGenModel?: string;
  };
}

export interface ThreadSummary {
  _id: string;
  name: string;
  currentModel: string;
  updatedAt?: string;
}

export interface ThreadMetadata {
  id: string;
  name: string;
  currentModel: string;
  systemInstruction: string;
  createdAt: string;
  updatedAt: string;
}

export interface DropdownModel {
  id: string;
  name: string;
  provider?: string;
}

export interface SavedPrompt {
  _id: string;
  name: string;
  content: string;
}