import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const GLOBAL_DEFAULTS_ID = 'global_new_user_defaults';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const stored = await db.collection('settings').findOne({ _id: GLOBAL_DEFAULTS_ID as any });

    return NextResponse.json({
      creditPrice: stored?.creditPrice ?? 300,
      creditAmount: stored?.creditAmount ?? 50,
    });
  } catch (error: any) {
    console.error('Error fetching credit pricing:', error);
    return NextResponse.json({
      creditPrice: 300,
      creditAmount: 50,
    });
  }
}