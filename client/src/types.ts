export interface Customer {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
}

export interface LoginValues { email: string; password: string; }
export interface RegisterValues extends LoginValues { fullName: string; phone: string; }
export type FormErrors = Partial<Record<keyof RegisterValues, string>>;

export interface ProductSummary {
  _id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  stock: number;
}
export interface Product extends ProductSummary { description: string; createdAt: string; }
export type ProductSort = '' | 'price_asc' | 'price_desc';
export interface ProductFilters { search: string; category: string; sort: ProductSort; }

// A discriminated union prevents displaying data before it has loaded.
export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };
