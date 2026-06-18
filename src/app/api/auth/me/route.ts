import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyAuthToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const db = await getDb();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        hasApiKey: !!user.openRouterApiKey,
        freeUses: user.freeUses || 0,
        messageBalance: user.messageBalance || 0,
        hasSeenWelcomeModal: user.hasSeenWelcomeModal || false,
      },
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}