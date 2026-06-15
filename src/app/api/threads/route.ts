import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { verifyAuthToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const decoded = token ? verifyAuthToken(token) : null;

    if (!decoded) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const archived = searchParams.get('archived');
    
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '25', 10) || 25);
    const skip = Math.max(0, parseInt(searchParams.get('skip') || '0', 10) || 0);

    const archivedFilter = archived === 'true' ? { archived: true } : { $or: [{ archived: { $exists: false } }, { archived: false }] };
    const userIdFilter = { userId: new ObjectId(decoded.userId) };
    const combinedFilter = { ...archivedFilter, ...userIdFilter };

    if (query) {
      const threads = await db.collection('threads').aggregate([
        { $match: combinedFilter },
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
      .find(combinedFilter)
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

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const decoded = token ? verifyAuthToken(token) : null;

    if (!decoded) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { name = 'New Chat', currentModel = 'openrouter/auto', systemInstruction = '' } = body;

    const db = await getDb();
    const result = await db.collection('threads').insertOne({
      userId: new ObjectId(decoded.userId),
      name,
      currentModel,
      systemInstruction,
      createdAt: new Date(),
      updatedAt: new Date(),
      archived: false,
    });

    return NextResponse.json({ id: result.insertedId.toString() }, { status: 201 });
  } catch (error: any) {
    console.error("Create thread route failure:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}