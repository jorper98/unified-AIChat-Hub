import { ObjectId } from 'mongodb';

export interface SettingsDocument {
  _id: string | ObjectId;
  models?: any[];
  providers?: any[];
  theme?: string;
  themeColors?: any;
  globalSystemPrompt?: string;
  routerModel?: string;
  imageGenerationModel?: string;
  updatedAt?: Date;
}

export interface ThreadDocument {
  _id: ObjectId;
  name: string;
  currentModel: string;
  systemInstruction: string;
  createdAt: Date;
  updatedAt: Date;
  archived?: boolean;
  perplexityMode?: boolean;
}

export interface MessageDocument {
  _id: ObjectId;
  threadId: ObjectId;
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelUsed?: string;
  systemInstruction?: string;
  promptName?: string;
  perplexityUsed?: boolean;
  routingTool?: string;
  usage?: any;
  createdAt: Date;
}
