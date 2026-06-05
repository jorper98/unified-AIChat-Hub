import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const archived = searchParams.get('archived');
    
    // Pagination parameters (default limit: 25, skip: 0)
    // Use || 25 and || 0 to safely fallback if parseInt returns NaN (e.g., from 'undefined')
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '25', 10) || 25);
    const skip = Math.max(0, parseInt(searchParams.get('skip') || '0', 10) || 0);

    const archivedFilter = archived === 'true' ? { archived: true } : { $or: [{ archived: { $exists: false } }, { archived: false }] };

    if (query) {
      // Use aggregation pipeline with $lookup to efficiently find threads with matching messages
      const threads = await db.collection('threads').aggregate([
        { $match: archivedFilter },
        { $lookup: {
            from: 'messages',
            let: { threadId: '$_id' },
            pipeline: [
              { $match: { 
                  $expr: { $eq: ['$threadId', '$$threadId'] },
                  content: { $regex: query, $options: 'i' }
                } 
              },
              { $limit: 1 }
            ],
            as: 'matchedMessages'
          }
        },
        { $match: { matchedMessages: { $not: { $size: 0 } } } },
        { $sort: { updatedAt: -1 } },
        { $project: { matchedMessages: 0 } },
        { $skip: skip },
        { $limit: limit }
      ]).toArray();

      return NextResponse.json({ threads });
    }

    const threads = await db.collection('threads')
      .find(archivedFilter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json({ threads });
  } catch (error: any) {
    console.error("Global threads route failure:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}