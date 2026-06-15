import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const decoded = token ? verifyAuthToken(token) : null;

    if (!decoded) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = await getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Unified Chat Hub" <no-reply@unifiedchat.com>',
      to: user.email,
      subject: 'Test Email from Unified Chat Hub',
      html: `
        <h2 style="color: #10b981;">✅ Test Email Successful!</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>This is a test email to verify that your SMTP configuration in Unified Chat Hub is working correctly.</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0; font-weight: bold;">Current Configuration:</p>
          <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
            <li><strong>Host:</strong> ${process.env.SMTP_HOST || 'smtp.gmail.com'}</li>
            <li><strong>Port:</strong> ${process.env.SMTP_PORT || '587'}</li>
            <li><strong>User:</strong> ${process.env.SMTP_USER || 'Not configured'}</li>
          </ul>
        </div>
        <p>If you received this, your email settings are correct and ready for use!</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ 
      success: true, 
      message: `Test email sent successfully to ${user.email}` 
    });
  } catch (error: any) {
    console.error('Test email error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to send test email. Check your .env SMTP settings.' 
    }, { status: 500 });
  }
}
