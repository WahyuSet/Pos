import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserSession } from '@repo/types';

interface CartItem {
  id: string; // menuId
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface AppState {
  // Cart
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: string) => void;
  updateCartQuantity: (id: string, quantity: number) => void;
  updateCartNotes: (id: string, notes: string) => void;
  clearCart: () => void;
  
  // Auth
  user: UserSession | null;
  token: string | null;
  setAuth: (user: UserSession, token: string) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Cart
      cart: [],
      addToCart: (item) =>
        set((state) => {
          const existingIndex = state.cart.findIndex((i) => i.id === item.id);
          if (existingIndex > -1) {
            const newCart = [...state.cart];
            newCart[existingIndex].quantity += 1;
            return { cart: newCart };
          }
          return { cart: [...state.cart, { ...item, quantity: 1 }] };
        }),
      removeFromCart: (id) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.id !== id),
        })),
      updateCartQuantity: (id, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { cart: state.cart.filter((item) => item.id !== id) };
          }
          return {
            cart: state.cart.map((item) =>
              item.id === id ? { ...item, quantity } : item
            ),
          };
        }),
      updateCartNotes: (id, notes) =>
        set((state) => ({
          cart: state.cart.map((item) =>
            item.id === id ? { ...item, notes } : item
          ),
        })),
      clearCart: () => set({ cart: [] }),

      // Auth
      user: null,
      token: null,
      setAuth: (user, token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
        }
        set({ user, token });
      },
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        set({ user: null, token: null });
      },
    }),
    {
      name: 'pos-order-storage',
      partialize: (state) => ({
        cart: state.cart,
        user: state.user,
        token: state.token,
      }),
    }
  )
);
