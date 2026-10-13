import Ionicons from '@expo/vector-icons/Ionicons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ProductCard } from '@/components/product-card';
import { Centered } from '@/components/ui';
import { api, useApi } from '@/lib/api';
import { colors, radius, space } from '@/lib/theme';
import type { Category, ProductList } from '@/lib/types';

export default function ShopScreen() {
  // Home's category tiles land here with ?category=slug
  const params = useLocalSearchParams<{ category?: string }>();
  const category = params.category || null;
  const setCategory = (slug: string | null) => router.setParams({ category: slug ?? '' });

  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  // Search as you type, but only once typing pauses
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const categories = useApi<{ categories: Category[] }>('/api/v1/categories');

  const list = useInfiniteQuery({
    queryKey: ['products', category, search],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const q = new URLSearchParams({ page: String(pageParam) });
      if (category) q.set('category', category);
      if (search) q.set('q', search);
      return api<ProductList>(`/api/v1/products?${q.toString()}`);
    },
    getNextPageParam: (last) => (last.page < last.pageCount ? last.page + 1 : undefined),
  });
  const products = list.data?.pages.flatMap((p) => p.products) ?? [];
  const loading = list.isFetching;
  const error = list.error ? list.error.message : null;

  const chips = [{ slug: null as string | null, name: 'All' }, ...(categories.data?.categories ?? [])];

  return (
    <View style={styles.screen}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search snacks and sweets"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          autoCorrect={false}
          style={styles.searchInput}
        />
        {query.length > 0 && (
          <Pressable accessibilityLabel="Clear search" hitSlop={10} onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}>
          {chips.map((c) => {
            const active = c.slug === category;
            return (
              <Pressable
                key={c.slug ?? 'all'}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setCategory(c.slug)}
                style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && { color: colors.white }]}>{c.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {error && products.length === 0 ? (
        <Centered
          icon="cloud-offline-outline"
          message="Couldn't load products"
          detail={error}
          actionLabel="Try again"
          onAction={() => list.refetch()}
        />
      ) : loading && products.length === 0 ? (
        <Centered loading />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: space.md }}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (list.hasNextPage && !list.isFetchingNextPage) list.fetchNextPage();
          }}
          renderItem={({ item }) => <ProductCard product={item} />}
          ListEmptyComponent={
            <Centered
              icon="search-outline"
              message="Nothing found"
              detail={search ? `No products match “${search}”.` : 'This category is empty right now.'}
            />
          }
          ListFooterComponent={
            loading ? <ActivityIndicator color={colors.primary} style={{ padding: space.lg }} /> : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.lg,
    marginTop: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: colors.text },
  chips: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.md, flexGrow: 1 },
});
