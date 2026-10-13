import { Image } from 'expo-image';
import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProductCard } from '@/components/product-card';
import { Centered } from '@/components/ui';
import { useApi } from '@/lib/api';
import { colors, radius, space } from '@/lib/theme';
import type { Category, ProductList } from '@/lib/types';

export default function HomeScreen() {
  const categories = useApi<{ categories: Category[] }>('/api/v1/categories');
  const featured = useApi<ProductList>('/api/v1/products?featured=1');

  const loading = categories.loading || featured.loading;
  const error = categories.error ?? featured.error;
  const reload = () => {
    categories.reload();
    featured.reload();
  };

  if (!featured.data && loading) return <Centered loading />;
  if (!featured.data && error) {
    return (
      <Centered
        icon="cloud-offline-outline"
        message="Couldn't load the store"
        detail={error}
        actionLabel="Try again"
        onAction={reload}
      />
    );
  }

  return (
    <FlatList
      data={featured.data?.products ?? []}
      keyExtractor={(p) => p.id}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />
      }
      ListHeaderComponent={
        <View style={{ gap: space.lg }}>
          <View style={styles.hero}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logo}
              contentFit="contain"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Traditional Tamil snacks</Text>
              <Text style={styles.heroText}>
                Kovilpatti kadalai mittai, murukku, sev and more — made fresh and delivered to your
                door.
              </Text>
            </View>
          </View>

          {(categories.data?.categories.length ?? 0) > 0 && (
            <View style={{ gap: space.sm }}>
              <Text style={styles.heading}>Shop by category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: space.md }}>
                {categories.data?.categories.map((c) => (
                  <Pressable
                    key={c.slug}
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: '/shop', params: { category: c.slug } })}
                    style={styles.category}>
                    <Image
                      source={c.image ?? undefined}
                      style={styles.categoryImage}
                      contentFit="cover"
                    />
                    <Text numberOfLines={2} style={styles.categoryName}>
                      {c.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <Text style={styles.heading}>Customer favourites</Text>
        </View>
      }
      renderItem={({ item }) => <ProductCard product={item} />}
      ListEmptyComponent={<Text style={styles.empty}>New favourites are on their way.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, backgroundColor: colors.background },
  row: { gap: space.md },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.goldSoft,
  },
  logo: { width: 72, height: 72 },
  heroTitle: { fontSize: 18, fontWeight: '700', color: colors.primary },
  heroText: { fontSize: 13, lineHeight: 19, color: colors.text, marginTop: 2 },
  heading: { fontSize: 18, fontWeight: '700', color: colors.text },
  category: { width: 92, alignItems: 'center', gap: 6 },
  categoryImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryName: { fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'center' },
  empty: { color: colors.muted, textAlign: 'center', padding: space.xl },
});
