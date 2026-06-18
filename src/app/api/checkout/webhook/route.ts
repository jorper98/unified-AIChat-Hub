import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature!, process.env.STRIPE_WEBHOOK_SECRET);
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
}
