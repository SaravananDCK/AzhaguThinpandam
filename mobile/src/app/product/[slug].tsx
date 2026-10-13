import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/product-card';
import { Button, Centered, Pill, QtyStepper, Stars } from '@/components/ui';
import { useApi } from '@/lib/api';
import { PREORDER_MIX_MESSAGE, useCart } from '@/lib/cart-store';
import { formatINR } from '@/lib/money';
import { colors, radius, space } from '@/lib/theme';
import type { ProductDetail, Variant } from '@/lib/types';

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, error, loading, reload } = useApi<ProductDetail>(`/api/v1/products/${slug}`);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const addItem = useCart((s) => s.addItem);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [photo, setPhoto] = useState(0);

  if (loading && !data) return <Centered loading />;
  if (!data) {
    return (
      <Centered
        icon="alert-circle-outline"
        message="Couldn't load this product"
        detail={error ?? undefined}
        actionLabel="Try again"
        onAction={reload}
      />
    );
  }

  const { product, preorder, reviews, related } = data;
  // The chosen size, or until one is chosen the first that can be bought
  const selected: Variant | null =
    product.variants.find((v) => v.id === selectedId) ??
    product.variants.find((v) => v.available) ??
    product.variants[0] ??
    null;
  const images = product.images.filter((i): i is string => Boolean(i));
  const closed = preorder?.closed === true;
  const canBuy = Boolean(selected?.available) && !closed;
  const off =
    selected?.mrp && selected.mrp > selected.price
      ? Math.round(((selected.mrp - selected.price) / selected.mrp) * 100)
      : 0;

  function addToCart() {
    if (!selected) return;
    const added = addItem(
      {
        variantId: selected.id,
        productSlug: product.slug,
        productName: product.name,
        variantLabel: selected.label,
        price: selected.price,
        image: images[0] ?? null,
        maxQty: selected.maxQty,
        preorder: product.preorder,
      },
      qty,
    );
    if (!added) {
      Alert.alert('Separate order needed', PREORDER_MIX_MESSAGE);
      return;
    }
    Alert.alert('Added to cart', `${product.name} (${selected.label}) × ${qty}`, [
      { text: 'Keep shopping', style: 'cancel' },
      { text: 'View cart', onPress: () => router.navigate('/cart') },
    ]);
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: product.name }} />
      <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
        {images.length > 0 ? (
          <View>
            <FlatList
              data={images}
              keyExtractor={(uri) => uri}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) =>
                setPhoto(Math.round(e.nativeEvent.contentOffset.x / width))
              }
              renderItem={({ item }) => (
                <Image source={item} style={{ width, height: width }} contentFit="cover" />
              )}
            />
            {images.length > 1 && (
              <View style={styles.dots}>
                {images.map((uri, i) => (
                  <View key={uri} style={[styles.dot, i === photo && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={{ width, height: width * 0.6, backgroundColor: colors.surface }} />
        )}

        <View style={styles.body}>
          <View style={{ gap: 2 }}>
            <Text style={styles.name}>{product.name}</Text>
            {product.tamilName && <Text style={styles.tamil}>{product.tamilName}</Text>}
            {product.ratingCount > 0 && (
              <View style={styles.rating}>
                <Stars value={product.ratingAvg ?? 0} />
                <Text style={styles.muted}>
                  {product.ratingAvg?.toFixed(1)} ({product.ratingCount})
                </Text>
              </View>
            )}
          </View>

          {product.labels.length > 0 && (
            <View style={styles.wrap}>
              {product.labels.map((l) => (
                <Pill key={l}>{l}</Pill>
              ))}
            </View>
          )}

          <View style={{ gap: space.sm }}>
            <Text style={styles.sectionLabel}>Size</Text>
            <View style={styles.wrap}>
              {product.variants.map((v) => {
                const active = v.id === selected?.id;
                return (
                  <Pressable
                    key={v.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active, disabled: !v.available }}
                    disabled={!v.available}
                    onPress={() => {
                      setSelectedId(v.id);
                      setQty(1);
                    }}
                    style={[styles.size, active && styles.sizeActive, !v.available && { opacity: 0.4 }]}>
                    <Text style={[styles.sizeText, active && { color: colors.white }]}>{v.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {selected && (
            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatINR(selected.price)}</Text>
              {off > 0 && selected.mrp && (
                <>
                  <Text style={styles.mrp}>{formatINR(selected.mrp)}</Text>
                  <Pill>{off}% off</Pill>
                </>
              )}
            </View>
          )}

          {preorder && (
            <View style={styles.preorder}>
              <View style={styles.preorderTitle}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={styles.preorderHeading}>
                  {closed
                    ? 'Pre-order booking has closed'
                    : 'Pre-order — book now, delivered for the festival'}
                </Text>
              </View>
              {!closed && (
                <>
                  {preorder.dispatchNote ? <Text style={styles.muted}>{preorder.dispatchNote}</Text> : null}
                  {preorder.deadline ? <Text style={styles.muted}>{preorder.deadline}.</Text> : null}
                  <Text style={styles.muted}>
                    Booked as its own order — it ships separately from other items.
                  </Text>
                </>
              )}
            </View>
          )}

          {!product.inStock && <Text style={styles.outOfStock}>Currently out of stock</Text>}

          <View style={{ gap: space.sm }}>
            <Text style={styles.sectionLabel}>About this product</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          {reviews.length > 0 && (
            <View style={{ gap: space.md }}>
              <Text style={styles.sectionLabel}>Customer reviews</Text>
              {reviews.slice(0, 5).map((r) => (
                <View key={r.id} style={styles.review}>
                  <View style={styles.rating}>
                    <Stars value={r.rating} />
                    {r.verifiedPurchase && <Text style={styles.verified}>Verified purchase</Text>}
                  </View>
                  {r.title && <Text style={styles.reviewTitle}>{r.title}</Text>}
                  {r.body && <Text style={styles.description}>{r.body}</Text>}
                  <Text style={styles.muted}>{r.authorName}</Text>
                </View>
              ))}
            </View>
          )}

          {related.length > 0 && (
            <View style={{ gap: space.md }}>
              <Text style={styles.sectionLabel}>You may also like</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: space.md }}>
                {related.map((p) => (
                  <View key={p.id} style={{ width: 160 }}>
                    <ProductCard product={p} />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <QtyStepper qty={qty} max={selected?.maxQty ?? 1} onChange={(n) => setQty(Math.max(1, n))} />
        <Button
          label={closed ? 'Booking closed' : product.preorder ? 'Pre-order' : 'Add to cart'}
          icon="bag-add-outline"
          disabled={!canBuy}
          onPress={addToCart}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  dots: {
    position: 'absolute',
    bottom: space.md,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.6)' },
  dotActive: { backgroundColor: colors.primary },
  body: { padding: space.lg, gap: space.xl },
  name: { fontSize: 24, fontWeight: '700', color: colors.text },
  tamil: { fontSize: 16, color: colors.muted },
  rating: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 4 },
  muted: { fontSize: 13, lineHeight: 19, color: colors.muted },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  size: {
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sizeActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sizeText: { fontSize: 14, fontWeight: '600', color: colors.text },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  price: { fontSize: 28, fontWeight: '700', color: colors.primary },
  mrp: { fontSize: 16, color: colors.muted, textDecorationLine: 'line-through' },
  preorder: {
    gap: 4,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    backgroundColor: colors.primarySoft,
  },
  preorderTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  preorderHeading: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.primary },
  outOfStock: { fontSize: 14, fontWeight: '600', color: colors.danger },
  description: { fontSize: 14, lineHeight: 22, color: colors.text },
  review: { gap: 4, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.border },
  reviewTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  verified: { fontSize: 12, fontWeight: '600', color: colors.green },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
