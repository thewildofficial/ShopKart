import { useCart } from '../context/CartContext';
import type { ProductSummary } from '../types';
export default function AddToCartButton({ product }: { product: ProductSummary }) {
  const cart = useCart();
  const quantity = cart.cartItems.find((item) => item.product._id === product._id)?.quantity || 0;
  const atLimit = quantity >= product.stock;
  return <button className="button button-primary wishlist-action" onClick={() => void cart.add(product._id)}
    disabled={cart.loading || !!cart.error || cart.pendingId !== null || atLimit}>
    {cart.pendingId === product._id ? 'Adding…' : product.stock === 0 ? 'Out of stock' : atLimit ? 'Stock limit reached' : quantity ? 'Add Another' : 'Add to Cart'}
  </button>;
}
