import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
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
      { _id: new ObjectId(threadId) },
      { $set: { name: name.trim(), updatedAt: new Date() } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, name: name.trim() });
  } catch (error: any) {
    console.error("Thread rename failure:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const db = await getDb();
    const threadId = context.params.id;

    if (!threadId || !ObjectId.isValid(threadId)) {
      return NextResponse.json({ error: "Invalid thread ID format" }, { status: 400 });
    }

    const oid = new ObjectId(threadId);
    await db.collection('messages').deleteMany({ threadId: oid });
    await db.collection('threads').deleteOne({ _id: oid });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Thread delete failure:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
