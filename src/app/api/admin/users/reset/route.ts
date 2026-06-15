import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyAuthToken, hashPassword, generateVerificationToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const decoded = token ? verifyAuthToken(token) : null;

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const clientIp = getClientIp(request);
    // Rate limit: 5 password resets per admin IP per 10 minutes
    const rateLimit = checkRateLimit(`reset:${clientIp}`, 5, 10 * 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many password reset attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const db = await getDb();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate a random 12-character password
    const newPassword = crypto.randomBytes(6).toString('hex');
    const passwordHash = await hashPassword(newPassword);
    const resetToken = generateVerificationToken();

    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          passwordHash, 
          emailVerificationToken: resetToken, // Re-using this field temporarily for reset
          updatedAt: new Date() 
        } 
      }
    );

    // Send password reset email
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
    // We'll use the verify endpoint but handle it as a password reset if the token matches and we add a flag, 
    // OR we just tell the admin the new password directly since they are the admin.
    // For security, let's just return the new password to the Admin, and they can share it, 
    // OR we send an email with a link that sets a temporary password.
    // Let's send an email with the new password for simplicity in this self-hosted app.
    
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Unified Chat Hub" <no-reply@unifiedchat.com>',
      to: user.email,
      subject: 'Your password has been reset',
      html: `<p>Hello ${user.name},</p><p>An administrator has reset your password.</p><p>Your new temporary password is: <strong>${newPassword}</strong></p><p>Please log in and change it immediately.</p>`,
    });

    return NextResponse.json({ 
      message: 'Password reset successfully. A temporary password has been sent to the user\'s email.'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
