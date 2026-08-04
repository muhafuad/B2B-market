"use client";

import { useState, useEffect, useCallback } from "react";

export interface CartItem {
  product_id: string;
  name: string;
  slug: string;
  image_url: string | null;
  price: number;
  quantity: number;
  unit: string;
  stock: number;
}

const CART_STORAGE_KEY = "hidaya_cart";
const WISHLIST_STORAGE_KEY = "hidaya_wishlist";

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart-updated"));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setItems(readCart());
    setLoaded(true);

    const handler = () => setItems(readCart());
    window.addEventListener("cart-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("cart-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity = 1) => {
      const current = readCart();
      const existing = current.find((i) => i.product_id === item.product_id);
      if (existing) {
        const updated = current.map((i) =>
          i.product_id === item.product_id
            ? {
                ...i,
                quantity: Math.min(i.quantity + quantity, i.stock || 999),
              }
            : i,
        );
        writeCart(updated);
      } else {
        writeCart([
          ...current,
          { ...item, quantity: Math.min(quantity, item.stock || 999) },
        ]);
      }
    },
    [],
  );

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    const current = readCart();
    if (quantity <= 0) {
      writeCart(current.filter((i) => i.product_id !== productId));
      return;
    }
    const updated = current.map((i) =>
      i.product_id === productId
        ? { ...i, quantity: Math.min(quantity, i.stock || 999) }
        : i,
    );
    writeCart(updated);
  }, []);

  const removeItem = useCallback((productId: string) => {
    const current = readCart();
    writeCart(current.filter((i) => i.product_id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    writeCart([]);
  }, []);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return {
    items,
    loaded,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    totalItems,
  };
}

// ---------------------------------------------------------------------------
// Wishlist
// ---------------------------------------------------------------------------

export interface WishlistItem {
  product_id: string;
  name: string;
  slug: string;
  image_url: string | null;
  price: number;
  category_name: string | null;
  stock: number;
}

function readWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeWishlist(items: WishlistItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("wishlist-updated"));
}

export function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setItems(readWishlist());
    setLoaded(true);

    const handler = () => setItems(readWishlist());
    window.addEventListener("wishlist-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("wishlist-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const toggleWishlist = useCallback((item: WishlistItem) => {
    const current = readWishlist();
    const exists = current.find((i) => i.product_id === item.product_id);
    if (exists) {
      writeWishlist(current.filter((i) => i.product_id !== item.product_id));
    } else {
      writeWishlist([...current, item]);
    }
  }, []);

  const removeItem = useCallback((productId: string) => {
    const current = readWishlist();
    writeWishlist(current.filter((i) => i.product_id !== productId));
  }, []);

  const isWishlisted = useCallback(
    (productId: string) => items.some((i) => i.product_id === productId),
    [items],
  );

  return {
    items,
    loaded,
    toggleWishlist,
    removeItem,
    isWishlisted,
  };
}
