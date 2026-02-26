const express = require('express');
const router  = express.Router();
const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool    = require('../db');
const auth    = require('../middleware/auth');

const PRICE_ID   = process.env.STRIPE_PRICE_ID;
const CLIENT_URL = process.env.CLIENT_URL || 'https://app.rentpermit.com';

// GET /api/billing/status
router.get('/status', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT subscription_status, trial_ends_at, stripe_customer_id, stripe_subscription_id FROM users WHERE id=$1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const user          = rows[0];
    const now           = new Date();
    const trialEndsAt   = user.trial_ends_at ? new Date(user.trial_ends_at) : null;
    const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt - now) / 86400000)) : 0;
    const trialActive   = user.subscription_status === 'trialing' && trialDaysLeft > 0;
    const isActive      = user.subscription_status === 'active' || trialActive;

    res.json({
      status: user.subscription_status,
      trialEndsAt: user.trial_ends_at,
      trialDaysLeft,
      trialActive,
      isActive,
      hasSubscription: !!user.stripe_subscription_id,
    });
  } catch (err) {
    console.error('[billing/status]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/billing/create-checkout
router.post('/create-checkout', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT email, name, stripe_customer_id FROM users WHERE id=$1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const user = rows[0];

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name:  user.name || undefined,
        metadata: { rentpermit_user_id: String(req.user.id) },
      });
      customerId = customer.id;
      await pool.query('UPDATE users SET stripe_customer_id=$1 WHERE id=$2', [customerId, req.user.id]);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      subscription_data: {
        metadata: { rentpermit_user_id: String(req.user.id) },
      },
      success_url: `${CLIENT_URL}/billing?success=1`,
      cancel_url:  `${CLIENT_URL}/billing?canceled=1`,
      allow_promotion_codes: true,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[billing/create-checkout]', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /api/billing/portal
router.post('/portal', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT stripe_customer_id FROM users WHERE id=$1', [req.user.id]);
    const customerId = rows[0]?.stripe_customer_id;
    if (!customerId) return res.status(400).json({ error: 'No billing account found. Subscribe first.' });

    const session = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: `${CLIENT_URL}/billing`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('[billing/portal]', err);
    res.status(500).json({ error: 'Failed to open billing portal' });
  }
});

// POST /api/billing/webhook  (raw body required — registered before express.json())
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('[webhook] Bad signature:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const obj = event.data.object;

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        if (obj.subscription && obj.customer) {
          await pool.query(
            `UPDATE users SET stripe_subscription_id=$1, stripe_customer_id=$2, subscription_status='active'
             WHERE stripe_customer_id=$2`,
            [obj.subscription, obj.customer]
          );
        }
        break;

      case 'customer.subscription.updated':
        await pool.query(
          'UPDATE users SET subscription_status=$1 WHERE stripe_customer_id=$2',
          [obj.status, obj.customer]
        );
        break;

      case 'customer.subscription.deleted':
        await pool.query(
          `UPDATE users SET subscription_status='canceled', stripe_subscription_id=NULL
           WHERE stripe_customer_id=$1`,
          [obj.customer]
        );
        break;

      case 'invoice.payment_failed':
        await pool.query(
          'UPDATE users SET subscription_status=$1 WHERE stripe_customer_id=$2',
          ['past_due', obj.customer]
        );
        break;

      case 'invoice.payment_succeeded':
        await pool.query(
          'UPDATE users SET subscription_status=$1 WHERE stripe_customer_id=$2',
          ['active', obj.customer]
        );
        break;
    }
  } catch (err) {
    console.error('[webhook] DB error:', err);
  }

  res.json({ received: true });
});

module.exports = router;
