import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import modelConfig from '@/config/models.json';
import fs from 'fs';
import path from 'path';
import { buildSystemContext } from '@/lib/context';
import { isUncertainResponse, isPerplexityRecheck, isExitPerplexityMode, queryPerplexity, queryPerplexityForSnippets } from '@/lib/perplexity';
import { classifyIntent, RouterResult } from '@/lib/router';
import { logToServer } from '@/lib/logger';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');

function ensureImagesDir() {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }
}

function saveBase64Image(base64Data: string, mimeType: string): string {
  ensureImagesDir();
  const ext = mimeType.split('/')[1]?.split(';')[0] || 'png';
  const filename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const filePath = path.join(IMAGES_DIR, filename);
  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(filePath, buffer);
  return `/images/${filename}`;
}

function extractAndSaveImages(content: string): string {
  let result = content;

  // Handle JSON inside markdown code blocks that contain image_url structures
  // Matches: ```json ... {"type":"image_url",...} ... ```
  // or just indented JSON blocks
  const codeBlockJsonRegex = /```(?:json)?\s*\n?([\s\S]*?\{[\s\S]*?"type"[\s\S]*?image_url[\s\S]*?\}[\s\S]*?)```/g;
  let codeMatch;
  while ((codeMatch = codeBlockJsonRegex.exec(result)) !== null) {
    const jsonContent = codeMatch[1];
    const fullMatch = codeMatch[0];

    // Try to extract image URL from the JSON content
    const urlMatch = jsonContent.match(/"url"\s*:\s*"!\[Generated Image\]\(([^)]+)\)"/);
    if (urlMatch) {
      const imageUrl = urlMatch[1];
      result = result.replace(fullMatch, `![Generated Image](${imageUrl})`);
      console.log(`[Image] Replaced code block JSON with direct image link: ${imageUrl}`);
    } else {
      // Check for base64 data URL
      const base64Match = jsonContent.match(/"url"\s*:\s*"data:(image\/[a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)"/);
      if (base64Match) {
        const imageUrl = saveBase64Image(base64Match[2], base64Match[1]);
        result = result.replace(fullMatch, `![Generated Image](${imageUrl})`);
        console.log(`[Image] Extracted base64 from code block JSON, saved to ${imageUrl}`);
      }
    }
  }

  // Handle JSON arrays/objects not in code blocks (more flexible whitespace)
  // First: JSON with saved image path
  const jsonPathRegex = /\[\s*\{[\s\S]*?"type"[\s\S]*?image_url[\s\S]*?"url"[\s\S]*?:\s*"!\[Generated Image\]\(([^)]+)\)"[\s\S]*?\}\s*\]/g;
  let jsonPathMatch;
  while ((jsonPathMatch = jsonPathRegex.exec(result)) !== null) {
    const imageUrl = jsonPathMatch[1];
    const fullMatch = jsonPathMatch[0];
    result = result.replace(fullMatch, `![Generated Image](${imageUrl})`);
    console.log(`[Image] Replaced JSON array with direct image link: ${imageUrl}`);
  }

  // JSON with base64 data
  const jsonBase64Regex = /\[\s*\{[\s\S]*?"type"[\s\S]*?image_url[\s\S]*?"url"[\s\S]*?:\s*"data:(image\/[a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)"[\s\S]*?\}\s*\]/g;
  let jsonBase64Match;
  while ((jsonBase64Match = jsonBase64Regex.exec(result)) !== null) {
    const imageUrl = saveBase64Image(jsonBase64Match[2], jsonBase64Match[1]);
    const fullMatch = jsonBase64Match[0];
    result = result.replace(fullMatch, `![Generated Image](${imageUrl})`);
    console.log(`[Image] Extracted base64 from JSON array, saved to ${imageUrl}`);
  }

  // Handle raw data:image/...;base64,... strings anywhere in content
  const base64Regex = /data:(image\/[a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)/g;
  let match;
  while ((match = base64Regex.exec(result)) !== null) {
    const mimeType = match[1];
    const base64Data = match[2];
    const imageUrl = saveBase64Image(base64Data, mimeType);
    const fullMatch = match[0];
    result = result.replace(fullMatch, `![Generated Image](${imageUrl})`);
    console.log(`[Image] Saved raw base64 image to ${imageUrl} (${base64Data.length} bytes)`);
  }

  return result;
}

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
    const { threadId, messageContent, selectedModel, systemInstruction, promptName, bypassRouter } = await request.json();
    console.log(`[Chat] bypassRouter=${bypassRouter}, message="${messageContent.substring(0, 50)}..."`);
    logToServer(`POST /api/chat model=${selectedModel} bypassRouter=${bypassRouter}, message="${messageContent.substring(0, 80)}..."`);
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

    const dynamicContextRaw = await buildSystemContext(messageContent);
    const settings = await db.collection('settings').findOne({ _id: 'global_settings' as any });
    // Skip all context (date/time + global prompt) when bypassing router (LLM Only mode)
    const dynamicContext = bypassRouter ? '' : dynamicContextRaw;
    const globalPrompt = bypassRouter ? '' : (settings?.globalSystemPrompt || '');
    if (bypassRouter) {
      console.log('[Chat] LLM Only mode: All context injection skipped');
      logToServer('LLM Only mode: All context injection skipped', 'info');
    }

    let routerResult: RouterResult | null = null;
    let webSearchContext: string | null = null;

    if (dynamicContext || globalPrompt) {
      let globalMessage = '';
      if (dynamicContext) {
        globalMessage += dynamicContext + '\n\n';
      }
      if (globalPrompt) {
        globalMessage += globalPrompt;
      }
      formattedHistory.unshift({ role: 'system', content: globalMessage.trim() });
    }

    if (systemInstruction) {
      formattedHistory.unshift({ role: 'system', content: systemInstruction });
    }

    // Check thread metadata for Perplexity auto-continue mode
    const thread = await db.collection('threads').findOne({ _id: activeThreadId });
    const inPerplexityMode = thread?.perplexityMode === true;

    // Check for exit Perplexity mode trigger
    const exitingPerplexityMode = inPerplexityMode && isExitPerplexityMode(messageContent);
    if (exitingPerplexityMode) {
      console.log('[Perplexity Mode] Exit trigger detected, disabling Perplexity mode');
      await db.collection('threads').updateOne(
        { _id: activeThreadId },
        { $set: { perplexityMode: false } }
      );
    }

    // Check if user wants to recheck the last question via Perplexity
    let skipModelCall = false;
    let perplexityUsage = null;
    let aiTextOutput = "";
    let usage: any = {};

    // Router integration: classify intent before main LLM call
    // Skip router when in Perplexity mode, explicit Perplexity recheck, or user requested LLM-only
    if (!inPerplexityMode && !exitingPerplexityMode && !isPerplexityRecheck(messageContent) && !bypassRouter) {
      const historyForRouter = rawHistory
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content }));

      routerResult = await classifyIntent(messageContent, historyForRouter);

      // Execute web search if router classified it as web_search
      if (routerResult.route === 'web_search' && routerResult.searchQuery) {
        console.log(`[Router] Web search triggered: "${routerResult.searchQuery}" (format: ${routerResult.format})`);
        logToServer(`Router web_search model=${selectedModel}: "${routerResult.searchQuery}" (format: ${routerResult.format})`, 'info');

        if (routerResult.format === 'full_answer') {
          const perplexityResult = await queryPerplexity(routerResult.searchQuery, historyForRouter);
          if (perplexityResult) {
            webSearchContext = `<web_search_context>\n<answer>${perplexityResult.answer}</answer>\n</web_search_context>`;
            perplexityUsage = {
              promptTokens: perplexityResult.promptTokens,
              completionTokens: perplexityResult.completionTokens,
              totalTokens: perplexityResult.promptTokens + perplexityResult.completionTokens,
              actualCost: perplexityResult.cost,
            };
          }
        } else if (routerResult.format === 'snippets') {
          const snippetsResult = await queryPerplexityForSnippets(routerResult.searchQuery);
          if (snippetsResult) {
            const snippetLines = snippetsResult.snippets.split('\n').map((line, idx) => {
              if (line.trim().match(/^\d+\./)) return `<snippet number="${idx + 1}">${line}</snippet>`;
              return line;
            });
            const sourceTags = snippetsResult.citations.map(url => `    <source url="${url}" />`).join('\n');
            webSearchContext = `<web_search_context>\n${snippetLines.join('\n')}\n<sources>\n${sourceTags}\n</sources>\n</web_search_context>`;
            perplexityUsage = {
              promptTokens: snippetsResult.promptTokens,
              completionTokens: snippetsResult.completionTokens,
              totalTokens: snippetsResult.promptTokens + snippetsResult.completionTokens,
              actualCost: snippetsResult.cost,
            };
          }
        }
      }
    }

    // Inject web search context as a system message if available
    if (webSearchContext) {
      formattedHistory.unshift({
        role: 'system',
        content: webSearchContext
      });
    }

    // Add citation instruction when web search context was injected
    if (webSearchContext && routerResult) {
      const citationInstruction: { role: 'system'; content: string } = {
        role: 'system',
        content: `You have access to web search results wrapped in <web_search_context> tags. Use this information to provide accurate, up-to-date responses. Always cite your sources by referencing the source URLs when using search data (e.g., [Source: URL]).`
      };
      formattedHistory.unshift(citationInstruction);
    }

    // Priority: exit trigger > auto-continue mode > recheck trigger > normal model
    if (inPerplexityMode && !exitingPerplexityMode) {
      // Auto-continue: send to Perplexity with conversation history
      console.log('[Perplexity Mode] Active, sending to Perplexity');
      logToServer(`Perplexity Mode model=${selectedModel} active`, 'info');
      const perplexityHistory = rawHistory
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({ role: msg.role, content: msg.content }));
      const perplexityResult = await queryPerplexity(messageContent, perplexityHistory);
      if (perplexityResult) {
        aiTextOutput = perplexityResult.answer;
        perplexityUsage = {
          promptTokens: perplexityResult.promptTokens,
          completionTokens: perplexityResult.completionTokens,
          totalTokens: perplexityResult.promptTokens + perplexityResult.completionTokens,
          actualCost: perplexityResult.cost,
        };
        skipModelCall = true;
      }
    } else if (isPerplexityRecheck(messageContent)) {
      console.log('[Perplexity Recheck] Recheck request detected, finding previous user message...');
      logToServer(`Perplexity Recheck model=${selectedModel} triggered`, 'info');
      // Find the last user message before this current one
      const userMessages = rawHistory.filter(msg => msg.role === 'user');
      const previousUserMessage = userMessages.length > 1 ? userMessages[userMessages.length - 2] : null;

      if (previousUserMessage) {
        console.log(`[Perplexity Recheck] Running previous question through Perplexity: "${previousUserMessage.content.substring(0, 50)}..."`);
        const perplexityResult = await queryPerplexity(previousUserMessage.content);
        if (perplexityResult) {
          aiTextOutput = perplexityResult.answer;
          perplexityUsage = {
            promptTokens: perplexityResult.promptTokens,
            completionTokens: perplexityResult.completionTokens,
            totalTokens: perplexityResult.promptTokens + perplexityResult.completionTokens,
            actualCost: perplexityResult.cost,
          };
          skipModelCall = true;
          // Enable Perplexity mode for follow-ups
          await db.collection('threads').updateOne(
            { _id: activeThreadId },
            { $set: { perplexityMode: true } }
          );
          console.log('[Perplexity Recheck] Perplexity mode enabled for follow-ups');
        }
      } else {
        console.log('[Perplexity Recheck] No previous user message found');
      }
    }

    let completionData: any;
    let rawResponse: any = null;

    if (!skipModelCall) {

    if (provider.type === 'local' || provider.id === 'ollama') {
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

      aiTextOutput = completionData.message?.content || "No response from model.";
      usage = {
        promptTokens: completionData.prompt_eval_count || 0,
        completionTokens: completionData.eval_count || 0,
        totalTokens: (completionData.prompt_eval_count || 0) + (completionData.eval_count || 0)
      };
    } else {
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

      const choice = completionData.choices?.[0];
      const message = choice?.message;

      aiTextOutput = message?.content || "";

      // Check for markdown image links in content (some models return ![alt](url))
      if (aiTextOutput && aiTextOutput.includes('![')) {
        const imageMatches = aiTextOutput.match(/!\[([^\]]*)\]\(([^)]+)\)/g);
        if (imageMatches) {
          const imageCount = imageMatches.length;
          aiTextOutput = `🖼️ Image generated (${imageCount} image${imageCount > 1 ? 's' : ''})\n\n${aiTextOutput}`;
        }
      }

      // ALWAYS check for multimodal parts (Gemini returns text AND image parts together)
      if (message?.parts && Array.isArray(message.parts)) {
        let foundImages = false;

        for (const part of message.parts) {
          // Handle inlineData format (base64 embedded)
          const inlineData = part.inlineData?.data || part.inlineData?.inlineData;
          if (inlineData) {
            const mimeType = part.inlineData?.mimeType || 'image/png';
            const imageUrl = saveBase64Image(inlineData, mimeType);
            aiTextOutput += `\n\n![Generated Image](${imageUrl})`;
            foundImages = true;
            console.log(`[Multimodal] Saved inlineData image to ${imageUrl}`);
          }

          // Handle image_url format (OpenRouter/Gemini)
          if (part.type === 'image_url' && part.image_url?.url) {
            const url = part.image_url.url;
            if (url.startsWith('data:image')) {
              // Base64 data URL - save it
              const match = url.match(/data:(image\/[a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)/);
              if (match) {
                const imageUrl = saveBase64Image(match[2], match[1]);
                aiTextOutput += `\n\n![Generated Image](${imageUrl})`;
                foundImages = true;
                console.log(`[Multimodal] Saved image_url data to ${imageUrl}`);
              }
            } else {
              // External URL - use directly
              aiTextOutput += `\n\n![Generated Image](${url})`;
              foundImages = true;
              console.log(`[Multimodal] Using external image URL: ${url}`);
            }
          }

          // Handle fileData format
          if (part.fileData?.fileUri) {
            aiTextOutput += `\n\n![Generated Image](${part.fileData.fileUri})`;
            foundImages = true;
          }
        }

        // Use text from parts only if no content was found and no images
        if (!aiTextOutput && !foundImages) {
          const textParts = message.parts.filter((p: any) => p.text).map((p: any) => p.text).join('\n');
          if (textParts) aiTextOutput = textParts;
        }

        if (foundImages) {
          console.log(`[Multimodal] Image(s) extracted from message.parts`);
        }
      }

      // Check for attachments (some providers)
      if ((!aiTextOutput || aiTextOutput === "API error or empty payload returned.") && message?.attachments && message.attachments.length > 0) {
        aiTextOutput = `📎 ${message.attachments.length} attachment(s) received`;
        console.log('[Attachments]', JSON.stringify(message.attachments, null, 2));
      }

      // Check for image URLs in choice level
      if ((!aiTextOutput || aiTextOutput === "API error or empty payload returned.") && choice?.image_url) {
        aiTextOutput = `️ Image generated\n\n${choice.image_url}`;
      }

      // Check for OpenRouter images array (message.images)
      if (message?.images && Array.isArray(message.images)) {
        for (const img of message.images) {
          // Handle image_url format
          if (img.image_url?.url) {
            const url = img.image_url.url;
            if (url.startsWith('data:image')) {
              const match = url.match(/data:(image\/[a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)/);
              if (match) {
                const imageUrl = saveBase64Image(match[2], match[1]);
                aiTextOutput += `\n\n![Generated Image](${imageUrl})`;
                console.log(`[Images array] Saved base64 image to ${imageUrl}`);
              }
            } else {
              aiTextOutput += `\n\n![Generated Image](${url})`;
              console.log(`[Images array] Using external URL: ${url}`);
            }
          }
          // Handle direct base64 or url field
          else if (img.url) {
            if (img.url.startsWith('data:image')) {
              const match = img.url.match(/data:(image\/[a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)/);
              if (match) {
                const imageUrl = saveBase64Image(match[2], match[1]);
                aiTextOutput += `\n\n![Generated Image](${imageUrl})`;
                console.log(`[Images array] Saved base64 from url field to ${imageUrl}`);
              }
            } else {
              aiTextOutput += `\n\n![Generated Image](${img.url})`;
            }
          }
          else if (img.base64 || img.data) {
            const base64Data = img.base64 || img.data;
            const mimeType = img.mime_type || img.mimeType || 'image/png';
            const imageUrl = saveBase64Image(base64Data, mimeType);
            aiTextOutput += `\n\n![Generated Image](${imageUrl})`;
            console.log(`[Images array] Saved base64 from data field to ${imageUrl}`);
          }
        }
      }

      // Check if model consumed image tokens but no image was extracted
      if (!aiTextOutput || aiTextOutput === "API error or empty payload returned.") {
        const usageData = completionData.usage;
        const imageTokens = usageData?.completion_tokens_details?.image_tokens || 0;
        if (imageTokens > 0) {
          aiTextOutput = `🖼️ Model generated image output (${imageTokens} image tokens consumed). The image may not be displayable in text-only format. Check server logs for full response structure.`;
          console.log('=== IMAGE TOKENS DETECTED BUT NO IMAGE FOUND ===');
          console.log('[Model]', selectedModel);
          console.log('[Usage]', JSON.stringify(usageData, null, 2));
          console.log('[Choice keys]', choice ? Object.keys(choice) : 'null');
          console.log('[Message keys]', message ? Object.keys(message) : 'null');
          console.log('[Has parts]', Array.isArray(message?.parts), message?.parts?.length);
          if (message?.parts?.length > 0) {
            console.log('[Parts structure]', JSON.stringify(message.parts, null, 2).substring(0, 2000));
          }
          console.log('[Full message]', JSON.stringify(message, null, 2).substring(0, 3000));
          console.log('[Full choice]', JSON.stringify(choice, null, 2).substring(0, 3000));
          console.log('===============================================');
        }
      }

      // Check for content filtering
      if ((!aiTextOutput || aiTextOutput === "API error or empty payload returned.") && choice?.finish_reason === 'CONTENT_FILTERED') {
        aiTextOutput = 'Response was filtered by content safety policies.';
      }

      // Fallback with comprehensive debug logging
      if (!aiTextOutput || aiTextOutput === "API error or empty payload returned.") {
        rawResponse = completionData;
        const finishReason = choice?.finish_reason || '(none)';
        console.log('[Empty Response] Model:', selectedModel);
        console.log('[Empty Response] Finish reason:', finishReason);
        console.log('[Empty Response] Full completion:', JSON.stringify(completionData, null, 2).substring(0, 2000));
        aiTextOutput = `API error or empty payload returned. (finish_reason: ${finishReason}) Check server console for full response dump.`;
      }

      usage = completionData.usage || {};
    }
    } // end if (!skipModelCall)

    // Extract and save any base64 images in the response, replace with markdown image links
    aiTextOutput = extractAndSaveImages(aiTextOutput);

    // Check if the model expressed uncertainty — if so, query Perplexity for real-time info
    // (skip if Perplexity was already used via recheck request, or if LLM Only mode is active)
    if (!bypassRouter && !perplexityUsage && isUncertainResponse(aiTextOutput)) {
      console.log('[Perplexity Fallback] Uncertainty detected in model response, querying Perplexity...');
      logToServer(`Perplexity Fallback model=${selectedModel}: uncertainty detected`, 'warn');
      const perplexityResult = await queryPerplexity(messageContent);
      if (perplexityResult) {
        aiTextOutput = perplexityResult.answer;
        perplexityUsage = {
          promptTokens: perplexityResult.promptTokens,
          completionTokens: perplexityResult.completionTokens,
          totalTokens: perplexityResult.promptTokens + perplexityResult.completionTokens,
          actualCost: perplexityResult.cost,
        };
        console.log('[Perplexity Fallback] Replaced uncertain response with Perplexity answer');
        logToServer('Perplexity Fallback: replaced uncertain response', 'info');
      }
    }

    await db.collection('messages').insertOne({
      threadId: activeThreadId,
      role: 'assistant',
      content: aiTextOutput || "",
      modelUsed: selectedModel,
      systemInstruction: systemInstruction || "You are a helpful assistant.",
      promptName: promptName || null,
      perplexityUsed: perplexityUsage ? true : false,
      usage: {
        promptTokens: usage.promptTokens || usage.prompt_tokens || 0,
        completionTokens: usage.completionTokens || usage.completion_tokens || 0,
        totalTokens: usage.totalTokens || usage.total_tokens || 0,
        imageTokens: usage.completion_tokens_details?.image_tokens || 0,
        actualCost: usage.cost || 0,
        perplexityTokens: perplexityUsage?.totalTokens || 0,
        perplexityCost: perplexityUsage?.actualCost || 0,
        routerTokens: routerResult ? routerResult.promptTokens + routerResult.completionTokens : 0,
        routerCost: routerResult ? routerResult.cost : 0,
      },
      createdAt: new Date()
    });

    return NextResponse.json({ 
      threadId: activeThreadId.toHexString(), 
      response: aiTextOutput,
      usage: {
        ...usage,
        perplexityTokens: perplexityUsage?.totalTokens || 0,
        perplexityCost: perplexityUsage?.actualCost || 0,
        routerTokens: routerResult ? routerResult.promptTokens + routerResult.completionTokens : 0,
        routerCost: routerResult ? routerResult.cost : 0,
      }
    });

  } catch (error: any) {
    console.error("Backend runtime failure:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
