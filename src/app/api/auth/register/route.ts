import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, generateVerificationToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import nodemailer from 'nodemailer';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import modelConfig from '@/config/models.json';

const GLOBAL_DEFAULTS_ID = 'global_new_user_defaults';

const DEFAULT_PROVIDERS = modelConfig.providers.map((p: any) => ({ id: p.id, name: p.name, type: p.type, endpoint: p.endpoint }));
const DEFAULT_MODELS = modelConfig.selectedModels.map((id: string) => {
  for (const provider of modelConfig.providers) {
    const model = provider.models.find((m: any) => m.id === id);
    if (model) return { id: model.id, name: model.name, provider: provider.id };
  }
  return { id, name: id, provider: 'openrouter' };
});

function getDefaultRouterModel(): string {
  return (modelConfig as any).routerModel || DEFAULT_MODELS[0]?.id || 'openai/gpt-4o';
}

function getDefaultImageGenerationModel(): string {
  const configModel = (modelConfig as any).imageGenerationModel;
  if (configModel) return configModel;
  return DEFAULT_MODELS.find((m) => m.id.includes('image') || m.id.includes('gemini'))?.id || DEFAULT_MODELS[0]?.id || 'openai/gpt-4o';
}

async function getNewUserDefaults(db: any) {
  const globalDefaults = await db.collection('settings').findOne({ _id: GLOBAL_DEFAULTS_ID as any });
  const models = Array.isArray(globalDefaults?.models) && globalDefaults.models.length > 0 ? globalDefaults.models : DEFAULT_MODELS;
  const providers = Array.isArray(globalDefaults?.providers) && globalDefaults.providers.length > 0 ? globalDefaults.providers : DEFAULT_PROVIDERS;
  return {
    models,
    providers,
    routerModel: globalDefaults?.routerModel || getDefaultRouterModel(),
    imageGenerationModel: globalDefaults?.imageGenerationModel || getDefaultImageGenerationModel()
  };
}

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
      hasSeenWelcomeModal: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const newUserDefaults = await getNewUserDefaults(db);
    await db.collection('settings').insertOne({
      userId: result.insertedId,
      ...newUserDefaults,
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
