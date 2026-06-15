import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: 'Logged out successfully' });
  response.cookies.set('auth_token', '', {
    httpOnly: true,
      secure: process.env.SECURE_COOKIE === 'true',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return response;
}
