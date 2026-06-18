import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/user';
import { getDb } from '@/lib/db';
import Stripe from 'stripe';

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(secretKey);
}

const GLOBAL_DEFAULTS_ID = 'global_new_user_defaults';

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3031';

    const db = await getDb();
    const storedDefaults = await db.collection('settings').findOne({ _id: GLOBAL_DEFAULTS_ID as any });
    const creditPrice = storedDefaults?.creditPrice ?? 300;
    const creditAmount = storedDefaults?.creditAmount ?? 50;

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_intent_data: {
        metadata: {
          userId,
          type: 'message_credits',
          amount: String(creditAmount),
        },
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${creditAmount} Messages`,
              description: `${creditAmount} AI chat messages for Unified Chat Hub`,
            },
            unit_amount: creditPrice,
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/checkout?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout?canceled=true`,
      metadata: {
        userId,
        type: 'message_credits',
        amount: String(creditAmount),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout session error:', error);
    if (error.message?.includes('STRIPE_SECRET_KEY')) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create checkout session' }, { status: 500 });
  }
}
