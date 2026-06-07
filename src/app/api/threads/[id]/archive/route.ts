import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const db = await getDb();
    const { id } = context.params;
    const body = await request.json().catch(() => ({}));
    const archived = body.archived !== false;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid thread ID" }, { status: 400 });
    }

    await db.collection('threads').updateOne(
      { _id: new ObjectId(id) },
      { $set: { archived, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
