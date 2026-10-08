import type { ProductFilters, ProductSort } from '../types';

interface Props { filters: ProductFilters; categories: string[]; onChange: (values: ProductFilters) => void; }
export default function SearchBar({ filters, categories, onChange }: Props) {
  return <section className="catalog-filters" aria-label="Product search and filters">
    <div className="search-field"><label htmlFor="search">Search products</label><input id="search" type="search" placeholder="Search products…" value={filters.search} onChange={(event) => onChange({ ...filters, search: event.target.value })} /></div>
    <div><label htmlFor="category">Category</label><select id="category" value={filters.category} onChange={(event) => onChange({ ...filters, category: event.target.value })}><option value="">All Categories</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
    <div><label htmlFor="sort">Sort by</label><select id="sort" value={filters.sort} onChange={(event) => onChange({ ...filters, sort: event.target.value as ProductSort })}><option value="">Newest first</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select></div>
  </section>;
}
