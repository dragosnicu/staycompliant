import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CITY_NAMES, getPreset } from '../data/cityPresets';

const PLATFORMS = ['airbnb', 'vrbo', 'both', 'direct', 'other'];

const COMMON_PERMIT_TYPES = [
  'STR License', 'Business License', 'Fire Safety Inspection',
  'Occupancy Certificate', 'Insurance Certificate', 'HOA Approval',
  'Hotel Occupancy Tax Registration', 'Tourist Development Tax Registration',
];

// ── Step indicators ───────────────────────────────────────────────────────────
function Steps({ current }) {
  const steps = ['Your property', 'First permit', 'All set'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}>
      {steps.map((label, i) => {
        const active   = i === current;
        const done     = i < current;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 80 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: done ? '#22c55e' : active ? '#f59e0b' : 'rgba(255,255,255,0.08)',
                border: `2px solid ${done ? '#22c55e' : active ? '#f59e0b' : 'rgba(255,255,255,0.15)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.85rem', fontWeight: 700,
                color: done || active ? '#000' : '#64748b',
                transition: 'all 0.2s',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '0.72rem', color: active ? '#f59e0b' : done ? '#22c55e' : '#64748b', fontWeight: active ? 600 : 400 }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? '#22c55e' : 'rgba(255,255,255,0.08)', margin: '0 8px', marginBottom: 24, transition: 'background 0.3s' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Add property ──────────────────────────────────────────────────────
function Step1({ onNext }) {
  const [form, setForm] = useState({ name: '', city: '', state: '', address: '', platform: 'airbnb', night_cap: '' });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  const [preset, setPreset] = useState(null);
  const token = localStorage.getItem('token');

  const handleCityChange = (city) => {
    const p = getPreset(city);
    setPreset(city !== 'Other' ? p : null);
    setForm(f => ({
      ...f,
      city,
      state: p.state || f.state,
      night_cap: p.nightCap ? String(p.nightCap) : '',
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Property name is required');
    if (!form.city) return setError('Please select a city');
    setSaving(true); setError('');
    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, night_cap: form.night_cap ? parseInt(form.night_cap) : null }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed to save'); setSaving(false); return; }
    onNext(data, preset);
  };

  return (
    <div>
      <h2 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: 6 }}>Tell us about your property</h2>
      <p style={{ color: '#94a3b8', marginBottom: 28, fontSize: '0.9rem' }}>We'll use this to suggest the right permits and track your compliance.</p>

      {error && <p className="form-error">{error}</p>}

      <div className="form-group">
        <label>Property name *</label>
        <input type="text" placeholder="e.g. Downtown Condo, Beach House" value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })} />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>City *</label>
          <select value={form.city} onChange={e => handleCityChange(e.target.value)}>
            <option value="">Select city…</option>
            {CITY_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>State</label>
          <input type="text" placeholder="e.g. TX" maxLength={2} value={form.state}
            onChange={e => setForm({ ...form, state: e.target.value.toUpperCase() })} />
        </div>
      </div>

      {/* City preset info box */}
      {preset && preset.notes && (
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 18 }}>
          <p style={{ color: '#fcd34d', fontSize: '0.82rem', marginBottom: preset.nightCap ? 6 : 0 }}>
            📋 <strong>{form.city}:</strong> {preset.notes}
          </p>
          {preset.nightCap && (
            <p style={{ color: '#f59e0b', fontSize: '0.82rem', marginTop: 4 }}>
              🌙 Night cap auto-set to <strong>{preset.nightCap} nights/year</strong>
            </p>
          )}
        </div>
      )}

      <div className="form-group">
        <label>Address</label>
        <input type="text" placeholder="Street address (optional)" value={form.address}
          onChange={e => setForm({ ...form, address: e.target.value })} />
      </div>

      <div className="form-group">
        <label>Platform</label>
        <div className="platform-picker">
          {PLATFORMS.map(p => (
            <button key={p} className={`platform-opt ${form.platform === p ? 'selected' : ''}`}
              onClick={() => setForm({ ...form, platform: p })}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Annual night cap</label>
        <input type="number" placeholder="Leave blank if your city has no cap"
          value={form.night_cap} onChange={e => setForm({ ...form, night_cap: e.target.value })} />
        <small style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 4, display: 'block' }}>
          This is the max nights you can rent per year in your city. We'll track this automatically.
        </small>
      </div>

      <button className="btn-primary" style={{ width: '100%', padding: 14, fontSize: '1rem', marginTop: 8 }}
        onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Continue →'}
      </button>
    </div>
  );
}

// ── Step 2: Add first permit ──────────────────────────────────────────────────
function Step2({ property, preset, onNext, onSkip }) {
  const suggestedTypes = preset?.permitTypes || ['STR License', 'Business License', 'Fire Safety Inspection'];
  const [form, setForm]     = useState({ name: suggestedTypes[0], permit_number: '', issue_date: '', expiry_date: '', notes: '' });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem('token');

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Permit name is required');
    setSaving(true); setError('');
    const res = await fetch(`/api/permits/${property.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed to save'); setSaving(false); return; }
    onNext();
  };

  // Combine suggested + common types, deduplicated
  const allTypes = [...new Set([...suggestedTypes, ...COMMON_PERMIT_TYPES])];

  return (
    <div>
      <h2 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: 6 }}>Add your first permit</h2>
      <p style={{ color: '#94a3b8', marginBottom: 4, fontSize: '0.9rem' }}>
        For <strong style={{ color: '#fff' }}>{property.name}</strong> in {property.city}.
        {preset?.applicationUrl && (
          <> <a href={preset.applicationUrl} target="_blank" rel="noreferrer" style={{ color: '#f59e0b' }}>Apply for permits →</a></>
        )}
      </p>
      <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: 24 }}>
        You can add more permits later. Start with the most important one.
      </p>

      {error && <p className="form-error">{error}</p>}

      <div className="form-group">
        <label>Permit type *</label>
        <div className="quick-labels" style={{ marginBottom: 10 }}>
          {allTypes.slice(0, 6).map(t => (
            <button key={t} className={`quick-label-btn ${form.name === t ? 'selected' : ''}`}
              onClick={() => setForm({ ...form, name: t })}>{t}</button>
          ))}
        </div>
        <input type="text" placeholder="Or type a custom name…"
          value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      </div>

      <div className="form-group">
        <label>Permit number</label>
        <input type="text" placeholder="e.g. STR-2024-00123"
          value={form.permit_number} onChange={e => setForm({ ...form, permit_number: e.target.value })} />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Issue date</label>
          <input type="date" value={form.issue_date} onChange={e => setForm({ ...form, issue_date: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Expiry date</label>
          <input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button className="btn-ghost" style={{ flex: 1 }} onClick={onSkip}>
          Skip for now
        </button>
        <button className="btn-primary" style={{ flex: 2, padding: 14, fontSize: '1rem' }}
          onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Add permit & finish →'}
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Done ──────────────────────────────────────────────────────────────
function Step3({ property, onFinish }) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🎉</div>
      <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: 10 }}>You're all set!</h2>
      <p style={{ color: '#94a3b8', marginBottom: 8, lineHeight: 1.6 }}>
        <strong style={{ color: '#fff' }}>{property.name}</strong> is now being tracked.
        We'll email you before any permits expire — 60, 30, and 7 days in advance.
      </p>
      <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 32 }}>
        You can add more properties, permits, and documents from your dashboard.
      </p>
      <button className="btn-primary" style={{ padding: '14px 40px', fontSize: '1rem' }} onClick={onFinish}>
        Go to dashboard →
      </button>
    </div>
  );
}

