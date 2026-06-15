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
    const { id } = context.params;
    const body = await request.json().catch(() => ({}));
    const archived = body.archived !== false;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid thread ID" }, { status: 400 });
    }

    const result = await db.collection('threads').updateOne(
      { _id: new ObjectId(id), userId: new ObjectId(decoded.userId) },
      { $set: { archived, updatedAt: new Date() } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "Thread not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
