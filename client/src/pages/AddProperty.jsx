import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { CITY_NAMES, getPreset } from '../data/cityPresets';

const PLATFORMS = ['airbnb', 'vrbo', 'both', 'direct', 'other'];

export default function AddProperty() {
  const navigate = useNavigate();
  const [form, setForm]     = useState({ name: '', address: '', city: '', state: '', platform: 'airbnb', night_cap: '' });
  const [preset, setPreset] = useState(null);
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem('token');

  const handleCityChange = (city) => {
    const p = getPreset(city);
    setPreset(city && city !== 'Other' ? p : null);
    setForm(f => ({
      ...f,
      city,
      state: p.state || f.state,
      night_cap: p.nightCap ? String(p.nightCap) : f.night_cap,
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Property name is required');
    setSaving(true); setError('');
    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, night_cap: form.night_cap ? parseInt(form.night_cap) : null }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed to save'); setSaving(false); return; }
    navigate(`/properties/${data.id}`);
  };

  return (
    <>
      <Navbar />
      <div className="page" style={{maxWidth: 600}}>
        <div className="page-header">
          <div>
            <Link to="/" className="back-link">← Dashboard</Link>
            <h1>Add Property</h1>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="card">
          <div className="form-group">
            <label>Property name *</label>
            <input type="text" placeholder="e.g. Downtown Condo" value={form.name}
              onChange={e => setForm({...form, name: e.target.value})} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>City</label>
              <select value={form.city} onChange={e => handleCityChange(e.target.value)}>
                <option value="">Select city…</option>
                {CITY_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>State</label>
              <input type="text" placeholder="e.g. TX" maxLength={2} value={form.state}
                onChange={e => setForm({...form, state: e.target.value.toUpperCase()})} />
            </div>
          </div>

          {/* City info box */}
          {preset && preset.notes && (
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 18, marginTop: -8 }}>
              <p style={{ color: '#fcd34d', fontSize: '0.82rem', marginBottom: preset.applicationUrl ? 6 : 0 }}>
                📋 {preset.notes}
              </p>
              {preset.applicationUrl && (
                <a href={preset.applicationUrl} target="_blank" rel="noreferrer"
                  style={{ color: '#f59e0b', fontSize: '0.8rem', textDecoration: 'none' }}>
                  Apply for permits in {form.city} →
                </a>
              )}
            </div>
          )}

          <div className="form-group">
            <label>Address</label>
            <input type="text" placeholder="Street address" value={form.address}
              onChange={e => setForm({...form, address: e.target.value})} />
          </div>

          <div className="form-group">
            <label>Platform</label>
            <div className="platform-picker">
              {PLATFORMS.map(p => (
                <button key={p} className={`platform-opt ${form.platform === p ? 'selected' : ''}`}
                  onClick={() => setForm({...form, platform: p})}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Annual night cap</label>
            <input type="number" placeholder="Leave blank if your city has no cap"
              value={form.night_cap} onChange={e => setForm({...form, night_cap: e.target.value})} />
            <small style={{color:'#64748b', fontSize:'0.78rem', marginTop: 4, display:'block'}}>
              {preset?.nightCap
                ? `Auto-filled from ${form.city} preset (${preset.nightCap} nights/year)`
                : 'Set this if your city limits how many nights you can rent per year'}
            </small>
          </div>

          <div style={{display:'flex', gap: 10, justifyContent:'flex-end', marginTop: 8}}>
            <Link to="/" className="btn-ghost">Cancel</Link>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Add Property'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
