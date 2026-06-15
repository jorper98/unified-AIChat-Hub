import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=missing_token', request.url));
    }

    const db = await getDb();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ emailVerificationToken: token });

    if (!user) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
    }

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: { isEmailVerified: true, emailVerificationToken: null, updatedAt: new Date() },
      }
    );

    return NextResponse.redirect(new URL('/login?success=verified', request.url));
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }
}
