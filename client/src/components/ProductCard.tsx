import { useRef, useState } from 'react';
import { api, ApiError, errorMessage } from '../services/api';
import { Link } from 'react-router-dom';
import type { ProductSummary } from '../types';
import { formatPrice } from '../utils/format';
import ProductImage from './ProductImage';

export default function ProductCard({ product }: { product: ProductSummary }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  async function save() {
    if (pending.current || saved) return;
    pending.current = true;
    setSaving(true);
    setError('');
    try { await api.addToWishlist(product._id); setSaved(true); }
    catch (failure) {
      if (failure instanceof ApiError && failure.status === 409) setSaved(true);
      else setError(errorMessage(failure));
    } finally { pending.current = false; setSaving(false); }
  }
  return <article className="product-card">
    <Link className="product-image" to={`/products/${product._id}`} aria-label={`View ${product.name}`}><ProductImage src={product.image} name={product.name} /></Link>
    <div className="product-card-body">
      <span className="eyebrow">{product.category}</span><h2>{product.name}</h2>
      <div className="product-meta"><strong>{formatPrice(product.price)}</strong><span className={product.stock > 0 ? 'stock in-stock' : 'stock out-of-stock'}>{product.stock > 0 ? `${product.stock} units left` : 'Out of stock'}</span></div>
      <Link className="button button-secondary details-link" to={`/products/${product._id}`}>View Details<span aria-hidden="true"> ↗</span></Link>
      <button className="button button-secondary wishlist-action" onClick={save} disabled={saving || saved}>{saving ? 'Saving…' : saved ? '♥ Added to Wishlist' : '♡ Add to Wishlist'}</button>
      {error && <p className="notice error" role="alert">{error}</p>}
    </div>
  </article>;
}
