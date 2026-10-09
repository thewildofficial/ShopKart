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

export interface CartItem { product: ProductSummary; quantity: number; }
export interface CartResponse { success: boolean; cart: CartItem[]; message?: string; }

export interface ShippingAddress { fullName: string; phone: string; addressLine1: string; city: string; state: string; pincode: string; }
export interface Order {
  _id: string; items: { product: string; name: string; price: number; quantity: number; image?: string }[];
  shippingAddress: ShippingAddress; totalAmount: number; paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  status: string; createdAt: string;
}
export interface PaymentDetails { shopKartOrderId: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; }
export interface PaymentOrder { shopKartOrderId: string; razorpayOrderId: string; keyId: string; amount: number; currency: string; }
