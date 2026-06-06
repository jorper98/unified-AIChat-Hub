import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

const MAX_BACKUP_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const mode = (formData.get('mode') as string) || 'replace';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileSize = file.size;
    if (fileSize > MAX_BACKUP_FILE_SIZE) {
      return NextResponse.json({ error: `Backup file too large. Maximum size is ${MAX_BACKUP_FILE_SIZE / (1024 * 1024)}MB` }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = new AdmZip(buffer);

    let dataJson: any = null;
    const zipEntries = zip.getEntries();

    for (const entry of zipEntries) {
      if (entry.entryName === 'data.json') {
        dataJson = JSON.parse(entry.getData().toString('utf8'));
      }
    }

    if (!dataJson || !dataJson.collections) {
      return NextResponse.json({ error: 'Invalid backup file: missing data.json' }, { status: 400 });
    }

    const db = await getDb();
    const imagesDir = path.join(process.cwd(), 'public', 'images');

    // Helper to safely convert IDs: only valid 24-char hex strings become ObjectIds
    const safeObjectId = (id: any) => {
      if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) {
        return new ObjectId(id);
      }
      return id;
    };

    const restoreCollection = async (name: string, items: any[]) => {
      if (!items || items.length === 0) return { inserted: 0, skipped: 0 };

      const collection = db.collection(name);
      let inserted = 0;
      let skipped = 0;

      if (mode === 'replace') {
        await collection.deleteMany({});
        for (const item of items) {
          const doc = { ...item, _id: safeObjectId(item._id) };
          if (doc.threadId) doc.threadId = safeObjectId(doc.threadId);
          await collection.insertOne(doc);
          inserted++;
        }
      } else {
        for (const item of items) {
          const existing = await collection.findOne({ _id: safeObjectId(item._id) });
          if (existing) {
            skipped++;
          } else {
            const doc = { ...item, _id: safeObjectId(item._id) };
            if (doc.threadId) doc.threadId = safeObjectId(doc.threadId);
            await collection.insertOne(doc);
            inserted++;
          }
        }
      }

      return { inserted, skipped };
    };

    const results: Record<string, { inserted: number; skipped: number }> = {};
    const collections = dataJson.collections;

    if (collections.threads) {
      results.threads = await restoreCollection('threads', collections.threads);
    }
    if (collections.messages) {
      results.messages = await restoreCollection('messages', collections.messages);
    }
    if (collections.settings) {
      results.settings = await restoreCollection('settings', collections.settings);
    }
    if (collections.prompts) {
      results.prompts = await restoreCollection('prompts', collections.prompts);
    }

    let imagesRestored = 0;
    for (const entry of zipEntries) {
      if (entry.entryName.startsWith('images/') && !entry.isDirectory) {
        const fileName = path.basename(entry.entryName);
        const targetPath = path.join(imagesDir, fileName);
        if (!fs.existsSync(imagesDir)) {
          fs.mkdirSync(imagesDir, { recursive: true });
        }
        fs.writeFileSync(targetPath, entry.getData());
        imagesRestored++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Restored: ${Object.values(results).reduce((sum, r) => sum + r.inserted, 0)} items, ${imagesRestored} images`,
      details: { ...results, images: { inserted: imagesRestored, skipped: 0 } }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
