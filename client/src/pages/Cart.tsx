import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import ProductImage from '../components/ProductImage';
import { formatPrice } from '../utils/format';
export default function Cart() {
  const cart = useCart();
  const unavailable = cart.cartItems.some(({ product, quantity }) => quantity > product.stock);
  const disabled = cart.loading || !!cart.error || cart.pendingId !== null;
  return <main className="catalog-layout">
    <section className="catalog-hero"><span className="eyebrow">READY WHEN YOU ARE</span><h1>My Cart</h1><p>Your everyday favourites, together in one place.</p></section>
    {cart.loading && <div className="catalog-state" role="status">Loading your cart...</div>}
    {!cart.loading && !cart.cartItems.length && !cart.error && <div className="catalog-state"><h2>Your cart is empty 🛒</h2><p>Looks like you haven’t added anything yet.</p><Link className="button button-primary" to="/products">Browse Products</Link></div>}
    {!!cart.cartItems.length && <div className="cart-layout"><section aria-label="Cart items" className="cart-items">
      {cart.cartItems.map(({ product, quantity }) => <article className="cart-item" key={product._id}>
        <Link className="cart-image" to={`/products/${product._id}`} aria-label={`View ${product.name}`}><ProductImage src={product.image} name={product.name} /></Link>
        <div><span className="eyebrow">{product.category}</span><h2><Link to={`/products/${product._id}`}>{product.name}</Link></h2><p>{formatPrice(product.price)} each · {product.stock ? `${product.stock} units available` : 'Out of stock'}</p>
          {quantity > product.stock && <p className="notice error" role="alert">Stock has changed. Reduce the quantity or remove this item.</p>}
          <div className="quantity-controls"><button className="button button-secondary" aria-label={`Decrease ${product.name} quantity`} disabled={disabled || quantity <= 1 || product.stock === 0} onClick={() => void cart.update(product._id, Math.min(quantity - 1, product.stock))}>−</button>
            <span aria-label={`${product.name} quantity`}>{quantity}</span>
            <button className="button button-secondary" aria-label={`Increase ${product.name} quantity`} disabled={disabled || quantity >= product.stock} onClick={() => void cart.update(product._id, quantity + 1)}>+</button></div>
          <button className="button button-secondary" disabled={disabled} onClick={() => void cart.remove(product._id)}>Remove {product.name}</button>
          {cart.pendingId === product._id && <p role="status">Updating cart…</p>}
        </div><strong>{formatPrice(product.price * quantity)}</strong>
      </article>)}
    </section><aside className="order-summary"><h2>Order Summary</h2><p>Items <strong>{cart.totalUnits}</strong></p><p>Subtotal <strong>{formatPrice(cart.subtotal)}</strong></p><p>Shipping and final stock checks come at checkout.</p>
      {unavailable && <p role="alert">Resolve stock changes before proceeding.</p>}
      {disabled || unavailable ? <button className="button button-primary" disabled>Proceed to Checkout</button> : <Link className="button button-primary" to="/checkout">Proceed to Checkout</Link>}
      <Link className="details-link" to="/products">Continue Shopping</Link>
    </aside></div>}
  </main>;
}
