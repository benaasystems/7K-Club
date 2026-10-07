import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Item } from '../lib/types';
import { useAuth } from './AuthProvider';

export interface CartLine {
  item: Item;
  quantity: number;
}

interface CartState {
  branchId: string | null;
  lines: CartLine[];
}

interface CartValue extends CartState {
  /** True only for a signed-in customer — guests, staff and admins have no cart. */
  enabled: boolean;
  count: number;
  total: number;
  /** Returns false when the item belongs to another branch than the cart (caller should confirm + replaceWith). */
  add: (item: Item, quantity?: number) => boolean;
  setQuantity: (itemId: string, quantity: number) => void;
  remove: (itemId: string) => void;
  /** Empty the cart and start it again with this item (used when switching branch). */
  replaceWith: (item: Item) => void;
  clear: () => void;
}

const CartContext = createContext<CartValue | null>(null);
const EMPTY: CartState = { branchId: null, lines: [] };

function load(key: string): CartState {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as CartState;
  } catch { /* ignore */ }
  return EMPTY;
}

/**
 * The cart belongs to a signed-in customer: it is saved per account in this browser,
 * so guests, staff and admins have no cart and accounts never see each other's items.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const { session, isStaff } = useAuth();
  const key = session && !isStaff ? `7k.cart.${session.user.id}` : null;
  const [state, setState] = useState<CartState>(EMPTY);
  const loadedKey = useRef<string | null>(null);

  // Save — declared before the load effect so a key switch never writes the
  // previous account's cart under the new account's key.
  useEffect(() => {
    if (!key || loadedKey.current !== key) return;
    try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state, key]);

  // Load whenever the signed-in customer changes (sign in / sign out / switch account).
  useEffect(() => {
    try { localStorage.removeItem('7k.cart'); } catch { /* old shared guest cart */ }
    setState(key ? load(key) : EMPTY);
    loadedKey.current = key;
  }, [key]);

  const add = (item: Item, quantity = 1) => {
    if (!key) return false;
    if (state.branchId && state.branchId !== item.branch_id && state.lines.length > 0) return false;
    setState((s) => {
      const existing = s.lines.find((l) => l.item.id === item.id);
      const max = item.stock ?? 50;
      const lines = existing
        ? s.lines.map((l) => (l.item.id === item.id ? { ...l, quantity: Math.min(max, l.quantity + quantity) } : l))
        : [...s.lines, { item, quantity: Math.min(max, quantity) }];
      return { branchId: item.branch_id, lines };
    });
    return true;
  };

  const setQuantity = (itemId: string, quantity: number) =>
    setState((s) => ({
      ...s,
      lines: s.lines.map((l) =>
        l.item.id === itemId ? { ...l, quantity: Math.max(1, Math.min(l.item.stock ?? 50, quantity)) } : l,
      ),
    }));

  const remove = (itemId: string) =>
    setState((s) => {
      const lines = s.lines.filter((l) => l.item.id !== itemId);
      return { branchId: lines.length ? s.branchId : null, lines };
    });

  const replaceWith = (item: Item) => setState({ branchId: item.branch_id, lines: [{ item, quantity: 1 }] });

  const clear = () => setState(EMPTY);

  const count = state.lines.reduce((n, l) => n + l.quantity, 0);
  const total = state.lines.reduce((n, l) => n + l.quantity * Number(l.item.price), 0);

  return (
    <CartContext.Provider value={{ ...state, enabled: !!key, count, total, add, setQuantity, remove, replaceWith, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
