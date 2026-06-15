import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { verifyAuthToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const decoded = token ? verifyAuthToken(token) : null;

    if (!decoded) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = await getDb();
    const threadId = context.params.id;
    const { searchParams } = new URL(request.url);
    
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '100', 10) || 100);
    const skip = Math.max(0, parseInt(searchParams.get('skip') || '0', 10) || 0);

    if (!threadId || !ObjectId.isValid(threadId)) {
      return NextResponse.json({ error: "Invalid thread ID format" }, { status: 400 });
    }

    const userId = new ObjectId(decoded.userId);
    const oid = new ObjectId(threadId);

    const thread = await db.collection('threads').findOne({ _id: oid, userId });
    if (!thread) {
      return NextResponse.json({ error: "Thread not found or unauthorized" }, { status: 404 });
    }

    const messages = await db.collection('messages')
      .find({ threadId: oid, userId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json({ 
      thread: {
        id: thread._id.toString(),
        name: thread.name,
        currentModel: thread.currentModel,
        systemInstruction: thread.systemInstruction,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt
      },
      messages 
    });
  } catch (error: any) {
    console.error("Thread messages fetch failure:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const decoded = token ? verifyAuthToken(token) : null;

    if (!decoded) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = await getDb();
    const threadId = context.params.id;

    if (!threadId || !ObjectId.isValid(threadId)) {
      return NextResponse.json({ error: "Invalid thread ID format" }, { status: 400 });
    }

    const body = await request.json();
    const { role, content, modelUsed, systemInstruction, promptName, perplexityUsed, routingTool, usage } = body;

    const userId = new ObjectId(decoded.userId);
    const oid = new ObjectId(threadId);

    // Verify thread ownership
    const thread = await db.collection('threads').findOne({ _id: oid, userId });
    if (!thread) {
      return NextResponse.json({ error: "Thread not found or unauthorized" }, { status: 404 });
    }

    const result = await db.collection('messages').insertOne({
      userId,
      threadId: oid,
      role,
      content,
      modelUsed,
      systemInstruction: systemInstruction || thread.systemInstruction,
      promptName,
      perplexityUsed,
      routingTool,
      usage,
      createdAt: new Date(),
    });

    // Update thread updatedAt
    await db.collection('threads').updateOne(
      { _id: oid },
      { $set: { updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true, id: result.insertedId.toString() }, { status: 201 });
  } catch (error: any) {
    console.error("Thread message creation failure:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}