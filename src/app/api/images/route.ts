import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCurrentUserId } from '@/lib/user';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

const BASE_IMAGES_DIR = path.join(process.cwd(), 'public', 'images');

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let targetUserId = userId;

    // Check if user is admin and if a targetUserId is provided
    const db = await getDb();
    const userDoc = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    const isAdmin = userDoc?.role === 'admin';

    if (isAdmin && searchParams.get('targetUserId')) {
      targetUserId = searchParams.get('targetUserId') as string;
    }

    const userImagesDir = path.join(BASE_IMAGES_DIR, targetUserId);
    
    if (!fs.existsSync(userImagesDir)) {
      return NextResponse.json({ images: [] });
    }
    
    const files = fs.readdirSync(userImagesDir);
    const images = files.filter(file => 
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)
    ).map(file => {
      const stats = fs.statSync(path.join(userImagesDir, file));
      return {
        name: file,
        url: `/images/${targetUserId}/${file}`,
        size: stats.size,
        modified: stats.mtime.toISOString()
      };
    });
    
    images.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    
    return NextResponse.json({ images, targetUserId, isAdmin });
  } catch (error: any) {
    console.error("Images API route failure:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }
    
    // Security: prevent directory traversal attacks
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }
    
    const db = await getDb();
    const userDoc = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    const isAdmin = userDoc?.role === 'admin';
    
    // For deletion, we need to know which user's folder to delete from.
    // If admin, they might pass targetUserId, otherwise it's their own.
    let targetUserId = userId;
    if (isAdmin && searchParams.get('targetUserId')) {
      targetUserId = searchParams.get('targetUserId') as string;
    }

    const filePath = path.join(BASE_IMAGES_DIR, targetUserId, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  } catch (error: any) {
    console.error("Images delete API route failure:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
