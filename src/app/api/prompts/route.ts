import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

const MAX_PROMPT_NAME_LENGTH = 200;
const MAX_PROMPT_CONTENT_LENGTH = 10000;

export async function GET() {
  try {
    const db = await getDb();
    const prompts = await db.collection('system_prompts')
      .find({})
      .sort({ name: 1 })
      .toArray();
    
    const formattedPrompts = prompts.map(p => ({
      _id: p._id.toString(),
      name: p.name,
      content: p.content
    }));
    
    return NextResponse.json({ prompts: formattedPrompts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = await getDb();
    const { name, content } = await request.json();

    if (!name?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Name and content required" }, { status: 400 });
    }

    const trimmedName = name.trim();
    const trimmedContent = content.trim();

    if (trimmedName.length > MAX_PROMPT_NAME_LENGTH) {
      return NextResponse.json({ error: `Prompt name must be ${MAX_PROMPT_NAME_LENGTH} characters or less` }, { status: 400 });
    }
    if (trimmedContent.length > MAX_PROMPT_CONTENT_LENGTH) {
      return NextResponse.json({ error: `Prompt content must be ${MAX_PROMPT_CONTENT_LENGTH} characters or less` }, { status: 400 });
    }

    const result = await db.collection('system_prompts').insertOne({
      name: trimmedName,
      content: trimmedContent,
      updatedAt: new Date()
    });

    return NextResponse.json({ id: result.insertedId.toString() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const db = await getDb();
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await db.collection('system_prompts').deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const db = await getDb();
    const { id, name, content } = await request.json();

    if (!id || !name?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "ID, name and content required" }, { status: 400 });
    }

    const trimmedName = name.trim();
    const trimmedContent = content.trim();

    if (trimmedName.length > MAX_PROMPT_NAME_LENGTH) {
      return NextResponse.json({ error: `Prompt name must be ${MAX_PROMPT_NAME_LENGTH} characters or less` }, { status: 400 });
    }
    if (trimmedContent.length > MAX_PROMPT_CONTENT_LENGTH) {
      return NextResponse.json({ error: `Prompt content must be ${MAX_PROMPT_CONTENT_LENGTH} characters or less` }, { status: 400 });
    }

    await db.collection('system_prompts').updateOne(
      { _id: new ObjectId(id) },
      { $set: { name: trimmedName, content: trimmedContent, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
