import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const db = await getDb();
    const threadId = context.params.id;
    const { searchParams } = new URL(request.url);
    
    // Pagination parameters for messages (default limit: 100, skip: 0)
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '100', 10) || 100);
    const skip = Math.max(0, parseInt(searchParams.get('skip') || '0', 10) || 0);

    if (!threadId || !ObjectId.isValid(threadId)) {
      return NextResponse.json({ error: "Invalid thread ID format" }, { status: 400 });
    }

    const thread = await db.collection('threads').findOne({ _id: new ObjectId(threadId) });
    const messages = await db.collection('messages')
      .find({ threadId: new ObjectId(threadId) })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json({ 
      thread: thread ? {
        id: thread._id.toString(),
        name: thread.name,
        currentModel: thread.currentModel,
        systemInstruction: thread.systemInstruction,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt
      } : null,
      messages 
    });
  } catch (error: any) {
    console.error("Thread messages fetch failure:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}