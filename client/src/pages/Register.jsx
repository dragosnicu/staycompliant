import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm]   = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.email || !form.password) return setError('Email and password are required');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    setLoading(true); setError('');
    const res  = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Registration failed'); setLoading(false); return; }
    localStorage.setItem('token', data.token);
    localStorage.setItem('email', data.user.email);
    // New users always go through onboarding
    navigate('/onboarding');
  };

  return (
    <div className="auth-page">
      <div className="auth-side">
        <div className="auth-side-logo">RentPermit</div>
        <p className="auth-side-tagline">
          Never miss a permit renewal.<br />Track your nights. Stay legal.
        </p>
      </div>
      <div className="auth-form-panel">
        <div className="auth-form-box">
          <h2>Create your account</h2>
          <p>Free 14-day trial — no credit card needed</p>
          {error && <p className="form-error">{error}</p>}
          <div className="form-group">
            <label>Name</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Your name" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="Min 8 characters" />
          </div>
          <button className="btn-primary" style={{width:'100%'}} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
