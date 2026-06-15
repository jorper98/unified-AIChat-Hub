import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const decoded = token ? verifyAuthToken(token) : null;

    if (!decoded) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = await getDb();
    const userId = new ObjectId(decoded.userId);
    const isAdmin = decoded.role === 'admin';

    // Admins export ALL data; regular users only export their own
    const filter = isAdmin ? {} : { userId };

    const threads = await db.collection('threads').find(filter).toArray();
    const messages = await db.collection('messages').find(filter).toArray();
    const settings = await db.collection('settings').find(filter).toArray();
    const prompts = await db.collection('system_prompts').find(filter).toArray();
    
    // Only admins get full user list in backup
    const users = isAdmin ? await db.collection('users').find({}).toArray() : [];

    const backup = {
      version: '0.4.6',
      exportedBy: { name: decoded.name, email: decoded.email, role: decoded.role },
      exportedAt: new Date().toISOString(),
      collections: {
        threads: threads.map(t => ({ ...t, _id: t._id.toString() })),
        messages: messages.map(m => ({ ...m, _id: m._id.toString(), threadId: m.threadId.toString() })),
        settings: settings.map(s => ({ ...s, _id: s._id.toString() })),
        prompts: prompts.map(p => ({ ...p, _id: p._id.toString() })),
        users: users.map(u => ({ 
          _id: u._id.toString(),
          name: u.name,
          email: u.email,
          role: u.role,
          isEmailVerified: u.isEmailVerified,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          // Exclude password hashes from backup for security
        }))
      }
    };

    const zip = new JSZip();
    zip.file('data.json', JSON.stringify(backup, null, 2));

    const imagesDir = path.join(process.cwd(), 'public', 'images');
    if (fs.existsSync(imagesDir)) {
      const files = fs.readdirSync(imagesDir);
      const imagesFolder = zip.folder('images');
      if (imagesFolder) {
        for (const file of files) {
          const filePath = path.join(imagesDir, file);
          const content = fs.readFileSync(filePath);
          imagesFolder.file(file, content);
        }
      }
    }

    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
    const filename = `unified-chat-backup-${Date.now()}.zip`;

    return new NextResponse(buffer as unknown as BodyInit, {
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
