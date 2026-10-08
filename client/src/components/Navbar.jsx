import { Link, NavLink } from 'react-router-dom';

export default function Navbar({ customer, onLogout, loggingOut }) {
  return (
    <header className="navbar">
      <Link className="brand" to={customer ? '/home' : '/login'}>
        <span className="brand-icon" aria-hidden="true">S</span> ShopKart<span className="brand-dot">.</span>
      </Link>
      <nav aria-label="Main navigation">
        {customer ? (
          <button className="button button-secondary" onClick={onLogout} disabled={loggingOut}>
            {loggingOut ? 'Signing out…' : 'Logout'}
          </button>
        ) : (
          <><NavLink to="/login">Login</NavLink><NavLink to="/register">Create account</NavLink></>
        )}
      </nav>
    </header>
  );
}
