// The cart drawer. The cart's *state* is not here: CartProvider, useCart and
// useAddToCart live in shared/application/cart, because the providers are
// mounted app-wide in app/[locale]/providers.tsx and features/products needs
// useAddToCart on every product card. A context two features share, mounted at
// the app root, is application state rather than one feature's business.
export { CartDrawer } from "./presentation/components/CartDrawer";
