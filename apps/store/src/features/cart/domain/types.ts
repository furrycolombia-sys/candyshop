export interface CartItem {
  productId: string;
  name: string;
  price: number;
  currency: string;
  quantity: number;
  image?: string;
  type: string;
}

export interface CartState {
  items: CartItem[];
  itemCount: number;
  total: number;
}
