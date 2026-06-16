import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const decoded = token ? verifyAuthToken(token) : null;

    if (!decoded) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { data, mode } = body;
    
    if (!data || !Array.isArray(data.models) || !Array.isArray(data.providers)) {
      return NextResponse.json({ error: 'Invalid import data format' }, { status: 400 });
    }

    const db = await getDb();
    const userId = new ObjectId(decoded.userId);
    const existingSettings = await db.collection('settings').findOne({ userId });

    let newModels = data.models;
    let newProviders = data.providers;

    if (mode === 'merge') {
      const existingModels = existingSettings?.models || [];
      const existingProviders = existingSettings?.providers || [];

      const existingModelIds = new Set(existingModels.map((m: any) => m.id));
      const mergedModels = [
        ...existingModels,
        ...newModels.filter((m: any) => !existingModelIds.has(m.id))
      ];

      const existingProviderIds = new Set(existingProviders.map((p: any) => p.id));
      const mergedProviders = [
        ...existingProviders,
        ...newProviders.filter((p: any) => !existingProviderIds.has(p.id))
      ];

      newModels = mergedModels;
      newProviders = mergedProviders;
    }

    await db.collection('settings').updateOne(
      { userId },
      { 
        $set: { 
          models: newModels, 
          providers: newProviders,
          updatedAt: new Date()
        } 
      },
      { upsert: true }
    );

    return NextResponse.json({ 
      success: true, 
      message: mode === 'merge' ? 'Models and providers merged successfully' : 'Models and providers replaced successfully' 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
