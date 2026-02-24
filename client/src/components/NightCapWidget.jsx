import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function NightCapWidget({ propertyId, compact = false }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!propertyId) return;
    fetch(`/api/bookings/${propertyId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(r => r.json())
      .then(data => { setSummary(data.summary); setLoading(false); })
      .catch(() => setLoading(false));
  }, [propertyId]);

  if (loading) return <div className="night-cap-widget loading"><div className="skeleton-bar" /></div>;
  if (!summary) return null;

  const { total_nights, night_cap, year } = summary;
  const hasCap    = night_cap && night_cap > 0;
  const pct       = hasCap ? Math.min((total_nights / night_cap) * 100, 100) : null;
  const remaining = hasCap ? night_cap - total_nights : null;
  const isDanger  = hasCap && pct >= 90;
  const isWarning = hasCap && pct >= 75 && !isDanger;
  const barColor  = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e';

  return (
    <div className={`night-cap-widget ${compact ? 'compact' : ''}`}>
      <div className="ncw-header">
        <span className="ncw-label">{year} Night Cap</span>
        {hasCap && (
          <span className={`ncw-badge ${isDanger ? 'danger' : isWarning ? 'warning' : 'ok'}`}>
            {remaining} nights left
          </span>
        )}
      </div>
      <div className="ncw-count">
        <span className="ncw-used">{total_nights}</span>
        <span className="ncw-cap">{hasCap ? ` / ${night_cap} nights` : ' nights this year'}</span>
      </div>
      {hasCap && (
        <div className="ncw-track">
          <div className="ncw-fill" style={{ width: `${pct}%`, background: barColor }} />
        </div>
      )}
      {isDanger && <p className="ncw-alert">⚠️ You're at {Math.round(pct)}% of your annual cap.</p>}
      {!compact && (
        <Link to={`/properties/${propertyId}/bookings`} className="ncw-link">View booking log →</Link>
      )}
    </div>
  );
}
