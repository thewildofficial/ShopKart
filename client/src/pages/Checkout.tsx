import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { api, errorMessage } from '../services/api';
import { loadRazorpay } from '../services/payment';
import { formatPrice } from '../utils/format';
import type { PaymentDetails, ShippingAddress } from '../types';
const fields: [keyof ShippingAddress, string][] = [['fullName', 'Full Name'], ['phone', 'Phone Number'], ['addressLine1', 'Address Line'], ['city', 'City'], ['state', 'State'], ['pincode', 'Pincode']];
export default function Checkout() {
  const cart = useCart(); const navigate = useNavigate();
  const [address, setAddress] = useState<ShippingAddress>({ fullName: '', phone: '', addressLine1: '', city: '', state: '', pincode: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({});
  const [busy, setBusy] = useState(false); const locked = useRef(false);
  const [message, setMessage] = useState(''); const [verification, setVerification] = useState<PaymentDetails | null>(null);
  function release() { locked.current = false; setBusy(false); }
  async function verify(details: PaymentDetails) {
    locked.current = true; setBusy(true); setMessage('');
    try { const { order } = await api.verifyPayment(details); await cart.refresh(); navigate(`/order-success/${order._id}`); }
    catch (error) { setVerification(details); setMessage(`${errorMessage(error)} You can retry verification without paying again.`); }
    finally { release(); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (locked.current) return;
    const next: Partial<Record<keyof ShippingAddress, string>> = {};
    for (const [key, label] of fields) if (!address[key].trim()) next[key] = `${label} is required.`;
    if (!/^[6-9]\d{9}$/.test(address.phone.trim())) next.phone = 'Enter a valid 10-digit Indian mobile number.';
    if (!/^\d{6}$/.test(address.pincode.trim())) next.pincode = 'Pincode must contain 6 digits.';
    setErrors(next); if (Object.keys(next).length) return;
    locked.current = true; setBusy(true); setMessage('');
    try {
      await loadRazorpay();
      const payment = await api.createPaymentOrder(address);
      const checkout = new window.Razorpay!({ key: payment.keyId, amount: payment.amount, currency: payment.currency, order_id: payment.razorpayOrderId, name: 'ShopKart Test Payment',
        prefill: { name: address.fullName, contact: address.phone },
        handler: response => { void verify({ ...response, shopKartOrderId: payment.shopKartOrderId }); },
        modal: { ondismiss: () => { release(); setMessage('Payment cancelled. Your cart is saved.'); } },
      });
      checkout.on('payment.failed', () => { setMessage('Payment failed. Your cart is saved. Please try again in the payment window.'); });
      checkout.open();
    } catch (error) { setMessage(errorMessage(error)); release(); }
  }
  return <main className="catalog-layout"><section className="catalog-hero"><span className="eyebrow">THE FINAL STEP</span><h1>Checkout</h1><p>Secure payment in Razorpay Test Mode.</p></section>
    {message && <p className="notice error" role="alert">{message}</p>}
    {verification && <button className="button button-primary" disabled={busy} onClick={() => void verify(verification)}>Retry payment verification</button>}
    {cart.loading ? <p role="status">Loading cart…</p> : cart.error ? <div role="alert">{cart.error}<button onClick={() => void cart.refresh()}>Try again</button></div> : !cart.cartItems.length ? <div className="catalog-state"><h2>Your cart is empty</h2><Link to="/products">Start Shopping</Link></div> : <form onSubmit={submit} className="cart-layout" noValidate>
      <section className="order-summary"><h2>Shipping Details</h2>{fields.map(([key, label]) => <div className="shipping-field" key={key}><label htmlFor={key}>{label}</label><input id={key} name={key} value={address[key]} maxLength={250} disabled={busy || !!verification} inputMode={key === 'phone' || key === 'pincode' ? 'numeric' : 'text'} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${key}-error` : undefined} onChange={event => setAddress({ ...address, [key]: event.target.value })} />{errors[key] && <p id={`${key}-error`} role="alert">{errors[key]}</p>}</div>)}</section>
      <aside className="order-summary"><h2>Order Summary</h2>{cart.cartItems.map(({ product, quantity }) => <p key={product._id}>{product.name} × {quantity}<strong>{formatPrice(product.price * quantity)}</strong></p>)}<p>Total <strong>{formatPrice(cart.subtotal)}</strong></p><p>Final prices and availability are checked on the server.</p><button className="button button-primary" disabled={busy || !!verification || !!cart.pendingId}>{busy ? 'Processing payment…' : 'Pay with Razorpay'}</button><Link to="/cart">Back to Cart</Link></aside>
    </form>}
  </main>;
}
