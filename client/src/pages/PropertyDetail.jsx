import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import NightCapWidget from '../components/NightCapWidget';

function countdown(days) {
  if (days === null || days === undefined) return null;
  if (days < 0)  return { label: 'Expired',       cls: 'red' };
  if (days <= 7) return { label: `${days}d left`,  cls: 'red' };
  if (days <= 30) return { label: `${days}d left`, cls: 'amber' };
  return { label: `${days}d left`, cls: 'green' };
}

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token   = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [property, setProperty] = useState(null);
  const [permits,  setPermits]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  const load = () => {
    Promise.all([
      fetch(`/api/properties/${id}`, { headers }).then(r => r.json()),
      fetch(`/api/permits/${id}`,    { headers }).then(r => r.json()),
    ]).then(([prop, perms]) => {
      setProperty(prop);
      setPermits(Array.isArray(perms) ? perms : []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [id]);

  const markRenewed = async (permit) => {
    const newExpiry = new Date(permit.expiry_date);
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);
    await fetch(`/api/permits/${id}/${permit.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        ...permit,
        expiry_date: newExpiry.toISOString().slice(0, 10),
        status: 'active',
      }),
    });
    load();
  };

  const deleteProperty = async () => {
    if (!window.confirm('Delete this property and all its data?')) return;
    await fetch(`/api/properties/${id}`, { method: 'DELETE', headers });
    navigate('/');
  };

  if (loading) return <><Navbar /><div className="page"><p className="loading-text">Loading…</p></div></>;
  if (!property?.id) return <><Navbar /><div className="page"><p>Property not found.</p></div></>;

  return (
    <>
      <Navbar />
      <div className="page">
        <div className="page-header">
          <div>
            <Link to="/" className="back-link">← Dashboard</Link>
            <h1>{property.name}</h1>
            <p className="page-subtitle">
              {[property.city, property.state].filter(Boolean).join(', ')}
              {property.platform ? ` · ${property.platform}` : ''}
            </p>
          </div>
          <button className="btn-danger-sm" onClick={deleteProperty}>Delete property</button>
        </div>

        {/* Action bar */}
        <div className="action-bar">
          <Link to={`/properties/${id}/permits/add`} className="btn-primary">+ Add Permit</Link>
          <Link to={`/properties/${id}/bookings`}    className="btn-secondary">🌙 Night Log</Link>
          <Link to={`/properties/${id}/documents`}   className="btn-secondary">📁 Documents</Link>
        </div>

        {/* Night cap */}
        {property.night_cap && (
          <div className="ncw-card">
            <NightCapWidget propertyId={id} />
          </div>
        )}

        {/* Permits */}
        <p className="section-title">Permits & Licenses</p>
        {permits.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No permits added yet</h3>
            <p>Add your STR license, fire inspection, or other required permits.</p>
            <Link to={`/properties/${id}/permits/add`} className="btn-primary">Add first permit</Link>
          </div>
        ) : (
          <div className="permits-list">
            {permits.map(permit => {
              const cd = countdown(permit.days_until_expiry);
              return (
                <div key={permit.id} className={`permit-row ${cd?.cls || ''}`}>
                  <div>
                    <p className="permit-name">{permit.name}</p>
                    <p className="permit-meta">
                      {permit.permit_number ? `#${permit.permit_number} · ` : ''}
                      {permit.expiry_date
                        ? `Expires ${new Date(permit.expiry_date).toLocaleDateString('en-US', { dateStyle: 'medium' })}`
                        : 'No expiry date set'}
                    </p>
                  </div>
                  <div style={{display:'flex', gap:8, alignItems:'center'}}>
                    {cd && <span className={`countdown ${cd.cls}`}>{cd.label}</span>}
                    <button className="btn-ghost-sm" onClick={() => markRenewed(permit)}>Mark renewed</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
