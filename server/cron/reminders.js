const cron   = require('node-cron');
const pool   = require('../db');
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function sendReminders() {
  if (!resend) {
    console.log('[Reminders] No RESEND_API_KEY set — skipping email send');
    return;
  }

  const THRESHOLDS = [60, 30, 7];

  for (const days of THRESHOLDS) {
    const { rows: permits } = await pool.query(
      `SELECT pm.*, p.name AS property_name, p.city, u.email, u.name AS user_name
       FROM permits pm
       JOIN properties p ON p.id = pm.property_id
       JOIN users u ON u.id = p.user_id
       WHERE pm.status = 'active'
         AND (pm.expiry_date - CURRENT_DATE) = $1
         AND NOT EXISTS (
           SELECT 1 FROM reminder_log rl
           WHERE rl.permit_id = pm.id AND rl.days_before = $1
         )`,
      [days]
    );

    for (const permit of permits) {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'reminders@staycompliant.app',
          to:   permit.email,
          subject: `⚠️ Permit expiring in ${days} days — ${permit.name}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;">
              <h2 style="color:#1e293b;">Permit Renewal Reminder</h2>
              <p>Hi ${permit.user_name || 'there'},</p>
              <p>Your <strong>${permit.name}</strong> for <strong>${permit.property_name}</strong>
                 ${permit.city ? `in ${permit.city}` : ''} expires in <strong>${days} days</strong>.</p>
              ${permit.expiry_date ? `<p>Expiry date: <strong>${new Date(permit.expiry_date).toLocaleDateString('en-US', { dateStyle: 'long' })}</strong></p>` : ''}
              ${permit.permit_number ? `<p>Permit number: <strong>${permit.permit_number}</strong></p>` : ''}
              <a href="${process.env.CLIENT_URL || 'https://staycompliant.app'}"
                 style="display:inline-block;margin-top:16px;padding:12px 24px;
                        background:#f59e0b;color:#000;text-decoration:none;
                        border-radius:8px;font-weight:bold;">
                View Dashboard →
              </a>
              <p style="margin-top:32px;color:#94a3b8;font-size:12px;">
                StayCompliant — Permit tracker for STR hosts
              </p>
            </div>
          `,
        });

        await pool.query(
          'INSERT INTO reminder_log (permit_id, days_before) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [permit.id, days]
        );

        console.log(`[Reminders] Sent ${days}-day reminder to ${permit.email} for permit ${permit.id}`);
      } catch (err) {
        console.error(`[Reminders] Failed for permit ${permit.id}:`, err.message);
      }
    }
  }
}

// Run every day at 8am
cron.schedule('0 8 * * *', () => {
  console.log('[Reminders] Running daily check…');
  sendReminders().catch(console.error);
});

console.log('[Reminders] Cron job scheduled (daily at 8am)');
