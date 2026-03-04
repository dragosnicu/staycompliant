// client/src/components/IcalSettings.jsx
// Drop this into your PropertyDetail page or a dedicated Settings page.
// Shows iCal URL inputs, sync button, last sync time, and import results.

import { useState, useEffect } from 'react';

const AIRBNB_HELP = 'https://www.airbnb.com/help/article/99';
const VRBO_HELP   = 'https://help.vrbo.com/articles/how-do-i-sync-my-vrbo-calendar-with-another-calendar';

export default function IcalSettings({ propertyId }) {
  const token   = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [data,        setData]        = useState(null);
  const [form,        setForm]        = useState({ ical_airbnb_url: '', ical_vrbo_url: '' });
  const [saving,      setSaving]      = useState(false);
  const [syncing,     setSyncing]     = useState(false);
  const [syncResult,  setSyncResult]  = useState(null);
  const [error,       setError]       = useState(null);
  const [saved,       setSaved]       = useState(false);

  useEffect(() => {
    fetch(`/api/ical/${propertyId}`, { headers })
      .then(r => r.json())
      .then(d => {
        setData(d);
        setForm({
          ical_airbnb_url: d.ical_airbnb_url || '',
          ical_vrbo_url:   d.ical_vrbo_url   || '',
        });
      })
      .catch(() => setError('Failed to load iCal settings'));
  }, [propertyId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    const res  = await fetch(`/api/ical/${propertyId}`, {
      method:  'PUT',
      headers,
      body:    JSON.stringify(form),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error || 'Failed to save');
      setSaving(false);
      return;
    }

    setData(json);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setError(null);

    const res  = await fetch(`/api/ical/${propertyId}/sync`, { method: 'POST', headers });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error || 'Sync failed');
      setSyncing(false);
      return;
    }

    setSyncResult(json.results);
    setSyncing(false);

    // Refresh sync status
    fetch(`/api/ical/${propertyId}`, { headers })
      .then(r => r.json())
      .then(setData);
  };

  const handleDisconnect = async (platform) => {
    if (!window.confirm(`Remove ${platform === 'airbnb' ? 'Airbnb' : 'VRBO'} calendar? This will also delete all imported bookings from this platform.`)) return;

    await fetch(`/api/ical/${propertyId}/${platform}`, { method: 'DELETE', headers });
    setForm(prev => ({
      ...prev,
      [platform === 'airbnb' ? 'ical_airbnb_url' : 'ical_vrbo_url']: '',
    }));
    setSyncResult(null);
    // Refresh
    fetch(`/api/ical/${propertyId}`, { headers })
      .then(r => r.json())
      .then(setData);
  };

  const hasAirbnb = !!(data?.ical_airbnb_url);
  const hasVrbo   = !!(data?.ical_vrbo_url);
  const hasAnyUrl = hasAirbnb || hasVrbo;

  return (
    <div className="ical-settings">
      <div className="ical-header">
        <div className="ical-header-text">
          <h3>📅 Calendar Import</h3>
          <p>Connect your Airbnb and VRBO calendars to automatically import bookings and track nights against your cap.</p>
        </div>

        {data?.ical_last_sync && (
          <div className={`sync-status-badge ${data.ical_sync_status}`}>
            {data.ical_sync_status === 'ok'    && '✓ Synced'}
            {data.ical_sync_status === 'error' && '⚠ Sync error'}
            {data.ical_sync_status === 'never' && '○ Not synced'}
            <span className="sync-time">
              {formatRelative(data.ical_last_sync)}
            </span>
          </div>
        )}
      </div>

      {error && <div className="ical-error">{error}</div>}

      {/* Airbnb iCal URL */}
      <div className="ical-platform-block">
        <div className="ical-platform-label">
          <span className="platform-dot airbnb" />
          Airbnb calendar URL
          <a href={AIRBNB_HELP} target="_blank" rel="noreferrer" className="ical-help-link">
            How to find it ↗
          </a>
        </div>
        <div className="ical-input-row">
          <input
            type="url"
            className="ical-url-input"
            placeholder="https://www.airbnb.com/calendar/ical/..."
            value={form.ical_airbnb_url}
            onChange={e => setForm({ ...form, ical_airbnb_url: e.target.value })}
          />
          {data?.ical_airbnb_url && (
            <button
              className="btn-ghost-sm disconnect-btn"
              onClick={() => handleDisconnect('airbnb')}
              title="Remove and delete imported bookings"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* VRBO iCal URL */}
      <div className="ical-platform-block">
        <div className="ical-platform-label">
          <span className="platform-dot vrbo" />
          VRBO calendar URL
          <a href={VRBO_HELP} target="_blank" rel="noreferrer" className="ical-help-link">
            How to find it ↗
          </a>
        </div>
        <div className="ical-input-row">
          <input
            type="url"
            className="ical-url-input"
            placeholder="https://www.vrbo.com/icalendar/..."
            value={form.ical_vrbo_url}
            onChange={e => setForm({ ...form, ical_vrbo_url: e.target.value })}
          />
          {data?.ical_vrbo_url && (
            <button
              className="btn-ghost-sm disconnect-btn"
              onClick={() => handleDisconnect('vrbo')}
              title="Remove and delete imported bookings"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="ical-actions">
        <button
          className="btn-secondary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save URLs'}
        </button>

        {hasAnyUrl && (
          <button
            className="btn-primary"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <>
                <span className="spin">↻</span> Syncing…
              </>
            ) : (
              '↻ Sync Now'
            )}
          </button>
        )}
      </div>

      {/* Auto-sync note */}
      {hasAnyUrl && (
        <p className="ical-auto-note">
          ⏱ Calendars sync automatically every 6 hours. Use "Sync Now" to import immediately.
        </p>
      )}

      {/* Sync results */}
      {syncResult && (
        <div className="sync-results">
          <div className="sync-results-title">Import complete</div>
          {syncResult.airbnb && (
            <SyncResultRow platform="Airbnb" result={syncResult.airbnb} />
          )}
          {syncResult.vrbo && (
            <SyncResultRow platform="VRBO" result={syncResult.vrbo} />
          )}
        </div>
      )}

      {/* How it works info box */}
      <div className="ical-info-box">
        <strong>How it works</strong>
        <ul>
          <li>Blocked nights (not real bookings) are automatically filtered out</li>
          <li>If Airbnb changes a booking's dates, the import updates it automatically</li>
          <li>Cancelled reservations are skipped</li>
          <li>Manually logged bookings are never overwritten</li>
        </ul>
      </div>
    </div>
  );
}

function SyncResultRow({ platform, result }) {
  if (result.error) {
    return (
      <div className="sync-result-row error">
        <span className="sync-platform">{platform}</span>
        <span className="sync-error-msg">⚠ {result.error}</span>
      </div>
    );
  }
  const total = result.imported + result.updated;
  return (
    <div className="sync-result-row">
      <span className="sync-platform">{platform}</span>
      <span className="sync-counts">
        {result.imported > 0 && <span className="new-badge">+{result.imported} new</span>}
        {result.updated  > 0 && <span className="upd-badge">{result.updated} updated</span>}
        {total === 0 && <span className="no-change">No changes</span>}
      </span>
    </div>
  );
}

function formatRelative(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return new Date(isoStr).toLocaleDateString();
}
