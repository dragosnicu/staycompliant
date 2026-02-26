import { Link, useNavigate } from 'react-router-dom';
import TrialBanner from './TrialBanner';

export default function Navbar() {
  const navigate = useNavigate();
  const email    = localStorage.getItem('email') || '';

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    navigate('/login');
  };

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar-logo">RentPermit</Link>
        <div className="navbar-right">
          {email && <span className="navbar-email">{email}</span>}
          <Link to="/billing" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textDecoration: 'none' }}>
            Billing
          </Link>
          <button className="btn-ghost-sm" onClick={logout}>Log out</button>
        </div>
      </nav>
      <TrialBanner />
    </>
  );
}
