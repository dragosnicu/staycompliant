import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import NightCapWidget from '../components/NightCapWidget';

export default function Dashboard() {
  const [properties, setProperties] = useState([]);
  const [permits,    setPermits]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const token   = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      fetch('/api/properties', { headers }).then(r => r.json()),
      fetch('/api/permits/dashboard', { headers }).then(r => r.json()),
    ]).then(([props, perms]) => {
      setProperties(Array.isArray(props) ? props : []);
      setPermits(Array.isArray(perms) ? perms : []);
      setLoading(false);
    });
  }, []);

  const urgent  = permits.filter(p => p.days_until_expiry <= 7);
  const warning = permits.filter(p => p.days_until_expiry > 7 && p.days_until_expiry <= 30);

  return (
    <>
      <Navbar />
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Dashboard</h1>
            <p className="page-subtitle">Your compliance overview</p>
          </div>
          <Link to="/properties/add" className="btn-primary">+ Add Property</Link>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">{properties.length}</div>
            <div className="stat-label">Properties</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{permits.length}</div>
            <div className="stat-label">Active Permits</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{color: urgent.length ? '#ef4444' : '#22c55e'}}>
              {urgent.length}
            </div>
            <div className="stat-label">Expiring Soon</div>
          </div>
        </div>

        {/* Urgency banners */}
        {urgent.map(p => (
          <div key={p.id} className="urgency-banner red">
            🚨 <strong>{p.name}</strong> at {p.property_name} expires in{' '}
            <strong>{p.days_until_expiry} day{p.days_until_expiry !== 1 ? 's' : ''}</strong>
          </div>
        ))}
        {warning.map(p => (
          <div key={p.id} className="urgency-banner amber">
            ⚠️ <strong>{p.name}</strong> at {p.property_name} expires in{' '}
            <strong>{p.days_until_expiry} days</strong>
          </div>
        ))}

        {/* Properties */}
        {loading ? (
          <p className="loading-text">Loading…</p>
        ) : properties.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏠</div>
            <h3>No properties yet</h3>
            <p>Add your first property to start tracking compliance.</p>
            <Link to="/properties/add" className="btn-primary">Add your first property</Link>
          </div>
        ) : (
          <>
            <p className="section-title">Your Properties</p>
            <div className="property-grid">
              {properties.map(p => (
                <Link to={`/properties/${p.id}`} key={p.id} className="property-card">
                  <h3>{p.name}</h3>
                  <p className="city">{[p.city, p.state].filter(Boolean).join(', ') || 'Location not set'}</p>
                  <NightCapWidget propertyId={p.id} compact />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
