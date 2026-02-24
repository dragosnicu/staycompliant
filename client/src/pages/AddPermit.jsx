import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const COMMON_TYPES = [
  'STR License', 'Fire Safety Inspection', 'Building Permit',
  'Occupancy Certificate', 'Insurance Certificate', 'HOA Approval',
];

export default function AddPermit() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [form, setForm]     = useState({ name: '', permit_number: '', issue_date: '', expiry_date: '', notes: '' });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Permit name is required');
    setSaving(true); setError('');
    const res = await fetch(`/api/permits/${propertyId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed to save'); setSaving(false); return; }
    navigate(`/properties/${propertyId}`);
  };

  return (
    <>
      <Navbar />
      <div className="page" style={{maxWidth: 600}}>
        <div className="page-header">
          <div>
            <Link to={`/properties/${propertyId}`} className="back-link">← Property</Link>
            <h1>Add Permit</h1>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="card">
          <div className="form-group">
            <label>Permit type *</label>
            <div className="quick-labels">
              {COMMON_TYPES.map(t => (
                <button key={t} className={`quick-label-btn ${form.name === t ? 'selected' : ''}`}
                  onClick={() => setForm({...form, name: t})}>
                  {t}
                </button>
              ))}
            </div>
            <input type="text" placeholder="Or type a custom name…"
              value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>

          <div className="form-group">
            <label>Permit number</label>
            <input type="text" placeholder="e.g. STR-2024-00123"
              value={form.permit_number} onChange={e => setForm({...form, permit_number: e.target.value})} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Issue date</label>
              <input type="date" value={form.issue_date} onChange={e => setForm({...form, issue_date: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Expiry date</label>
              <input type="date" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} />
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea rows={3} placeholder="Any notes…" value={form.notes}
              onChange={e => setForm({...form, notes: e.target.value})} />
          </div>

          <div style={{display:'flex', gap:10, justifyContent:'flex-end'}}>
            <Link to={`/properties/${propertyId}`} className="btn-ghost">Cancel</Link>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Add Permit'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
