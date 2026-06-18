import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { comparePassword, generateAuthToken } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    
    // Rate limit: 5 login attempts per IP per 10 minutes
    const rateLimit = checkRateLimit(`login:${clientIp}`, 5, 10 * 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password, rememberMe } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const db = await getDb();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`[Login] Failed: ${email}`);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      console.log(`[Login] Failed: ${email}`);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!user.isEmailVerified) {
      console.log(`[Login] Failed (unverified): ${email}`);
      return NextResponse.json({ error: 'Please verify your email address before logging in' }, { status: 403 });
    }

    console.log(`[Login] Succeeded: ${user.name} <${user.email}>`);
    const token = generateAuthToken(user._id.toString(), user.role, rememberMe);

    const response = NextResponse.json({
      message: 'Login successful',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.SECURE_COOKIE === 'true',
      sameSite: 'lax',
      maxAge: rememberMe ? 60 * 60 * 24 : 60 * 60, // 24 hours or 1 hour
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
