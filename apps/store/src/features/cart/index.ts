export { CartProvider, useCart } from "./application/CartContext";
export {
  FlyToCartProvider,
  useFlyToCartContext,
} from "./application/FlyToCartContext";
export { useAddToCart } from "./application/hooks/useAddToCart";
export type { CartItem, CartState } from "./domain/types";

// Presentation
export { CartDrawer } from "./presentation/components/CartDrawer";
