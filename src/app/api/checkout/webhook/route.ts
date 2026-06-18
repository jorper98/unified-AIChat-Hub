import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import Stripe from 'stripe';

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(secretKey);
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: 'Stripe webhook secret not configured' }, { status: 500 });
    }

    const stripe = getStripe();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
    } catch (err: any) {
      console.error('Stripe webhook signature verification failed:', err.message);
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.payment_status !== 'paid') {
        return NextResponse.json({ received: true });
      }

      const userId = session.metadata?.userId;
      const creditAmount = parseInt(session.metadata?.amount || '50', 10);

      if (!userId) {
        console.error('Stripe webhook: missing userId in session metadata');
        return NextResponse.json({ error: 'Missing userId in metadata' }, { status: 400 });
      }

      try {
        const db = await getDb();
        const result = await db.collection('users').updateOne(
          { _id: new ObjectId(userId) },
          { $inc: { messageBalance: creditAmount } }
        );

        if (result.matchedCount === 0) {
          console.error(`Stripe webhook: user not found for userId ${userId}`);
        } else {
          console.log(`Stripe webhook: added ${creditAmount} credits to user ${userId}`);
        }
      } catch (dbError) {
        console.error('Stripe webhook DB error:', dbError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Stripe webhook error:', err);
    if (err.message?.includes('STRIPE_SECRET_KEY')) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }
    return NextResponse.json({ error: err.message || 'Webhook handler error' }, { status: 500 });
  }
}
