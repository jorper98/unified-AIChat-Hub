import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');

export async function GET() {
  try {
    if (!fs.existsSync(IMAGES_DIR)) {
      fs.mkdirSync(IMAGES_DIR, { recursive: true });
      return NextResponse.json({ images: [] });
    }
    
    const files = fs.readdirSync(IMAGES_DIR);
    const images = files.filter(file => 
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)
    ).map(file => {
      const stats = fs.statSync(path.join(IMAGES_DIR, file));
      return {
        name: file,
        url: `/images/${file}`,
        size: stats.size,
        modified: stats.mtime.toISOString()
      };
    });
    
    images.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    
    return NextResponse.json({ images });
  } catch (error: any) {
    console.error("Images API route failure:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }
    
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }
    
    const filePath = path.join(IMAGES_DIR, filename);
    
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
