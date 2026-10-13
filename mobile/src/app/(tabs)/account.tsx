import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Button, Centered, Pill } from '@/components/ui';
import { api, API_URL, useApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { formatINR } from '@/lib/money';
import { colors, radius, space } from '@/lib/theme';
import type { Order } from '@/lib/types';

export default function AccountScreen() {
  const user = useAuth((s) => s.user);
  const signedIn = useAuth((s) => Boolean(s.token));
  const signOut = useAuth((s) => s.signOut);
  const { data, error, loading, reload } = useApi<{ orders: Order[] }>(
    signedIn ? '/api/v1/orders' : null,
  );

  // Coming back from checkout or the order page: show the latest
  useFocusEffect(
    useCallback(() => {
      if (signedIn) reload();
    }, [signedIn, reload]),
  );

  if (!signedIn) {
    return (
      <Centered
        icon="person-circle-outline"
        message="Sign in to your account"
        detail="Track your orders and check out faster. We'll send a one-time code to your WhatsApp."
        actionLabel="Sign in"
        onAction={() => router.push('/login')}
      />
    );
  }

  function confirmSignOut() {
    Alert.alert('Sign out?', 'Your cart stays on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          // Tell the server to forget this device; sign out locally either way
          await api('/api/v1/auth/logout', { method: 'POST' }).catch(() => null);
          await signOut();
        },
      },
    ]);
  }

  return (
    <FlatList
      data={data?.orders ?? []}
      keyExtractor={(o) => o.orderNumber}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />
      }
      ListHeaderComponent={
        <View style={{ gap: space.lg }}>
          <View style={styles.profile}>
            <Ionicons name="person-circle" size={52} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{user?.name ?? 'Welcome'}</Text>
              <Text style={styles.muted}>{user?.phone ? `+91 ${user.phone}` : user?.email}</Text>
            </View>
            <Button label="Sign out" variant="ghost" onPress={confirmSignOut} />
          </View>
          <Text style={styles.heading}>My orders</Text>
          {error && <Text style={{ color: colors.danger }}>{error}</Text>}
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          // The order screen in the app is coming; until then this opens the
          // order's page on the website, which tracks and takes payment.
          onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/order/${item.orderNumber}`)}
          style={({ pressed }) => [styles.order, pressed && { opacity: 0.8 }]}>
          <View style={styles.orderTop}>
            <Text style={styles.orderNumber}>{item.orderNumber}</Text>
            <Pill tone={item.status === 'DELIVERED' ? 'gold' : 'primary'}>{item.statusLabel}</Pill>
          </View>
          <Text numberOfLines={2} style={styles.muted}>
            {item.items.map((i) => `${i.productName} × ${i.qty}`).join(', ')}
          </Text>
          <View style={styles.orderTop}>
            <Text style={styles.muted}>
              {new Date(item.placedAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
              {item.preorder ? ' · Pre-order' : ''}
            </Text>
            <Text style={styles.total}>{formatINR(item.total)}</Text>
          </View>
        </Pressable>
      )}
      ListEmptyComponent={
        loading ? null : (
          <Text style={[styles.muted, { textAlign: 'center', padding: space.xl }]}>
            No orders yet. Your first one will show up here.
          </Text>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, flexGrow: 1, backgroundColor: colors.background },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, lineHeight: 19, color: colors.muted },
  heading: { fontSize: 18, fontWeight: '700', color: colors.text },
  order: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderNumber: { fontSize: 15, fontWeight: '700', color: colors.text },
  total: { fontSize: 16, fontWeight: '700', color: colors.text },
});
