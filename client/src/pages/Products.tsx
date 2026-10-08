import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import SearchBar from '../components/SearchBar';
import { api, errorMessage, isAborted } from '../services/api';
import type { LoadState, ProductFilters, ProductSummary } from '../types';

const defaultCategories = ['Electronics', 'Fashion', 'Books', 'Home'];
export default function Products() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const category = params.get('category') || '';
  const rawSort = params.get('sort');
  const sort = rawSort === 'price_asc' || rawSort === 'price_desc' ? rawSort : '';
  const filters: ProductFilters = { search, category, sort };
  const [state, setState] = useState<LoadState<ProductSummary[]>>({ status: 'loading' });
  const [categories, setCategories] = useState(defaultCategories);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    // Discover additional categories from MongoDB without hardcoding product cards.
    api.products({ search: '', category: '', sort: '' }, controller.signal)
      .then(({ products }) => setCategories([...new Set([...defaultCategories, ...products.map((product) => product.category)])].sort()))
      .catch(() => { /* Listing below reports failures and offers retry. */ });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    // A short debounce avoids sending one request per keystroke. Abort prevents
    // slower, outdated responses from replacing the latest search results.
    const timer = setTimeout(() => {
      api.products({ search, category, sort }, controller.signal)
        .then(({ products }) => setState({ status: 'success', data: products }))
        .catch((error: unknown) => {
          if (!isAborted(error)) setState({ status: 'error', message: errorMessage(error) });
        });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, category, sort, retry]);

  function changeFilters(values: ProductFilters) {
    const next = new URLSearchParams();
    if (values.search) next.set('search', values.search);
    if (values.category) next.set('category', values.category);
    if (values.sort) next.set('sort', values.sort);
    // Shareable filter URLs survive refresh without localStorage.
    setParams(next, { replace: true });
  }

  return <main className="catalog-layout">
    <section className="catalog-hero"><span className="eyebrow">CURATED FOR YOUR EVERYDAY</span><h1>Find your next favourite.</h1><p>Good things for your desk, your home, and everything in between.</p><span className="hero-spark" aria-hidden="true">✦</span></section>
    <SearchBar filters={filters} categories={categories.includes(category) || !category ? categories : [...categories, category]} onChange={changeFilters} />
    {state.status === 'loading' && <div className="catalog-state" role="status">Loading products...</div>}
    {state.status === 'error' && <div className="catalog-state"><h2>Something went wrong while loading products.</h2><p role="alert">{state.message}</p><button className="button button-primary" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>}
    {state.status === 'success' && <><p className="results-count" role="status">{state.data.length} {state.data.length === 1 ? 'product' : 'products'} found</p>
      {state.data.length ? <div className="product-grid">{state.data.map((product) => <ProductCard key={product._id} product={product} />)}</div>
        : <div className="catalog-state"><h2>No products found.</h2><p>Try another search or choose a different category.</p>{(search || category || sort) && <button className="button button-secondary" onClick={() => changeFilters({ search: '', category: '', sort: '' })}>Clear filters</button>}</div>}
    </>}
  </main>;
}
