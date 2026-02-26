import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Billing() {
  const [billing, setBilling]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [working, setWorking]   = useState(false);
  const [searchParams]          = useSearchParams();
  const token                   = localStorage.getItem('token');
  const headers                 = { Authorization: `Bearer ${token}` };

  const success  = searchParams.get('success')  === '1';
  const canceled = searchParams.get('canceled') === '1';

  useEffect(() => {
    fetch('/api/billing/status', { headers })
      .then(r => r.json())
      .then(data => { setBilling(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const startCheckout = async () => {
    setWorking(true);
    const res  = await fetch('/api/billing/create-checkout', { method: 'POST', headers });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { alert(data.error || 'Something went wrong'); setWorking(false); }
  };

  const openPortal = async () => {
    setWorking(true);
    const res  = await fetch('/api/billing/portal', { method: 'POST', headers });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { alert(data.error || 'Something went wrong'); setWorking(false); }
  };

  const statusLabel = {
    active:   { text: 'Active',      color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
    trialing: { text: 'Free trial',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    past_due: { text: 'Past due',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
    canceled: { text: 'Canceled',    color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  };

  const badge = billing ? (statusLabel[billing.status] || statusLabel.trialing) : null;

  return (
    <>
      <Navbar />
      <div className="page" style={{ maxWidth: 560 }}>
        <div className="page-header">
          <div>
            <h1>Billing</h1>
            <p className="page-subtitle">Manage your RentPermit subscription</p>
          </div>
        </div>

        {success && (
          <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, color: '#86efac', fontSize: '0.9rem' }}>
            🎉 You're subscribed! Welcome to RentPermit. Your account is now active.
          </div>
        )}

        {canceled && (
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, color: '#fcd34d', fontSize: '0.9rem' }}>
            No worries — your trial is still running. You can subscribe anytime.
          </div>
        )}

        {loading ? (
          <p className="loading-text">Loading…</p>
        ) : (
          <div className="card">

            {/* Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Status</p>
                <span style={{ background: badge?.bg, color: badge?.color, padding: '4px 14px', borderRadius: 999, fontWeight: 700, fontSize: '0.85rem' }}>
                  {badge?.text}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Plan</p>
                <p style={{ fontWeight: 600, color: '#fff' }}>$19 / month</p>
              </div>
            </div>

            {/* Trial info */}
            {billing?.trialActive && (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                <p style={{ color: '#fcd34d', fontSize: '0.875rem' }}>
                  🕐 Your free trial ends in <strong>{billing.trialDaysLeft} day{billing.trialDaysLeft !== 1 ? 's' : ''}</strong>.
                  {billing.trialEndsAt && (
                    <span style={{ color: 'var(--text-muted)' }}> ({new Date(billing.trialEndsAt).toLocaleDateString('en-US', { dateStyle: 'medium' })})</span>
                  )}
                </p>
              </div>
            )}

            {billing?.status === 'trialing' && billing.trialDaysLeft === 0 && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                <p style={{ color: '#fca5a5', fontSize: '0.875rem' }}>
                  🔒 Your trial has ended. Subscribe below to restore full access.
                </p>
              </div>
            )}

            {billing?.status === 'past_due' && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                <p style={{ color: '#fca5a5', fontSize: '0.875rem' }}>
                  ⚠️ Last payment failed. Update your payment method to keep access.
                </p>
              </div>
            )}

            {/* What's included */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Included in your plan</p>
              {[
                'Unlimited properties',
                'Unlimited permits & documents',
                'Night cap tracking with annual booking log',
                'Email alerts at 60, 30 & 7 days before expiry',
                'Document vault (PDFs & images)',
              ].map(f => (
                <div key={f} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: '0.875rem', color: 'var(--text)' }}>
                  <span style={{ color: '#f59e0b', fontWeight: 700 }}>✓</span>
                  {f}
                </div>
              ))}
            </div>

            {/* CTA */}
            {billing?.status === 'active' ? (
              <button
                className="btn-secondary"
                onClick={openPortal}
                disabled={working}
                style={{ width: '100%', textAlign: 'center' }}
              >
                {working ? 'Opening…' : 'Manage subscription & invoices →'}
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={startCheckout}
                disabled={working}
                style={{ width: '100%', fontSize: '1rem', padding: '14px' }}
              >
                {working ? 'Redirecting to checkout…' : 'Subscribe — $19/month →'}
              </button>
            )}

            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: 12 }}>
              Secure checkout via Stripe · Cancel anytime · No contracts
            </p>
          </div>
        )}
      </div>
    </>
  );
}
