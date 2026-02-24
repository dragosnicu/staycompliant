// client/src/pages/BookingLog.jsx
// Route: /properties/:propertyId/bookings

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import NightCapWidget from '../components/NightCapWidget';

const PLATFORMS = ['airbnb', 'vrbo', 'direct', 'other'];

const EMPTY_FORM = {
  platform:   'airbnb',
  guest_name: '',
  check_in:   '',
  check_out:  '',
  notes:      '',
};

function nightsBetween(a, b) {
  if (!a || !b) return 0;
  const diff = new Date(b) - new Date(a);
  return Math.max(0, Math.round(diff / 86400000));
}

export default function BookingLog() {
  const { propertyId } = useParams();
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [bookings,  setBookings]  = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState(null);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  // Load bookings
  const load = () => {
    setLoading(true);
    fetch(`/api/bookings/${propertyId}?year=${yearFilter}`, { headers })
      .then(r => r.json())
      .then(data => {
        setBookings(data.bookings || []);
        setSummary(data.summary || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [propertyId, yearFilter]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(true);
    setError(null);
  };

  const openEdit = (b) => {
    setForm({
      platform:   b.platform   || 'other',
      guest_name: b.guest_name || '',
      check_in:   b.check_in?.slice(0, 10) || '',
      check_out:  b.check_out?.slice(0, 10) || '',
      notes:      b.notes      || '',
    });
    setEditId(b.id);
    setShowForm(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!form.check_in || !form.check_out) {
      return setError('Check-in and check-out dates are required.');
    }
    if (new Date(form.check_out) <= new Date(form.check_in)) {
      return setError('Check-out must be after check-in.');
    }

    setSaving(true);
    setError(null);

    const url    = editId
      ? `/api/bookings/${propertyId}/${editId}`
      : `/api/bookings/${propertyId}`;
    const method = editId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to save');
      setSaving(false);
      return;
    }

    setShowForm(false);
    setSaving(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this booking?')) return;
    await fetch(`/api/bookings/${propertyId}/${id}`, { method: 'DELETE', headers });
    load();
  };

  const previewNights = nightsBetween(form.check_in, form.check_out);

  return (
    <div className="page booking-log-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <Link to={`/properties/${propertyId}`} className="back-link">← Property</Link>
          <h1>Booking Log</h1>
          <p className="page-subtitle">Track every rented night against your annual cap</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Log Booking</button>
      </div>

      {/* Night Cap Summary */}
      <div className="ncw-card">
        <NightCapWidget propertyId={propertyId} />
      </div>

      {/* Year filter */}
      <div className="year-filter">
        {[new Date().getFullYear(), new Date().getFullYear() - 1].map(y => (
          <button
            key={y}
            className={`year-btn ${yearFilter === y ? 'active' : ''}`}
            onClick={() => setYearFilter(y)}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Booking table */}
      {loading ? (
        <p className="loading-text">Loading…</p>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🌙</div>
          <h3>No bookings logged yet</h3>
          <p>Start tracking your nights to stay ahead of your cap.</p>
          <button className="btn-primary" onClick={openAdd}>Log your first booking</button>
        </div>
      ) : (
        <div className="bookings-table-wrap">
          <table className="bookings-table">
            <thead>
              <tr>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Nights</th>
                <th>Platform</th>
                <th>Guest</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id}>
                  <td>{new Date(b.check_in).toLocaleDateString()}</td>
                  <td>{new Date(b.check_out).toLocaleDateString()}</td>
                  <td><span className="nights-badge">{b.nights}n</span></td>
                  <td>
                    <span className={`platform-tag ${b.platform}`}>
                      {b.platform?.charAt(0).toUpperCase() + b.platform?.slice(1)}
                    </span>
                  </td>
                  <td>{b.guest_name || '—'}</td>
                  <td className="notes-cell">{b.notes || '—'}</td>
                  <td className="actions-cell">
                    <button className="btn-ghost-sm" onClick={() => openEdit(b)}>Edit</button>
                    <button className="btn-danger-sm" onClick={() => handleDelete(b.id)}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
            {summary && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total {summary.year}</strong></td>
                  <td><strong>{summary.total_nights}n</strong></td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? 'Edit Booking' : 'Log a Booking'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>

            {error && <p className="form-error">{error}</p>}

            <div className="form-row">
              <div className="form-group">
                <label>Check-in *</label>
                <input
                  type="date"
                  value={form.check_in}
                  onChange={e => setForm({ ...form, check_in: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Check-out *</label>
                <input
                  type="date"
                  value={form.check_out}
                  onChange={e => setForm({ ...form, check_out: e.target.value })}
                />
              </div>
            </div>

            {previewNights > 0 && (
              <p className="nights-preview">
                📅 {previewNights} night{previewNights !== 1 ? 's' : ''}
              </p>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Platform</label>
                <div className="platform-picker">
                  {PLATFORMS.map(p => (
                    <button
                      key={p}
                      className={`platform-opt ${form.platform === p ? 'selected' : ''}`}
                      onClick={() => setForm({ ...form, platform: p })}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Guest name (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. John D."
                  value={form.guest_name}
                  onChange={e => setForm({ ...form, guest_name: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Notes (optional)</label>
              <textarea
                rows={2}
                placeholder="Any notes about this stay…"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Log Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
