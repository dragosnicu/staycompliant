import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const PLATFORMS = ['airbnb', 'vrbo', 'both', 'direct', 'other'];
const CITIES = ['New York City', 'Austin', 'Nashville', 'Chicago', 'Denver', 'Portland', 'Los Angeles', 'Miami', 'Other'];

export default function AddProperty() {
  const navigate = useNavigate();
  const [form, setForm]   = useState({ name: '', address: '', city: '', state: '', platform: 'airbnb', night_cap: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const token   = localStorage.getItem('token');

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
              <select value={form.city} onChange={e => setForm({...form, city: e.target.value})}>
                <option value="">Select city…</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>State</label>
              <input type="text" placeholder="e.g. TX" maxLength={2} value={form.state}
                onChange={e => setForm({...form, state: e.target.value.toUpperCase()})} />
            </div>
          </div>

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
            <input type="number" placeholder="e.g. 180 (leave blank if no cap)"
              value={form.night_cap} onChange={e => setForm({...form, night_cap: e.target.value})} />
            <small style={{color:'#64748b', fontSize:'0.78rem', marginTop: 4, display:'block'}}>
              Set this if your city limits how many nights you can rent per year (e.g. NYC = 180 nights)
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
