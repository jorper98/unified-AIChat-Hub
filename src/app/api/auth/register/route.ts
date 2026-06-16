import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, generateVerificationToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import nodemailer from 'nodemailer';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    
    // Rate limit: 5 registration attempts per IP per 10 minutes
    const rateLimit = checkRateLimit(`register:${clientIp}`, 5, 10 * 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();
    const usersCollection = db.collection('users');

    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const verificationToken = generateVerificationToken();
    const isFirstUser = (await usersCollection.countDocuments()) === 0;

    const result = await usersCollection.insertOne({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: isFirstUser ? 'admin' : 'user',
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      openRouterApiKey: null,
      freeUses: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Send verification email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3031';
    const verifyUrl = `${appUrl}/verify-email?token=${verificationToken}`;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Unified Chat Hub" <no-reply@unifiedchat.com>',
      to: email,
      subject: 'Verify your email address',
      html: `<p>Hello ${name},</p><p>Please click the link below to verify your email address:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
    });

    return NextResponse.json(
      { message: 'Registration successful. Please check your email to verify your account.', userId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
