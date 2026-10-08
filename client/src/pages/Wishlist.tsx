import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import WishlistCard from '../components/WishlistCard';
import { api, errorMessage, isAborted } from '../services/api';
import type { LoadState, ProductSummary } from '../types';

export default function Wishlist() {
  const [state, setState] = useState<LoadState<ProductSummary[]>>({ status: 'loading' });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    api.wishlist(controller.signal)
      .then(({ wishlist }) => setState({ status: 'success', data: wishlist }))
      .catch((error: unknown) => { if (!isAborted(error)) setState({ status: 'error', message: errorMessage(error) }); });
    return () => controller.abort();
  }, [retry]);
  function removed(id: string) {
    setState((current) => current.status === 'success' ? { status: 'success', data: current.data.filter((product) => product._id !== id) } : current);
  }
  return <main className="catalog-layout">
    <section className="catalog-hero"><span className="eyebrow">SAVED FOR LATER</span><h1>My Wishlist</h1><p>Keep your favourites close. Come back whenever you’re ready.</p></section>
    {state.status === 'loading' && <div className="catalog-state" role="status">Loading your wishlist...</div>}
    {state.status === 'error' && <div className="catalog-state"><h2>We couldn’t load your wishlist.</h2><p role="alert">{state.message}</p><button className="button button-primary" onClick={() => setRetry((value) => value + 1)}>Try Again</button></div>}
    {state.status === 'success' && <><p className="results-count" role="status">{state.data.length} {state.data.length === 1 ? 'product' : 'products'} saved</p>
      {state.data.length ? <div className="product-grid">{state.data.map((product) => <WishlistCard key={product._id} product={product} onRemoved={removed} />)}</div>
      : <div className="catalog-state"><h2>Your wishlist is empty ♥</h2><p>Save products you love and find them here later.</p><Link className="button button-primary" to="/products">Browse Products</Link></div>}
    </>}
  </main>;
}
