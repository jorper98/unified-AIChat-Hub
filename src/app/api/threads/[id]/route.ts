import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { verifyAuthToken } from '@/lib/auth';

export async function PATCH(
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

    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: "Thread name is required" }, { status: 400 });
    }

    const result = await db.collection('threads').updateOne(
      { _id: new ObjectId(threadId), userId: new ObjectId(decoded.userId) },
      { $set: { name: name.trim(), updatedAt: new Date() } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "Thread not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, name: name.trim() });
  } catch (error: any) {
    console.error("Thread rename failure:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
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

    const oid = new ObjectId(threadId);
    const userId = new ObjectId(decoded.userId);

    // Check ownership before deleting
    const thread = await db.collection('threads').findOne({ _id: oid, userId });
    if (!thread) {
      return NextResponse.json({ error: "Thread not found or unauthorized" }, { status: 404 });
    }

    await db.collection('messages').deleteMany({ threadId: oid, userId });
    await db.collection('threads').deleteOne({ _id: oid, userId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Thread delete failure:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
