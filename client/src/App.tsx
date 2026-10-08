import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import CartNotice from './components/CartNotice';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import { api, ApiError, errorMessage, isAborted } from './services/api';
import Wishlist from './pages/Wishlist';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import type { Customer } from './types';

type Session = { status: 'authenticated'; customer: Customer } | { status: 'loading' | 'anonymous' | 'error'; customer: null };

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session>({ status: 'loading', customer: null });
  const [cartUserId, setCartUserId] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setSession({ status: 'loading', customer: null });
    setLogoutError('');
    // Verify every route change and page refresh against the server's cookie.
    api.me(controller.signal)
      .then((customer) => { setCartUserId(customer._id); setSession({ status: 'authenticated', customer }); })
      .catch((error: unknown) => {
        if (isAborted(error)) return;
        setCartUserId(null);
        setSession({ status: error instanceof ApiError && error.status === 401 ? 'anonymous' : 'error', customer: null });
      });
    // Cancel stale requests when navigating away or during StrictMode cleanup.
    return () => controller.abort();
  }, [location.pathname, retry]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError('');
    try {
      await api.logout();
      setCartUserId(null);
      setSession({ status: 'anonymous', customer: null });
      navigate('/login', { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // An expired session is already logged out from the server's point of view.
        setCartUserId(null);
        setSession({ status: 'anonymous', customer: null });
        navigate('/login', { replace: true });
      } else {
        setLogoutError(errorMessage(error));
      }
    } finally {
      setLoggingOut(false);
    }
  }

  let content;
  if (session.status === 'loading') {
    content = <main className="session-state" role="status">Checking your session…</main>;
  } else if (session.status === 'error') {
    content = <main className="session-state"><h1>We couldn’t check your session</h1><p role="alert">Unable to reach ShopKart. Please try again.</p><button className="button button-primary" onClick={() => setRetry((value) => value + 1)}>Try again</button></main>;
  } else {
    const loggedIn = session.status === 'authenticated';
    content = (
      <Routes>
        <Route path="/register" element={loggedIn ? <Navigate to="/home" replace /> : <Register />} />
        <Route path="/login" element={loggedIn ? <Navigate to="/home" replace /> : <Login />} />
        <Route path="/home" element={loggedIn ? <Home customer={session.customer!} /> : <Navigate to="/login" replace />} />
        <Route path="/cart" element={loggedIn ? <Cart /> : <Navigate to="/login" replace />} />
        <Route path="/checkout" element={loggedIn ? <Checkout /> : <Navigate to="/login" replace />} />
        <Route path="/wishlist" element={loggedIn ? <Wishlist /> : <Navigate to="/login" replace />} />
        <Route path="/products" element={loggedIn ? <Products /> : <Navigate to="/login" replace />} />
        <Route path="/products/:id" element={loggedIn ? <ProductDetails /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={loggedIn ? '/home' : '/login'} replace />} />
      </Routes>
    );
  }

  return <CartProvider key={cartUserId || 'anonymous'} userId={cartUserId}><Navbar customer={session.customer} onLogout={handleLogout} loggingOut={loggingOut} />{cartUserId && <CartNotice />}{logoutError && <p className="notice error logout-error" role="alert">{logoutError}</p>}{content}<footer className="site-footer">ShopKart · A little more everyday.</footer></CartProvider>;
}
