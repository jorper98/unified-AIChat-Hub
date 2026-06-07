import { saveBase64Image } from './image-processing';

export interface ParsedResponse {
  text: string;
  hasImages: boolean;
}

export function parseModelResponse(completionData: any): ParsedResponse {
  let aiTextOutput = "";
  let foundImages = false;

  const choice = completionData.choices?.[0];
  const message = choice?.message;

  if (!message) {
    return { text: "API error or empty payload returned.", hasImages: false };
  }

  aiTextOutput = message.content || "";

  // Check for markdown image links in content
  if (aiTextOutput && aiTextOutput.includes('![')) {
    const imageMatches = aiTextOutput.match(/!\[([^\]]*)\]\(([^)]+)\)/g);
    if (imageMatches) {
      aiTextOutput = `🖼️ Image generated (${imageMatches.length} image${imageMatches.length > 1 ? 's' : ''})\n\n${aiTextOutput}`;
      foundImages = true;
    }
  }

  // Check for multimodal parts (Gemini returns text AND image parts together)
  if (message.parts && Array.isArray(message.parts)) {
    for (const part of message.parts) {
      const inlineData = part.inlineData?.data || part.inlineData?.inlineData;
      if (inlineData) {
        const mimeType = part.inlineData?.mimeType || 'image/png';
        const imageUrl = saveBase64Image(inlineData, mimeType);
        aiTextOutput += `\n\n![Generated Image](${imageUrl})`;
        foundImages = true;
      }

      if (part.type === 'image_url' && part.image_url?.url) {
        const url = part.image_url.url;
        if (url.startsWith('data:image')) {
          const match = url.match(/data:(image\/[a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)/);
          if (match) {
            aiTextOutput += `\n\n![Generated Image](${saveBase64Image(match[2], match[1])})`;
            foundImages = true;
          }
        } else {
          aiTextOutput += `\n\n![Generated Image](${url})`;
          foundImages = true;
        }
      }

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
  }

  // Check for OpenRouter images array (message.images)
  if (message.images && Array.isArray(message.images)) {
    for (const img of message.images) {
      if (img.image_url?.url) {
        const url = img.image_url.url;
        if (url.startsWith('data:image')) {
          const match = url.match(/data:(image\/[a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)/);
          if (match) {
            aiTextOutput += `\n\n![Generated Image](${saveBase64Image(match[2], match[1])})`;
            foundImages = true;
          }
        } else {
          aiTextOutput += `\n\n![Generated Image](${url})`;
          foundImages = true;
        }
      } else if (img.url) {
        if (img.url.startsWith('data:image')) {
          const match = img.url.match(/data:(image\/[a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)/);
          if (match) {
            aiTextOutput += `\n\n![Generated Image](${saveBase64Image(match[2], match[1])})`;
            foundImages = true;
          }
        } else {
          aiTextOutput += `\n\n![Generated Image](${img.url})`;
          foundImages = true;
        }
      } else if (img.base64 || img.data) {
        const base64Data = img.base64 || img.data;
        const mimeType = img.mime_type || img.mimeType || 'image/png';
        aiTextOutput += `\n\n![Generated Image](${saveBase64Image(base64Data, mimeType)})`;
        foundImages = true;
      }
    }
  }

  // Check for attachments
  if ((!aiTextOutput || aiTextOutput === "API error or empty payload returned.") && message.attachments && message.attachments.length > 0) {
    aiTextOutput = `📎 ${message.attachments.length} attachment(s) received`;
  }

  // Check for image URLs in choice level
  if ((!aiTextOutput || aiTextOutput === "API error or empty payload returned.") && choice?.image_url) {
    aiTextOutput = `️ Image generated\n\n${choice.image_url}`;
    foundImages = true;
  }

  // Check if model consumed image tokens but no image was extracted
  if (!aiTextOutput || aiTextOutput === "API error or empty payload returned.") {
    const usageData = completionData.usage;
    const imageTokens = usageData?.completion_tokens_details?.image_tokens || 0;
    if (imageTokens > 0) {
      aiTextOutput = `🖼️ Model generated image output (${imageTokens} image tokens consumed). The image may not be displayable in text-only format.`;
    }
  }

  // Check for content filtering
  if ((!aiTextOutput || aiTextOutput === "API error or empty payload returned.") && choice?.finish_reason === 'CONTENT_FILTERED') {
    aiTextOutput = 'Response was filtered by content safety policies.';
  }

  return { text: aiTextOutput, hasImages: foundImages };
}