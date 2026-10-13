// Shapes returned by the website's /api/v1 (see src/lib/api-serialize.ts in
// the web project). Money is integer paise.

export type Variant = {
  id: string;
  label: string;
  price: number;
  mrp: number | null;
  weightGrams: number | null;
  available: boolean;
  maxQty: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  tamilName: string | null;
  description: string;
  category: { slug: string; name: string };
  line: string;
  labels: string[];
  isFlagship: boolean;
  madeToOrder: boolean;
  preorder: boolean;
  ratingAvg: number | null;
  ratingCount: number;
  images: (string | null)[];
  packetGrams: number | null;
  inStock: boolean;
  variants: Variant[];
};

export type ProductList = { products: Product[]; page: number; pageCount: number; total: number };

export type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  authorName: string;
  verifiedPurchase: boolean;
  createdAt: string;
};

export type PreorderInfo = { closed: boolean; deadline: string; dispatchNote: string };

export type ProductDetail = {
  product: Product;
  preorder: PreorderInfo | null;
  reviews: Review[];
  related: Product[];
};

export type Category = { slug: string; name: string; tamilName: string | null; image: string | null };

export type User = { id: string; name: string | null; phone: string | null; email: string | null };

export type CartPrice = {
  items: {
    variantId: string | null;
    productName: string;
    variantLabel: string;
    image: string | null;
    price: number;
    qty: number;
    isFreebie: boolean;
  }[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  shippingFee: number;
  total: number;
  weightKg: number;
  preorder: boolean;
};

export type Order = {
  orderNumber: string;
  status: string;
  statusLabel: string;
  preorder: boolean;
  placedAt: string;
  subtotal: number;
  discount: number;
  couponCode: string | null;
  shippingFee: number;
  total: number;
  items: {
    productName: string;
    variantLabel: string;
    image: string | null;
    price: number;
    qty: number;
    isFreebie: boolean;
  }[];
  paymentStatus: 'PAID' | 'FAILED' | 'PENDING';
};

export type Address = {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};
