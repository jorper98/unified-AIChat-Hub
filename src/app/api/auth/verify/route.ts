import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    console.log('[Verify] Received token:', token, 'Length:', token?.length);

    if (!token) {
      return NextResponse.json({ error: 'missing_token' }, { status: 400 });
    }

    const db = await getDb();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ emailVerificationToken: token });
    
    console.log('[Verify] User found:', user ? 'Yes' : 'No');

    if (!user) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
    }

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: { isEmailVerified: true, emailVerificationToken: null, updatedAt: new Date() },
      }
    );

    console.log('[Verify] Successfully verified user:', user.email);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
