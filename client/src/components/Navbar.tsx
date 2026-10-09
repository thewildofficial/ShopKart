import { useCart } from '../context/CartContext';
import { Link, NavLink } from 'react-router-dom';
import type { Customer } from '../types';

interface Props { customer: Customer | null; onLogout: () => Promise<void>; loggingOut: boolean; }
export default function Navbar({ customer, onLogout, loggingOut }: Props) {
  const cart = useCart();
  return <header className="navbar">
    <Link className="brand" to={customer ? '/products' : '/login'}><span className="brand-icon" aria-hidden="true">S</span> ShopKart<span className="brand-dot">.</span></Link>
    <nav aria-label="Main navigation">
      {customer ? <><NavLink to="/products">Products</NavLink><NavLink to="/wishlist">Wishlist</NavLink><NavLink to="/cart">Cart ({cart.loading ? '…' : cart.error ? '?' : cart.totalUnits})</NavLink><NavLink to="/orders">My Orders</NavLink><NavLink to="/home">My account</NavLink>
        <button className="button button-secondary" onClick={onLogout} disabled={loggingOut}>{loggingOut ? 'Signing out…' : 'Logout'}</button></>
        : <><NavLink to="/login">Login</NavLink><NavLink to="/register">Create account</NavLink></>}
    </nav>
  </header>;
}
