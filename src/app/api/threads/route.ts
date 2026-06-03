import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const archived = searchParams.get('archived');

    const archivedFilter = archived === 'true' ? { archived: true } : { $or: [{ archived: { $exists: false } }, { archived: false }] };

    if (query) {
      // Find matching message documents
      const matchingMessages = await db.collection('messages')
        .find({ content: { $regex: query, $options: 'i' } })
        .toArray();

      if (matchingMessages.length === 0) {
        return NextResponse.json({ threads: [] });
      }

      const rawThreadIds = matchingMessages.map(m => m.threadId.toString());
      const uniqueIds = Array.from(new Set(rawThreadIds));
      
      const queryOids: ObjectId[] = uniqueIds
        .filter(id => ObjectId.isValid(id))
        .map(id => new ObjectId(id));

      if (queryOids.length === 0) {
        return NextResponse.json({ threads: [] });
      }

      const threads = await db.collection('threads')
        .find({ _id: { $in: queryOids }, ...archivedFilter })
        .sort({ updatedAt: -1 })
        .toArray();

      return NextResponse.json({ threads });
    }

    const threads = await db.collection('threads')
      .find(archivedFilter)
      .sort({ updatedAt: -1 })
      .toArray();

    return NextResponse.json({ threads });
  } catch (error: any) {
    console.error("Global threads route failure:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}