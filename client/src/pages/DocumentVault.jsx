// client/src/pages/DocumentVault.jsx
// Route: /properties/:propertyId/documents

import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';

const DOC_TYPES = [
  { label: 'STR Permit',       icon: '📋' },
  { label: 'Fire Inspection',  icon: '🔥' },
  { label: 'Insurance Cert',   icon: '🛡️' },
  { label: 'Noise Ordinance',  icon: '🔇' },
  { label: 'Other',            icon: '📄' },
];

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function DocIcon({ mimeType }) {
  if (mimeType === 'application/pdf')   return <span className="doc-icon pdf">PDF</span>;
  if (mimeType?.startsWith('image/'))   return <span className="doc-icon img">IMG</span>;
  return <span className="doc-icon">DOC</span>;
}

export default function DocumentVault() {
  const { propertyId } = useParams();
  const token   = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const [docs,     setDocs]     = useState([]);
  const [permits,  setPermits]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error,    setError]    = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const [form, setForm] = useState({
    name:      '',
    permit_id: '',
    file:      null,
  });

  const fileInput = useRef(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/documents/${propertyId}`, { headers }).then(r => r.json()),
      fetch(`/api/permits/${propertyId}`,   { headers }).then(r => r.json()),
    ]).then(([docsData, permitsData]) => {
      setDocs(Array.isArray(docsData) ? docsData : []);
      setPermits(Array.isArray(permitsData) ? permitsData : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [propertyId]);

  const handleFile = (file) => {
    if (!file) return;
    setForm(f => ({
      ...f,
      file,
      name: f.name || file.name.replace(/\.[^/.]+$/, ''), // auto-fill name from filename
    }));
    setShowForm(true);
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleUpload = async () => {
    if (!form.file) return setError('Please select a file.');
    if (!form.name.trim()) return setError('Please enter a document name.');

    setUploading(true);
    setError(null);

    const fd = new FormData();
    fd.append('file',      form.file);
    fd.append('name',      form.name.trim());
    if (form.permit_id) fd.append('permit_id', form.permit_id);

    const res = await fetch(`/api/documents/${propertyId}`, {
      method: 'POST',
      headers,   // No Content-Type — let browser set multipart boundary
      body: fd,
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Upload failed');
      setUploading(false);
      return;
    }

    setShowForm(false);
    setForm({ name: '', permit_id: '', file: null });
    setUploading(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    await fetch(`/api/documents/${propertyId}/${id}`, { method: 'DELETE', headers });
    load();
  };

  const openPreview = (doc) => {
    window.open(`/api/documents/${propertyId}/${doc.id}/download`, '_blank');
  };

  // Group docs by linked permit
  const grouped = {};
  docs.forEach(d => {
    const key = d.permit_name || 'General Documents';
    grouped[key] = grouped[key] || [];
    grouped[key].push(d);
  });

  return (
    <div className="page document-vault-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <Link to={`/properties/${propertyId}`} className="back-link">← Property</Link>
          <h1>Document Vault</h1>
          <p className="page-subtitle">Store permits, inspection certs, and compliance docs</p>
        </div>
        <button className="btn-primary" onClick={() => { setShowForm(true); setError(null); }}>
          + Upload Document
        </button>
      </div>

      {/* Drag-and-drop zone */}
      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInput.current?.click()}
      >
        <input
          ref={fileInput}
          type="file"
          accept=".pdf,image/*"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
        <div className="drop-icon">📁</div>
        <p className="drop-label">Drag & drop or click to upload</p>
        <p className="drop-hint">PDF or image, up to 10 MB</p>
      </div>

      {/* Document list */}
      {loading ? (
        <p className="loading-text">Loading…</p>
      ) : docs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🗂️</div>
          <h3>No documents yet</h3>
          <p>Upload your STR permit, fire inspection certificate, or insurance docs.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([group, groupDocs]) => (
          <div key={group} className="doc-group">
            <h3 className="doc-group-title">{group}</h3>
            <div className="doc-grid">
              {groupDocs.map(doc => (
                <div key={doc.id} className="doc-card">
                  <div className="doc-card-top">
                    <DocIcon mimeType={doc.mime_type} />
                    <div className="doc-card-info">
                      <p className="doc-name">{doc.name}</p>
                      <p className="doc-meta">
                        {doc.original_name} · {formatBytes(doc.file_size)}
                      </p>
                      <p className="doc-date">
                        Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="doc-card-actions">
                    <button
                      className="btn-ghost-sm"
                      onClick={() => openPreview(doc)}
                    >
                      View
                    </button>
                    <button
                      className="btn-danger-sm"
                      onClick={() => handleDelete(doc.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Upload modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload Document</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>

            {error && <p className="form-error">{error}</p>}

            {/* File picker (if not already chosen via drag-drop) */}
            {!form.file ? (
              <div
                className="modal-file-picker"
                onClick={() => fileInput.current?.click()}
              >
                <p>📎 Click to choose a file</p>
                <p className="drop-hint">PDF or image, up to 10 MB</p>
              </div>
            ) : (
              <div className="selected-file">
                <DocIcon mimeType={form.file.type} />
                <span>{form.file.name}</span>
                <button
                  className="btn-ghost-sm"
                  onClick={() => setForm(f => ({ ...f, file: null }))}
                >
                  Change
                </button>
              </div>
            )}

            <div className="form-group">
              <label>Document name *</label>
              <div className="quick-labels">
                {DOC_TYPES.map(t => (
                  <button
                    key={t.label}
                    className={`quick-label-btn ${form.name === t.label ? 'selected' : ''}`}
                    onClick={() => setForm(f => ({ ...f, name: t.label }))}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Or type a custom name…"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            {permits.length > 0 && (
              <div className="form-group">
                <label>Link to permit (optional)</label>
                <select
                  value={form.permit_id}
                  onChange={e => setForm(f => ({ ...f, permit_id: e.target.value }))}
                >
                  <option value="">— Not linked —</option>
                  {permits.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={handleUpload}
                disabled={uploading || !form.file}
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
