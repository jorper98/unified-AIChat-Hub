import fs from 'fs';
import path from 'path';

const BASE_IMAGES_DIR = path.join(process.cwd(), 'public', 'images');

export function ensureImagesDir(userId: string) {
  const userDir = path.join(BASE_IMAGES_DIR, userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
}

export function saveBase64Image(base64Data: string, mimeType: string, userId: string): string {
  const userDir = ensureImagesDir(userId);
  
  const rawExt = mimeType.split('/')[1]?.split(';')[0]?.toLowerCase() || 'png';
  const allowedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
  const ext = allowedExtensions.includes(rawExt) ? rawExt : 'png';
  
  const randomStr = Math.random().toString(36).substring(2, 8);
  const safeFilename = `img_${Date.now()}_${randomStr}.${ext}`;
  const filename = path.basename(safeFilename);
  
  const filePath = path.join(userDir, filename);
  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(filePath, buffer);
  return `/images/${userId}/${filename}`;
}

export function extractAndSaveImages(content: string, userId: string): string {
  let result = content;

  // 1. Try to parse as JSON if it looks like a JSON array or object containing image data
  const trimmed = result.trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed);
      const extracted = extractImageFromParsedData(parsed, userId);
      if (extracted) {
        return `![Generated Image](${extracted})`;
      }
    } catch {
      // Not valid JSON, fall back to regex extraction
    }
  }

  // 2. Handle JSON inside markdown code blocks
  const codeBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)```/g;
  result = result.replace(codeBlockRegex, (match, code) => {
    try {
      const parsed = JSON.parse(code);
      const extracted = extractImageFromParsedData(parsed, userId);
      if (extracted) {
        return `![Generated Image](${extracted})`;
      }
    } catch {
      // Fall back to regex for this block
      const base64Match = code.match(/data:(image\/[a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)/);
      if (base64Match) {
        const imageUrl = saveBase64Image(base64Match[2], base64Match[1], userId);
        return `![Generated Image](${imageUrl})`;
      }
    }
    return match; // Return original if no image found
  });

  // 3. Handle raw base64 data URLs anywhere in the content
  const base64Regex = /data:(image\/[a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)/g;
  result = result.replace(base64Regex, (match, mimeType, base64Data) => {
    const imageUrl = saveBase64Image(base64Data, mimeType, userId);
    console.log(`[Image] Saved raw base64 image to ${imageUrl} (${base64Data.length} bytes)`);
    return `![Generated Image](${imageUrl})`;
  });

  return result;
}

// Helper to recursively search parsed JSON for image data
function extractImageFromParsedData(data: any, userId: string): string | null {
  if (!data) return null;

  if (typeof data === 'string') {
    const base64Match = data.match(/data:(image\/[a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)/);
    if (base64Match) {
      return saveBase64Image(base64Match[2], base64Match[1], userId);
    }
    const urlMatch = data.match(/!\[Generated Image\]\(([^)]+)\)/);
    if (urlMatch) return urlMatch[1];
    return null;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = extractImageFromParsedData(item, userId);
      if (found) return found;
    }
  } else if (typeof data === 'object') {
    // Check common image data structures
    if (data.type === 'image_url' && data.image_url?.url) {
      const url = data.image_url.url;
      if (url.startsWith('data:image')) {
        const match = url.match(/data:(image\/[a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)/);
        if (match) return saveBase64Image(match[2], match[1], userId);
      }
      return url;
    }
    if (data.inlineData?.data) {
      return saveBase64Image(data.inlineData.data, data.inlineData.mimeType || 'image/png', userId);
    }
    if (data.base64 || data.data) {
      return saveBase64Image(data.base64 || data.data, data.mime_type || data.mimeType || 'image/png', userId);
    }
    
    // Recursively search all object values
    for (const key in data) {
      const found = extractImageFromParsedData(data[key], userId);
      if (found) return found;
    }
  }

  return null;
}