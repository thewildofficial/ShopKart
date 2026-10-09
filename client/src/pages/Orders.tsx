import { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { api, errorMessage, isAborted } from '../services/api';
import { formatPrice } from '../utils/format';
import type { Order, LoadState } from '../types';
export default function Orders() {
  const { id } = useParams(); const { pathname } = useLocation();
  const [state, setState] = useState<LoadState<Order[]>>({ status: 'loading' });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setState({ status: 'loading' });
    const result = id ? api.order(id, controller.signal).then(data => [data.order]) : api.orders(controller.signal).then(data => data.orders);
    result.then(data => setState({ status: 'success', data })).catch(error => { if (!isAborted(error)) setState({ status: 'error', message: errorMessage(error) }); });
    return () => controller.abort();
  }, [id, retry]);
  return <main className="catalog-layout"><section className="catalog-hero"><h1>{id ? 'Order Details' : 'My Orders'}</h1></section>
    {state.status === 'loading' && <p role="status">Loading orders…</p>}
    {state.status === 'error' && <div role="alert">{state.message}<button onClick={() => setRetry(retry + 1)}>Try again</button></div>}
    {state.status === 'success' && (!state.data.length ? <div className="catalog-state"><h2>You have not placed any orders yet.</h2><Link to="/products">Start Shopping</Link></div> : state.data.map(order => <article className="order-summary order-card" key={order._id}>
      {pathname.startsWith('/order-success/') && order.paymentStatus === 'PAID' && <h2>✓ Order Placed Successfully</h2>}
      <h2>Order #{order._id}</h2><p>{new Date(order.createdAt).toLocaleString('en-IN')}</p>
      {order.items.map(item => <p key={item.product}>{item.name} × {item.quantity}<strong>{formatPrice(item.price * item.quantity)}</strong></p>)}
      <p>Total <strong>{formatPrice(order.totalAmount)}</strong></p><p>Status: {order.status} · Payment: {order.paymentStatus}</p>
      {id ? <><h3>Shipping Address</h3><p>{order.shippingAddress.fullName} · {order.shippingAddress.phone}</p><p>{order.shippingAddress.addressLine1}, {order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pincode}</p><Link to="/orders">View My Orders</Link></> : <Link to={`/orders/${order._id}`}>View Details</Link>}
    </article>))}<Link className="details-link" to="/products">Continue Shopping</Link></main>;
}
