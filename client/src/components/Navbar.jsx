import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const email = JSON.parse(atob((localStorage.getItem('token') || '..').split('.')[1] || 'e30='))?.email || '';

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">StayCompliant</Link>
      <div className="navbar-right">
        <span className="navbar-email">{email}</span>
        <button className="btn-ghost-sm" onClick={logout}>Log out</button>
      </div>
    </nav>
  );
}
