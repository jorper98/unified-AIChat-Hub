import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import modelConfig from '@/config/models.json';

async function getProviderForModel(modelId: string) {
  const db = await getDb();
  const settings = await db.collection('settings').findOne({ _id: 'global_settings' as any });
  
  const providers = settings?.providers || modelConfig.providers;
  const models = settings?.models || [];
  
  const modelEntry = models.find((m: any) => m.id === modelId);
  const providerId = modelEntry?.provider || 'openrouter';
  const provider = providers.find((p: any) => p.id === providerId);
  
  // Fallback to default provider if not found
  if (!provider) {
    return { id: 'openrouter', name: 'OpenRouter', type: 'api', endpoint: 'https://openrouter.ai/api/v1/chat/completions', apiKeyEnv: 'OPENROUTER_API_KEY' };
  }
  
  // If endpoint is empty, use the default from config
  if (!provider.endpoint || provider.endpoint.trim() === '') {
    const configProvider = modelConfig.providers.find((p: any) => p.id === providerId);
    if (configProvider) {
      return { ...provider, endpoint: configProvider.endpoint, apiKeyEnv: configProvider.apiKeyEnv };
    }
  }
  
  return provider;
}

export async function POST(request: Request) {
  try {
    const { threadId, messageContent, selectedModel, systemInstruction, promptName } = await request.json();
    const db = await getDb();
    
    const activeThreadId = threadId ? new ObjectId(threadId) : new ObjectId();
    const provider = await getProviderForModel(selectedModel);

    const generateThreadName = (content: string): string => {
      const trimmed = content.trim();
      const firstLine = trimmed.split('\n')[0];
      const words = firstLine.split(/\s+/);
      if (words.length <= 8) return firstLine;
      let summary = firstLine.substring(0, 60).trim();
      const lastSpace = summary.lastIndexOf(' ');
      if (lastSpace > 20) summary = summary.substring(0, lastSpace);
      return summary + '...';
    };

    const threadName = generateThreadName(messageContent);
    const isNewThread = !threadId;

    if (isNewThread) {
      await db.collection('threads').insertOne({
        _id: activeThreadId,
        name: threadName,
        currentModel: selectedModel,
        systemInstruction: systemInstruction || "You are a helpful assistant.",
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else {
      await db.collection('threads').updateOne(
        { _id: activeThreadId },
        { $set: { currentModel: selectedModel, systemInstruction: systemInstruction || "You are a helpful assistant.", updatedAt: new Date() } }
      );
    }

    await db.collection('messages').insertOne({
      threadId: activeThreadId,
      role: 'user',
      content: messageContent,
      createdAt: new Date()
    });

    const rawHistory = await db.collection('messages')
      .find({ threadId: activeThreadId })
      .sort({ createdAt: 1 })
      .toArray();

    const formattedHistory = rawHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }));

    if (systemInstruction) {
      formattedHistory.unshift({ role: 'system', content: systemInstruction });
    }

    let completionData: any;

    if (provider.type === 'local' || provider.id === 'ollama') {
      // Ollama API format
      const response = await fetch(provider.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: formattedHistory,
          stream: false
        })
      });
      completionData = await response.json();
      
      if (completionData.error) {
        return NextResponse.json({ 
          threadId: activeThreadId.toHexString(), 
          response: `Ollama Error: ${completionData.error}` 
        });
      }
    } else {
      // OpenRouter / OpenAI-compatible format
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      
      if (provider.apiKeyEnv && process.env[provider.apiKeyEnv]) {
        headers["Authorization"] = `Bearer ${process.env[provider.apiKeyEnv]}`;
      }
      
      if (provider.id === 'openrouter') {
        headers["HTTP-Referer"] = "http://localhost:3031";
        headers["X-Title"] = "Unified Chat Hub";
      }

      const response = await fetch(provider.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: selectedModel,
          messages: formattedHistory
        })
      });
      completionData = await response.json();

      if (completionData.error) {
        console.error("--- API ERROR ---");
        console.error(JSON.stringify(completionData.error, null, 2));
        return NextResponse.json({ 
          threadId: activeThreadId.toHexString(), 
          response: `API Error [${completionData.error.code || 'unknown'}]: ${completionData.error.message || completionData.error}` 
        });
      }
    }

    // Extract response text from different provider formats
    let aiTextOutput = "";
    let usage = {};

    if (provider.type === 'local' || provider.id === 'ollama') {
      aiTextOutput = completionData.message?.content || "No response from model.";
      usage = {
        promptTokens: completionData.prompt_eval_count || 0,
        completionTokens: completionData.eval_count || 0,
        totalTokens: (completionData.prompt_eval_count || 0) + (completionData.eval_count || 0)
      };
    } else {
      aiTextOutput = completionData.choices?.[0]?.message?.content || "API error or empty payload returned.";
      usage = completionData.usage || {};
    }

    await db.collection('messages').insertOne({
      threadId: activeThreadId,
      role: 'assistant',
      content: aiTextOutput || "",
      modelUsed: selectedModel,
      systemInstruction: systemInstruction || "You are a helpful assistant.",
      promptName: promptName || null,
      usage: {
        promptTokens: usage.promptTokens || usage.prompt_tokens || 0,
        completionTokens: usage.completionTokens || usage.completion_tokens || 0,
        totalTokens: usage.totalTokens || usage.total_tokens || 0
      },
      createdAt: new Date()
    });

    return NextResponse.json({ 
      threadId: activeThreadId.toHexString(), 
      response: aiTextOutput,
      usage
    });

  } catch (error: any) {
    console.error("Backend runtime failure:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
