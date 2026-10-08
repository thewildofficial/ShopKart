import type { Customer, LoginValues, RegisterValues, Product, ProductSummary, ProductFilters } from '../types';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
export function isAborted(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

interface RequestOptions { method?: 'GET' | 'POST' | 'DELETE'; body?: LoginValues | RegisterValues; signal?: AbortSignal; }
async function request<T>(path: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    // The browser owns the HttpOnly cookie; no JWT is read or saved in React.
    response = await fetch(path, {
      method, credentials: 'include', signal,
      ...(body && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (isAborted(error)) throw error;
    throw new ApiError('Unable to reach ShopKart. Please try again.', 0);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(data?.message || 'Something went wrong. Please try again.', response.status);
  if (!data) throw new ApiError('ShopKart returned an unexpected response. Please try again.', response.status);
  return data as T;
}

export const api = {
  wishlist: (signal?: AbortSignal) => request<{ success: boolean; count: number; wishlist: ProductSummary[] }>('/api/wishlist', { signal }),
  addToWishlist: (id: string) => request<{ success: boolean; message: string }>(`/api/wishlist/${encodeURIComponent(id)}`, { method: 'POST' }),
  removeFromWishlist: (id: string) => request<{ success: boolean; message: string }>(`/api/wishlist/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  register: (details: RegisterValues) => request<{ success: boolean; customer: Customer }>('/customers/register', { method: 'POST', body: details }),
  login: (details: LoginValues) => request<{ success: boolean; customer: Customer }>('/customers/login', { method: 'POST', body: details }),
  me: (signal?: AbortSignal) => request<Customer>('/customers/me', { signal }),
  logout: () => request<{ success: boolean }>('/customers/logout', { method: 'POST' }),
  products: (filters: ProductFilters, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    if (filters.search.trim()) query.set('search', filters.search.trim());
    if (filters.category) query.set('category', filters.category);
    if (filters.sort) query.set('sort', filters.sort);
    // /api keeps JSON requests separate from the React /products page.
    return request<{ success: boolean; count: number; products: ProductSummary[] }>(`/api/products?${query}`, { signal });
  },
  product: (id: string, signal?: AbortSignal) => request<{ success: boolean; product: Product }>(`/api/products/${encodeURIComponent(id)}`, { signal }),
};
