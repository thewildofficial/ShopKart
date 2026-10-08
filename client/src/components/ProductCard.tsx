import { useRef, useState } from 'react';
import { api, ApiError, errorMessage } from '../services/api';
import { Link } from 'react-router-dom';
import type { ProductSummary } from '../types';
import { formatPrice } from '../utils/format';
import ProductImage from './ProductImage';

interface Props {
  product: ProductSummary;
  saved: boolean;
  wishlistStatus: 'loading' | 'success' | 'error';
  onSaved: (id: string) => void;
}
export default function ProductCard({ product, saved, wishlistStatus, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  async function save() {
    if (pending.current || saved || wishlistStatus !== 'success') return;
    pending.current = true;
    setSaving(true);
    setError('');
    try { await api.addToWishlist(product._id); onSaved(product._id); }
    catch (failure) {
      if (failure instanceof ApiError && failure.status === 409) onSaved(product._id);
      else setError(errorMessage(failure));
    } finally { pending.current = false; setSaving(false); }
  }
  return <article className="product-card">
    <Link className="product-image" to={`/products/${product._id}`} aria-label={`View ${product.name}`}><ProductImage src={product.image} name={product.name} /></Link>
    <div className="product-card-body">
      <span className="eyebrow">{product.category}</span><h2>{product.name}</h2>
      <div className="product-meta"><strong>{formatPrice(product.price)}</strong><span className={product.stock > 0 ? 'stock in-stock' : 'stock out-of-stock'}>{product.stock > 0 ? `${product.stock} units left` : 'Out of stock'}</span></div>
      <Link className="button button-secondary details-link" to={`/products/${product._id}`}>View Details<span aria-hidden="true"> ↗</span></Link>
      <button className="button button-secondary wishlist-action" onClick={save} disabled={wishlistStatus !== 'success' || saving || saved}>{wishlistStatus === 'error' ? 'Wishlist unavailable' : wishlistStatus === 'loading' ? 'Checking wishlist…' : saving ? 'Saving…' : saved ? '♥ Added to Wishlist' : '♡ Add to Wishlist'}</button>
      {error && <p className="notice error" role="alert">{error}</p>}
    </div>
  </article>;
}
