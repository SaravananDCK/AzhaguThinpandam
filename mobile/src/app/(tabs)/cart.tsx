import { Image } from 'expo-image';
import { router } from 'expo-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Centered, QtyStepper } from '@/components/ui';
import { api, useApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { useCart } from '@/lib/cart-store';
import { formatINR } from '@/lib/money';
import { colors, radius, space } from '@/lib/theme';
import type { Address, CartPrice } from '@/lib/types';

// Delivery is charged by state. Until the customer picks an address at
// checkout, the estimate uses their default address, or the store's home state.
const HOME_STATE = 'Tamil Nadu';

export default function CartScreen() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const removeItem = useCart((s) => s.removeItem);
  const signedIn = useAuth((s) => Boolean(s.token));

  const addresses = useApi<{ addresses: Address[] }>(signedIn ? '/api/v1/addresses' : null);
  const state = addresses.data?.addresses[0]?.state ?? HOME_STATE;

  // The server works out the totals. Wait for taps on +/− to settle before
  // asking, and keep showing the last answer while the new one loads.
  const lines = items.map((i) => `${i.variantId}:${i.qty}`).join(',');
  const [settled, setSettled] = useState(lines);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(lines), 300);
    return () => clearTimeout(timer);
  }, [lines]);

  const quote = useQuery({
    queryKey: ['cart-price', settled, state],
    enabled: settled.length > 0,
    retry: false,
    placeholderData: keepPreviousData,
    queryFn: () =>
      api<CartPrice>('/api/v1/cart/price', {
        body: {
          items: settled.split(',').map((l) => {
            const [variantId, qty] = l.split(':');
            return { variantId, qty: Number(qty) };
          }),
          state,
        },
      }),
  });
  const error = quote.error ? quote.error.message : null;
  const price = error ? null : (quote.data ?? null);
  const pricing = quote.isFetching || settled !== lines;

  if (items.length === 0) {
    return (
      <Centered
        icon="bag-outline"
        message="Your cart is empty"
        detail="Fill it with kadalai mittai, murukku and more."
        actionLabel="Browse products"
        onAction={() => router.navigate('/shop')}
      />
    );
  }

  const freebies = price?.items.filter((i) => i.isFreebie) ?? [];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {items.some((i) => i.preorder) && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              <Text style={{ fontWeight: '700', color: colors.primary }}>Pre-order. </Text>
              This is booked now and dispatched closer to the festival, as its own order.
            </Text>
          </View>
        )}

        {items.map((item) => (
          <View key={item.variantId} style={styles.line}>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/product/[slug]', params: { slug: item.productSlug } })
              }>
              <Image source={item.image ?? undefined} style={styles.thumb} contentFit="cover" />
            </Pressable>
            <View style={{ flex: 1, gap: 4 }}>
              <Text numberOfLines={2} style={styles.name}>
                {item.productName}
              </Text>
              <Text style={styles.muted}>
                {item.variantLabel} · {formatINR(item.price)}
              </Text>
              <View style={styles.lineFooter}>
                <QtyStepper
                  qty={item.qty}
                  max={item.maxQty}
                  onChange={(n) => setQty(item.variantId, n)}
                />
                <Text style={styles.lineTotal}>{formatINR(item.price * item.qty)}</Text>
              </View>
              <Pressable hitSlop={8} onPress={() => removeItem(item.variantId)}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {freebies.map((f) => (
          <View key={`free-${f.variantId}`} style={[styles.line, styles.freebie]}>
            <Image source={f.image ?? undefined} style={styles.thumb} contentFit="cover" />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.name}>🎁 {f.productName}</Text>
              <Text style={styles.muted}>
                {f.variantLabel} × {f.qty}
              </Text>
              <Text style={styles.free}>FREE with this order</Text>
            </View>
          </View>
        ))}

        {error && (
          <View style={[styles.notice, { borderColor: colors.danger }]}>
            <Text style={[styles.noticeText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        {price && (
          <View style={styles.summary}>
            <Row label="Subtotal" value={formatINR(price.subtotal)} />
            {price.discount > 0 && (
              <Row label="Discount" value={`−${formatINR(price.discount)}`} highlight />
            )}
            <Row
              label={`Delivery to ${state}`}
              value={price.shippingFee === 0 ? 'FREE' : formatINR(price.shippingFee)}
            />
            <View style={styles.divider} />
            <Row label="Total" value={formatINR(price.total)} bold />
            <Text style={styles.muted}>
              Delivery is confirmed when you choose your address at checkout.
            </Text>
          </View>
        )}
        {pricing && !price && <ActivityIndicator color={colors.primary} />}
      </ScrollView>

      <View style={styles.bar}>
        <Button
          label={price ? `Checkout · ${formatINR(price.total)}` : 'Checkout'}
          disabled={!price || pricing}
          loading={pricing && Boolean(price)}
          onPress={() => router.push(signedIn ? '/checkout' : '/login')}
        />
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.rowBold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.rowBold, highlight && { color: colors.green }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.md },
  notice: {
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    backgroundColor: colors.primarySoft,
  },
  noticeText: { fontSize: 13, lineHeight: 19, color: colors.text },
  line: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  freebie: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  thumb: { width: 76, height: 76, borderRadius: radius.md, backgroundColor: colors.surface },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  lineFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lineTotal: { fontSize: 16, fontWeight: '700', color: colors.text },
  remove: { fontSize: 13, fontWeight: '600', color: colors.danger },
  free: { fontSize: 13, fontWeight: '700', color: colors.green },
  summary: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  rowLabel: { fontSize: 14, color: colors.muted, flexShrink: 1 },
  rowValue: { fontSize: 14, color: colors.text },
  rowBold: { fontSize: 17, fontWeight: '700', color: colors.text },
  divider: { height: 1, backgroundColor: colors.border },
  bar: {
    padding: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
