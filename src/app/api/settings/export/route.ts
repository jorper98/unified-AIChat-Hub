import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const db = await getDb();

    const threads = await db.collection('threads').find({}).toArray();
    const messages = await db.collection('messages').find({}).toArray();
    const settings = await db.collection('settings').find({}).toArray();
    const prompts = await db.collection('prompts').find({}).toArray();

    const backup = {
      version: '0.1.0',
      exportedAt: new Date().toISOString(),
      collections: {
        threads: threads.map(t => ({ ...t, _id: t._id.toString() })),
        messages: messages.map(m => ({ ...m, _id: m._id.toString(), threadId: m.threadId.toString() })),
        settings: settings.map(s => ({ ...s, _id: s._id.toString() })),
        prompts: prompts.map(p => ({ ...p, _id: p._id.toString() }))
      }
    };

    const imagesDir = path.join(process.cwd(), 'public', 'images');
    const hasImages = fs.existsSync(imagesDir) && fs.readdirSync(imagesDir).length > 0;

    const archive = (archiver as any)('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('error', (err: Error) => { throw err; });

    archive.append(JSON.stringify(backup, null, 2), { name: 'data.json' });

    if (hasImages) {
      archive.directory(imagesDir, 'images');
    }

    archive.finalize();

    await new Promise((resolve, reject) => {
      archive.on('end', resolve);
      archive.on('error', reject);
    });

    const buffer = Buffer.concat(chunks);
    const filename = `unified-chat-backup-${Date.now()}.zip`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length)
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
