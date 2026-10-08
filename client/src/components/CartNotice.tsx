import { useCart } from '../context/CartContext';
export default function CartNotice() {
  const { error, refresh, loading } = useCart();
  return error ? <div className="notice error cart-notice" role="alert"><p>Unable to synchronise your cart. {error}</p><button className="button button-secondary" disabled={loading} onClick={() => void refresh()}>Try Again</button></div> : null;
}
