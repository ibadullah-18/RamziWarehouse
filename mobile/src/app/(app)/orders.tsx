import { Ionicons } from '@expo/vector-icons';
import {
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getOrders,
  OrdersApiError,
} from '../../api/orders-api';
import { useAuth } from '../../auth/auth-context';
import { OrderListCard } from '../../components/order-list-card';
import {
  orderStatusFilters,
} from '../../features/orders/order-status';
import {
  OrderListItem,
  OrderStatus,
} from '../../features/orders/order-types';
import {
  colors,
  fontSize,
  radius,
  spacing,
} from '../../theme';

const PAGE_SIZE = 20;

function getOrdersErrorMessage(
  error: unknown,
) {
  if (error instanceof OrdersApiError) {
    if (error.status === 401) {
      return 'Sessiyanın vaxtı bitib. Tətbiqi yenidən aç.';
    }

    return error.message;
  }

  return 'Qaimələr alınarkən xəta baş verdi.';
}

export default function OrdersScreen() {
  const { session } = useAuth();

  const [orders, setOrders] =
    useState<OrderListItem[]>([]);

  const [searchText, setSearchText] =
    useState('');

  const [appliedSearch, setAppliedSearch] =
    useState('');

  const [selectedStatus, setSelectedStatus] =
    useState<OrderStatus | null>(null);

  const [pageNumber, setPageNumber] =
    useState(1);

  const [totalPages, setTotalPages] =
    useState(0);

  const [totalCount, setTotalCount] =
    useState(0);

  const [isInitialLoading, setIsInitialLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [isLoadingMore, setIsLoadingMore] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const accessToken = session?.accessToken;

  useEffect(() => {
    let isActive = true;

    if (!accessToken) {
      return;
    }

    const currentAccessToken = accessToken;

    async function loadInitialOrders() {
      try {
        const result = await getOrders(
          currentAccessToken,
          {
            search: appliedSearch,
            status: selectedStatus,
            pageNumber: 1,
            pageSize: PAGE_SIZE,
          },
        );

        if (!isActive) {
          return;
        }

        setOrders(result.items);
        setPageNumber(result.pageNumber);
        setTotalPages(result.totalPages);
        setTotalCount(result.totalCount);
        setErrorMessage(null);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(
          getOrdersErrorMessage(error),
        );
      } finally {
        if (isActive) {
          setIsInitialLoading(false);
        }
      }
    }

    void loadInitialOrders();

    return () => {
      isActive = false;
    };
  }, [
    accessToken,
    appliedSearch,
    selectedStatus,
  ]);

  function applySearch() {
    Keyboard.dismiss();

    const normalizedSearch =
      searchText.trim();

    if (normalizedSearch === appliedSearch) {
      void refreshOrders();
      return;
    }

    setOrders([]);
    setPageNumber(1);
    setTotalPages(0);
    setTotalCount(0);
    setErrorMessage(null);
    setIsInitialLoading(true);
    setAppliedSearch(normalizedSearch);
  }

  function clearSearch() {
    setSearchText('');

    if (appliedSearch) {
      setOrders([]);
      setPageNumber(1);
      setTotalPages(0);
      setTotalCount(0);
      setErrorMessage(null);
      setIsInitialLoading(true);
      setAppliedSearch('');
    }
  }

  function selectStatus(
    status: OrderStatus | null,
  ) {
    if (status === selectedStatus) {
      return;
    }

    setOrders([]);
    setPageNumber(1);
    setTotalPages(0);
    setTotalCount(0);
    setErrorMessage(null);
    setIsInitialLoading(true);
    setSelectedStatus(status);
  }

  async function refreshOrders() {
    if (!accessToken || isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const result = await getOrders(
        accessToken,
        {
          search: appliedSearch,
          status: selectedStatus,
          pageNumber: 1,
          pageSize: PAGE_SIZE,
        },
      );

      setOrders(result.items);
      setPageNumber(result.pageNumber);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch (error) {
      setErrorMessage(
        getOrdersErrorMessage(error),
      );
    } finally {
      setIsRefreshing(false);
      setIsInitialLoading(false);
    }
  }

  async function loadMoreOrders() {
    if (
      !accessToken ||
      isInitialLoading ||
      isRefreshing ||
      isLoadingMore ||
      pageNumber >= totalPages
    ) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const nextPage = pageNumber + 1;

      const result = await getOrders(
        accessToken,
        {
          search: appliedSearch,
          status: selectedStatus,
          pageNumber: nextPage,
          pageSize: PAGE_SIZE,
        },
      );

      setOrders(currentOrders => {
        const existingIds =
          new Set(
            currentOrders.map(
              order => order.id,
            ),
          );

        const newOrders =
          result.items.filter(
            order => !existingIds.has(order.id),
          );

        return [
          ...currentOrders,
          ...newOrders,
        ];
      });

      setPageNumber(result.pageNumber);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch (error) {
      setErrorMessage(
        getOrdersErrorMessage(error),
      );
    } finally {
      setIsLoadingMore(false);
    }
  }

  const listHeader = (
    <View>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>
            RAM COLLECTION
          </Text>

          <Text style={styles.title}>
            Qaimələr
          </Text>

          <Text style={styles.subtitle}>
            {totalCount > 0
              ? `${totalCount} qaimə tapıldı`
              : 'Sifarişləri idarə et'}
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Ionicons
            name="receipt-outline"
            size={24}
            color={colors.primary}
          />
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={20}
          color={colors.textLight}
        />

        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={applySearch}
          placeholder="Qaimə, müştəri və ya məhsul kodu"
          placeholderTextColor={colors.textLight}
          returnKeyType="search"
          autoCorrect={false}
          style={styles.searchInput}
        />

        {searchText ? (
          <Pressable
            onPress={clearSearch}
            hitSlop={10}
          >
            <Ionicons
              name="close-circle"
              size={21}
              color={colors.textLight}
            />
          </Pressable>
        ) : null}

        <Pressable
          onPress={applySearch}
          style={({ pressed }) => [
            styles.searchButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Ionicons
            name="arrow-forward"
            size={19}
            color={colors.white}
          />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={
          styles.filterContent
        }
        style={styles.filterScroll}
      >
        {orderStatusFilters.map(filter => {
          const isSelected =
            selectedStatus === filter.value;

          return (
            <Pressable
              key={
                filter.value?.toString() ??
                'all'
              }
              onPress={() => {
                selectStatus(filter.value);
              }}
              style={({ pressed }) => [
                styles.filterChip,
                isSelected &&
                  styles.filterChipSelected,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  isSelected &&
                    styles.filterTextSelected,
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {errorMessage ? (
        <Pressable
          onPress={() => {
            void refreshOrders();
          }}
          style={({ pressed }) => [
            styles.errorCard,
            pressed && styles.buttonPressed,
          ]}
        >
          <Ionicons
            name="warning-outline"
            size={20}
            color={colors.danger}
          />

          <View style={styles.errorTextContainer}>
            <Text style={styles.errorTitle}>
              Qaimələr yüklənmədi
            </Text>

            <Text style={styles.errorDescription}>
              {errorMessage}
            </Text>
          </View>

          <Ionicons
            name="refresh"
            size={20}
            color={colors.danger}
          />
        </Pressable>
      ) : null}

      {isInitialLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="small"
            color={colors.primary}
          />

          <Text style={styles.loadingText}>
            Qaimələr alınır...
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView
      edges={['top']}
      style={styles.safeArea}
    >
      <FlatList
        data={
          isInitialLoading
            ? []
            : orders
        }
        keyExtractor={order => order.id}
        renderItem={({ item }) => (
          <OrderListCard order={item} />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          !isInitialLoading &&
          !errorMessage ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="receipt-outline"
                  size={30}
                  color={colors.primary}
                />
              </View>

              <Text style={styles.emptyTitle}>
                Qaimə tapılmadı
              </Text>

              <Text style={styles.emptyDescription}>
                Axtarışı və ya seçilmiş statusu dəyiş.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator
                size="small"
                color={colors.primary}
              />
            </View>
          ) : (
            <View style={styles.footerSpace} />
          )
        }
        contentContainerStyle={
          styles.listContent
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void refreshOrders();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={
              colors.surface
            }
          />
        }
        onEndReached={() => {
          void loadMoreOrders();
        }}
        onEndReachedThreshold={0.35}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },

  brand: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.4,
  },

  title: {
    color: colors.text,
    fontSize: fontSize.title,
    fontWeight: '700',
    marginTop: spacing.xs,
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },

  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },

  searchContainer: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
  },

  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    paddingVertical: spacing.md,
  },

  searchButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  buttonPressed: {
    opacity: 0.7,
  },

  filterScroll: {
    marginHorizontal: -spacing.lg,
  },

  filterContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },

  filterChip: {
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },

  filterChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },

  filterText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  filterTextSelected: {
    color: colors.white,
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F4C5C9',
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  errorTextContainer: {
    flex: 1,
  },

  errorTitle: {
    color: colors.danger,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  errorDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 17,
    marginTop: 2,
  },

  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.huge,
  },

  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: 70,
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.lg,
  },

  emptyDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.sm,
  },

  footerLoading: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },

  footerSpace: {
    height: spacing.huge,
  },
});