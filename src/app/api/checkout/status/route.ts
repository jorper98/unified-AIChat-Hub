import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/user';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
    });
  } catch (error: any) {
    console.error('Checkout status error:', error);
    return NextResponse.json({ error: error.message || 'Failed to retrieve session' }, { status: 500 });
  }
}
