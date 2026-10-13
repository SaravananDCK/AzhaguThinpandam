import { router } from 'expo-router';

import { Centered } from '@/components/ui';

// Placeholder until the checkout screens are built (address, order, payment).
export default function CheckoutScreen() {
  return (
    <Centered
      icon="construct-outline"
      message="Checkout is coming next"
      detail="Choosing an address, placing the order and paying are the next screens to be built."
      actionLabel="Back to cart"
      onAction={() => router.back()}
    />
  );
}
