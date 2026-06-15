import { ObjectId } from 'mongodb';

export interface UserDocument {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  isEmailVerified: boolean;
  emailVerificationToken: string | null;
  openRouterApiKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SettingsDocument {
  _id: string | ObjectId;
  userId?: ObjectId;
  models?: any[];
  providers?: any[];
  theme?: string;
  themeColors?: any;
  globalSystemPrompt?: string;
  routerModel?: string;
  imageGenerationModel?: string;
  timezone?: string;
  weatherLocation?: string;
  updatedAt?: Date;
}

export interface ThreadDocument {
  _id: ObjectId;
  userId: ObjectId;
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
  userId: ObjectId;
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
