import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductImage from './ProductImage';
import { api, ApiError, errorMessage } from '../services/api';
import type { ProductSummary } from '../types';
import { formatPrice } from '../utils/format';

export default function WishlistCard({ product, onRemoved }: { product: ProductSummary; onRemoved: (id: string) => void }) {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  async function remove() {
    if (pending.current) return;
    pending.current = true;
    setRemoving(true);
    setError('');
    try { await api.removeFromWishlist(product._id); onRemoved(product._id); }
    catch (failure) {
      // A second tab may already have removed it; reconcile with the server.
      if (failure instanceof ApiError && failure.status === 404) onRemoved(product._id);
      else setError(errorMessage(failure));
    } finally { pending.current = false; setRemoving(false); }
  }
  return <article className="product-card">
    <Link className="product-image" to={`/products/${product._id}`} aria-label={`View ${product.name}`}><ProductImage src={product.image} name={product.name} /></Link>
    <div className="product-card-body"><span className="eyebrow">{product.category}</span><h2>{product.name}</h2>
      <div className="product-meta"><strong>{formatPrice(product.price)}</strong><span className={product.stock > 0 ? 'stock in-stock' : 'stock out-of-stock'}>{product.stock > 0 ? `${product.stock} units left` : 'Out of stock'}</span></div>
      <Link className="button button-secondary details-link" to={`/products/${product._id}`}>View Details ↗</Link>
      <button className="button button-secondary wishlist-action" onClick={remove} disabled={removing}>{removing ? 'Removing…' : 'Remove from Wishlist ♥'}</button>
      {error && <p className="notice error" role="alert">{error}</p>}
    </div>
  </article>;
}
