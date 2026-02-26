import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TrialBanner() {
  const [billing, setBilling] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return;
    fetch('/api/billing/status', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setBilling)
      .catch(() => {});
  }, []);

  if (!billing) return null;

  // Active subscriber — no banner
  if (billing.status === 'active') return null;

  // Trial active — show countdown
  if (billing.trialActive) {
    const urgent = billing.trialDaysLeft <= 3;
    return (
      <div style={{
        background: urgent ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.1)',
        borderBottom: `1px solid ${urgent ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
        padding: '10px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8,
        fontSize: '0.85rem',
      }}>
        <span style={{ color: urgent ? '#fca5a5' : '#fcd34d' }}>
          {urgent ? '⚠️' : '🕐'}{' '}
          <strong>{billing.trialDaysLeft} day{billing.trialDaysLeft !== 1 ? 's' : ''}</strong> left in your free trial.
          {urgent ? ' Upgrade now to keep your data and alerts.' : ''}
        </span>
        <button
          onClick={() => navigate('/billing')}
          style={{
            background: urgent ? '#ef4444' : '#f59e0b',
            color: '#000', border: 'none', borderRadius: 8,
            padding: '6px 18px', fontWeight: 700, cursor: 'pointer',
            fontSize: '0.82rem',
          }}
        >
          Upgrade — $19/mo →
        </button>
      </div>
    );
  }

  // Trial expired or canceled — hard wall
  if (billing.status === 'trialing' && billing.trialDaysLeft === 0) {
    return (
      <div style={{
        background: 'rgba(239,68,68,0.15)',
        borderBottom: '1px solid rgba(239,68,68,0.3)',
        padding: '10px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8, fontSize: '0.85rem',
      }}>
        <span style={{ color: '#fca5a5' }}>
          🔒 Your free trial has ended. Subscribe to continue using RentPermit.
        </span>
        <button
          onClick={() => navigate('/billing')}
          style={{
            background: '#ef4444', color: '#fff', border: 'none',
            borderRadius: 8, padding: '6px 18px', fontWeight: 700,
            cursor: 'pointer', fontSize: '0.82rem',
          }}
        >
          Subscribe now →
        </button>
      </div>
    );
  }

  // Past due
  if (billing.status === 'past_due') {
    return (
      <div style={{
        background: 'rgba(239,68,68,0.15)',
        borderBottom: '1px solid rgba(239,68,68,0.3)',
        padding: '10px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8, fontSize: '0.85rem',
      }}>
        <span style={{ color: '#fca5a5' }}>
          ⚠️ Payment failed. Please update your billing details to keep your account active.
        </span>
        <button
          onClick={() => navigate('/billing')}
          style={{
            background: '#ef4444', color: '#fff', border: 'none',
            borderRadius: 8, padding: '6px 18px', fontWeight: 700,
            cursor: 'pointer', fontSize: '0.82rem',
          }}
        >
          Fix billing →
        </button>
      </div>
    );
  }

  return null;
}
