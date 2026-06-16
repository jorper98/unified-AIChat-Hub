import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCurrentUserId } from '@/lib/user';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

const BASE_IMAGES_DIR = path.join(process.cwd(), 'public', 'images');

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string[] } }
) {
  const { filename } = params;
  
  // filename should be an array like ['userId', 'img_123.png']
  if (!filename || filename.length < 2) {
    return new NextResponse('Invalid image path', { status: 400 });
  }

  const targetUserId = filename[0];
  const imageFile = filename.slice(1).join('/'); // In case there are subfolders, though unlikely
  
  // Security: prevent directory traversal attacks
  if (targetUserId.includes('..') || imageFile.includes('..')) {
    return new NextResponse('Invalid image path', { status: 400 });
  }

  const userId = await getCurrentUserId(request);
  if (!userId) {
    return new NextResponse('Not authenticated', { status: 401 });
  }

  // Verify permissions: user can only access their own images, unless they are admin
  if (userId !== targetUserId) {
    const db = await getDb();
    const userDoc = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (userDoc?.role !== 'admin') {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  const filePath = path.join(BASE_IMAGES_DIR, targetUserId, imageFile);

  if (!fs.existsSync(filePath)) {
    return new NextResponse('Image not found', { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(imageFile).toLowerCase();
  
  // Determine content type based on extension
  let contentType = 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.gif') contentType = 'image/gif';
  else if (ext === '.webp') contentType = 'image/webp';

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
