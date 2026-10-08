import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorMessage, isAborted } from '../services/api';
import ProductImage from '../components/ProductImage';
import { formatPrice } from '../utils/format';
import type { LoadState, Product } from '../types';

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<LoadState<Product>>({ status: 'loading' });
  const [retry, setRetry] = useState(0);
  const [cartNotice, setCartNotice] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    setCartNotice(false);
    api.product(id || '', controller.signal)
      .then(({ product }) => setState({ status: 'success', data: product }))
      .catch((error: unknown) => { if (!isAborted(error)) setState({ status: 'error', message: errorMessage(error) }); });
    return () => controller.abort();
  }, [id, retry]);

  return <main className="catalog-layout">
    <Link className="back-link" to="/products">← Back to products</Link>
    {state.status === 'loading' && <div className="catalog-state" role="status">Loading product...</div>}
    {state.status === 'error' && <div className="catalog-state"><h1>We couldn’t load this product.</h1><p role="alert">{state.message}</p><button className="button button-primary" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>}
    {state.status === 'success' && <section className="product-detail">
      <div className="detail-image"><ProductImage key={state.data.image} src={state.data.image} name={state.data.name} /></div>
      <div className="detail-info"><span className="eyebrow">{state.data.category}</span><h1>{state.data.name}</h1><p className="detail-price">{formatPrice(state.data.price)}</p><p className="detail-description">{state.data.description}</p>
        <p className={state.data.stock > 0 ? 'stock in-stock' : 'stock out-of-stock'}>{state.data.stock > 0 ? `${state.data.stock} units left` : 'Out of stock'}</p>
        <button className="button button-primary" disabled={state.data.stock === 0} onClick={() => setCartNotice(true)}>Add to Cart</button>
        <p className="muted">Cart functionality is coming in a later lab.</p>
        {cartNotice && <p className="notice success" role="status">This is a preview button. Your cart has not been changed.</p>}
      </div>
    </section>}
  </main>;
}