// ── Main Onboarding component ─────────────────────────────────────────────────
export default function Onboarding() {
  const navigate  = useNavigate();
  const [step, setStep]         = useState(0);
  const [property, setProperty] = useState(null);
  const [preset, setPreset]     = useState(null);

  const handlePropertySaved = (prop, cityPreset) => {
    setProperty(prop);
    setPreset(cityPreset);
    setStep(1);
  };

  const handlePermitSaved = () => setStep(2);
  const handleSkipPermit  = () => setStep(2);

  const handleFinish = () => {
    localStorage.setItem('onboarded', '1');
    navigate('/');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--navy-950)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '48px 24px 80px',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 40, fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b' }}>
        RentPermit
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 520,
        background: 'var(--navy-800)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: '36px 32px',
      }}>
        <Steps current={step} />

        {step === 0 && <Step1 onNext={handlePropertySaved} />}
        {step === 1 && <Step2 property={property} preset={preset} onNext={handlePermitSaved} onSkip={handleSkipPermit} />}
        {step === 2 && <Step3 property={property} onFinish={handleFinish} />}
      </div>

      {step < 2 && (
        <p style={{ marginTop: 20, color: '#475569', fontSize: '0.8rem' }}>
          You can skip any step and complete it from your dashboard later.
        </p>
      )}
    </div>
  );
}
