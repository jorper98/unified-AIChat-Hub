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

    if (!threadId || !ObjectId.isValid(threadId)) {
      return NextResponse.json({ error: "Invalid thread ID format" }, { status: 400 });
    }

    const thread = await db.collection('threads').findOne({ _id: new ObjectId(threadId) });
    const messages = await db.collection('messages')
      .find({ threadId: new ObjectId(threadId) })
      .sort({ createdAt: 1 })
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