import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm]   = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true); setError('');
    const res  = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Login failed'); setLoading(false); return; }
    localStorage.setItem('token', data.token);
    navigate('/');
  };

  return (
    <div className="auth-page">
      <div className="auth-side">
        <div className="auth-side-logo">StayCompliant</div>
        <p className="auth-side-tagline">
          Permit tracking and compliance dashboard<br />for short-term rental hosts.
        </p>
      </div>
      <div className="auth-form-panel">
        <div className="auth-form-box">
          <h2>Welcome back</h2>
          <p>Sign in to your dashboard</p>
          {error && <p className="form-error">{error}</p>}
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="••••••••" />
          </div>
          <button className="btn-primary" style={{width:'100%'}} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="auth-switch">No account? <Link to="/register">Create one free</Link></p>
        </div>
      </div>
    </div>
  );
}
