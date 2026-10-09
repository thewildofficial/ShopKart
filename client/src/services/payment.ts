import type { PaymentDetails } from '../types';
type PaymentResponse = Omit<PaymentDetails, 'shopKartOrderId'>;
interface CheckoutOptions {
  key: string; amount: number; currency: string; order_id: string; name: string;
  prefill: { name: string; contact: string }; handler: (response: PaymentResponse) => void;
  modal: { ondismiss: () => void };
}
interface RazorpayCheckout { open(): void; on(event: 'payment.failed', handler: () => void): void; }
declare global { interface Window { Razorpay?: new (options: CheckoutOptions) => RazorpayCheckout; } }
let loading: Promise<void> | undefined;
export function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!loading) loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    const timeout = window.setTimeout(() => { script.remove(); loading = undefined; reject(new Error('Payment checkout timed out. Please try again.')); }, 15000);
    script.onload = () => { clearTimeout(timeout); if (window.Razorpay) resolve(); else { loading = undefined; reject(new Error('Unable to load payment checkout')); } };
    script.onerror = () => { clearTimeout(timeout); script.remove(); loading = undefined; reject(new Error('Unable to load payment checkout. Please try again.')); };
    document.head.appendChild(script);
  });
  return loading;
}
