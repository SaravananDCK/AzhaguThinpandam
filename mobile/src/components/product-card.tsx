import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatINR } from '@/lib/money';
import { colors, radius, space } from '@/lib/theme';
import type { Product } from '@/lib/types';

import { Stars } from './ui';

/** Grid card: photo, name, price from. Opens the product screen. */
export function ProductCard({ product }: { product: Product }) {
  const prices = product.variants.map((v) => v.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const cheapest = product.variants.find((v) => v.price === minPrice);
  const off =
    cheapest?.mrp && cheapest.mrp > cheapest.price
      ? Math.round(((cheapest.mrp - cheapest.price) / cheapest.mrp) * 100)
      : 0;
  const badge = !product.inStock
    ? 'Out of stock'
    : product.preorder
      ? 'Pre-order'
      : product.isFlagship
        ? 'Signature'
        : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={product.name}
      onPress={() => router.push({ pathname: '/product/[slug]', params: { slug: product.slug } })}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <View>
        <Image
          source={product.images[0] ?? undefined}
          style={[styles.image, !product.inStock && { opacity: 0.5 }]}
          contentFit="cover"
          transition={150}
        />
        {badge && (
          <View style={[styles.badge, !product.inStock && { backgroundColor: colors.muted }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        {off > 0 && (
          <View style={styles.off}>
            <Text style={styles.badgeText}>-{off}%</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.name}>
          {product.name}
        </Text>
        {product.tamilName && (
          <Text numberOfLines={1} style={styles.tamil}>
            {product.tamilName}
          </Text>
        )}
        {product.ratingCount > 0 && (
          <View style={styles.rating}>
            <Stars value={product.ratingAvg ?? 0} size={12} />
            <Text style={styles.ratingText}>({product.ratingCount})</Text>
          </View>
        )}
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatINR(minPrice)}</Text>
          {cheapest && <Text style={styles.size}>{cheapest.label}</Text>}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  image: { width: '100%', aspectRatio: 1, backgroundColor: colors.surface },
  badge: {
    position: 'absolute',
    top: space.sm,
    left: space.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  off: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  body: { padding: space.md, gap: 3 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  tamil: { fontSize: 12, color: colors.muted },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 11, color: colors.muted },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginTop: 2 },
  price: { fontSize: 17, fontWeight: '700', color: colors.primary },
  size: { fontSize: 12, color: colors.muted },
});
