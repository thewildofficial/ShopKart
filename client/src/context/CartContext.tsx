import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { api, errorMessage, isAborted } from '../services/api';
import type { CartItem } from '../types';

interface CartState {
  cartItems: CartItem[]; loading: boolean; error: string; pendingId: string | null;
  totalUnits: number; subtotal: number;
  refresh: () => Promise<void>;
  add: (id: string) => Promise<void>;
  update: (id: string, quantity: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
}
const CartContext = createContext<CartState | null>(null);
export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error('CartProvider is required');
  return cart;
}
export function CartProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [cartItems, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const busy = useRef(false);
  const generation = useRef(0);
  const currentRequest = useRef<AbortController | null>(null);
  const { pathname } = useLocation();
  const refresh = useCallback(async () => {
    if (!userId || busy.current) return;
    currentRequest.current?.abort();
    const controller = new AbortController();
    currentRequest.current = controller;
    const version = ++generation.current;
    setLoading(true); setError('');
    try {
      const { cart } = await api.cart(controller.signal);
      if (version === generation.current) setItems(cart);
    } catch (failure) {
      if (!isAborted(failure) && version === generation.current) setError(errorMessage(failure));
    } finally { if (version === generation.current) setLoading(false); }
  }, [userId]);
  useEffect(() => {
    // Clear one customer's state before loading another customer's cart.
    ++generation.current; currentRequest.current?.abort(); busy.current = false;
    setItems([]); setPendingId(null); setError(''); setLoading(false);
    void refresh();
    return () => { ++generation.current; currentRequest.current?.abort(); };
  }, [refresh]);
  useEffect(() => { if (pathname === '/cart') void refresh(); }, [pathname, refresh]);

  async function mutate(id: string, operation: (signal: AbortSignal) => ReturnType<typeof api.cart>) {
    if (!userId || busy.current || loading || error) return;
    busy.current = true;
    currentRequest.current?.abort();
    const controller = new AbortController(); currentRequest.current = controller;
    const version = ++generation.current;
    setPendingId(id);
    try {
      const { cart } = await operation(controller.signal);
      if (version === generation.current) setItems(cart);
    } catch (failure) {
      if (!isAborted(failure) && version === generation.current) {
        // A network failure may follow a committed write. Refresh reconciles
        // that uncertainty before allowing another quantity mutation.
        setError(errorMessage(failure));
      }
    } finally {
      if (version === generation.current) { busy.current = false; setPendingId(null); }
    }
  }
  const totalUnits = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + Math.round(item.product.price * 100) * item.quantity, 0) / 100;
  return <CartContext.Provider value={{ cartItems, loading, error, pendingId, totalUnits, subtotal, refresh,
    add: (id) => mutate(id, (signal) => api.addToCart(id, signal)),
    update: (id, quantity) => mutate(id, (signal) => api.updateCartQuantity(id, quantity, signal)),
    remove: (id) => mutate(id, (signal) => api.removeFromCart(id, signal)),
  }}>{children}</CartContext.Provider>;
}
