'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  productId: string;
  productName: string;
  productSlug: string;
  productType?: string;
  logoUrl?: string;
  price: number;
  licensePlanId?: string;
  licensePlanName?: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: string, licensePlanId?: string) => void;
  updateQuantity: (productId: string, quantity: number, licensePlanId?: string) => void;
  updatePlan: (productId: string, plan: { id: string; name: string; price: number }) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'licensenest_cart_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load cart from storage', err);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch (err) {
        console.error('Failed to save cart to storage', err);
      }
    }
  }, [items, isInitialized]);

  const addItem = (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.productId === item.productId && i.licensePlanId === item.licensePlanId,
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += item.quantity || 1;
        return updated;
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
  };

  const removeItem = (productId: string, licensePlanId?: string) => {
    setItems((prev) =>
      prev.filter(
        (i) => !(i.productId === productId && (licensePlanId ? i.licensePlanId === licensePlanId : true)),
      ),
    );
  };

  const updateQuantity = (productId: string, quantity: number, licensePlanId?: string) => {
    if (quantity <= 0) {
      removeItem(productId, licensePlanId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId === productId && (licensePlanId ? i.licensePlanId === licensePlanId : true)) {
          return { ...i, quantity };
        }
        return i;
      }),
    );
  };

  const updatePlan = (productId: string, plan: { id: string; name: string; price: number }) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId === productId) {
          return {
            ...i,
            licensePlanId: plan.id,
            licensePlanName: plan.name,
            price: plan.price,
          };
        }
        return i;
      }),
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        updatePlan,
        clearCart,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
