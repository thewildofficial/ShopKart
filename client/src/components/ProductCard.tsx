import { Link } from 'react-router-dom';
import type { ProductSummary } from '../types';
import { formatPrice } from '../utils/format';
import ProductImage from './ProductImage';

export default function ProductCard({ product }: { product: ProductSummary }) {
  return <article className="product-card">
    <Link className="product-image" to={`/products/${product._id}`} aria-label={`View ${product.name}`}><ProductImage src={product.image} name={product.name} /></Link>
    <div className="product-card-body">
      <span className="eyebrow">{product.category}</span><h2>{product.name}</h2>
      <div className="product-meta"><strong>{formatPrice(product.price)}</strong><span className={product.stock > 0 ? 'stock in-stock' : 'stock out-of-stock'}>{product.stock > 0 ? `${product.stock} units left` : 'Out of stock'}</span></div>
      <Link className="button button-secondary details-link" to={`/products/${product._id}`}>View Details<span aria-hidden="true"> ↗</span></Link>
    </div>
  </article>;
}
