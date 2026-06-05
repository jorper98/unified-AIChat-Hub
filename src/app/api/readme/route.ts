import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const readmePath = path.join(process.cwd(), 'readme.md');
    const content = fs.readFileSync(readmePath, 'utf-8');
    return new NextResponse(content, {
      headers: { 'Content-Type': 'text/markdown' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
