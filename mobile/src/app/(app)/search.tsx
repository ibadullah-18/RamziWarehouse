import { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { router } from 'expo-router';
import type {
  ComponentProps,
} from 'react';
import {
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
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
import {
  getProductReturns,
} from '../../api/product-return-api';
import { useAuth } from '../../auth/auth-context';
import { OrderListCard } from '../../components/order-list-card';
import {
  OrderListItem,
} from '../../features/orders/order-types';
import {
  getReturnStatusLabel,
  getReturnTypeSummary,
} from '../../features/product-returns/product-return-status';
import {
  ProductReturn,
  ProductType,
  ReturnStatus,
} from '../../features/product-returns/product-return-types';
import {
  colors,
  fontSize,
  radius,
  spacing,
} from '../../theme';

const SEARCH_DELAY_MILLISECONDS = 350;
const SEARCH_PAGE_SIZE = 100;
const MINIMUM_SEARCH_LENGTH = 2;

type SearchFilter =
  | 'all'
  | 'orders'
  | 'returns'
  | 'showcase';

type SearchResult =
  | {
      key: string;
      type: 'order';
      sortDate: string;
      order: OrderListItem;
    }
  | {
      key: string;
      type: 'product-return';
      sortDate: string;
      productReturn: ProductReturn;
    };

const filters: {
  value: SearchFilter;
  label: string;
  icon: ComponentProps<
    typeof Ionicons
  >['name'];
}[] = [
  {
    value: 'all',
    label: 'Hamısı',
    icon: 'apps-outline',
  },
  {
    value: 'orders',
    label: 'Qaimə',
    icon: 'receipt-outline',
  },
  {
    value: 'returns',
    label: 'Vazvrad',
    icon: 'arrow-undo-outline',
  },
  {
    value: 'showcase',
    label: 'Vitrin',
    icon: 'storefront-outline',
  },
];

function getErrorMessage(error: unknown) {
  if (error instanceof OrdersApiError) {
    if (error.status === 401) {
      return 'Sessiyanın vaxtı bitib. Tətbiqə yenidən daxil olun.';
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Axtarış zamanı gözlənilməz xəta baş verdi.';
}

function getTimestamp(value: string) {
  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

function createSearchResults(
  orders: OrderListItem[],
  productReturns: ProductReturn[],
): SearchResult[] {
  const orderResults: SearchResult[] =
    orders.map(order => ({
      key: `order-${order.id}`,
      type: 'order',
      sortDate: order.orderDate,
      order,
    }));

  const returnResults: SearchResult[] =
    productReturns.map(productReturn => ({
      key: `return-${productReturn.id}`,
      type: 'product-return',
      sortDate: productReturn.returnDateUtc,
      productReturn,
    }));

  return [
    ...orderResults,
    ...returnResults,
  ].sort(
    (firstResult, secondResult) =>
      getTimestamp(secondResult.sortDate) -
      getTimestamp(firstResult.sortDate),
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Tarix yoxdur';
  }

  return new Intl.DateTimeFormat('az-AZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getReturnStatusColors(
  status: ReturnStatus,
) {
  switch (status) {
    case ReturnStatus.Completed:
      return {
        backgroundColor: colors.successSoft,
        color: colors.success,
      };

    case ReturnStatus.Submitted:
      return {
        backgroundColor: colors.warningSoft,
        color: colors.warning,
      };

    case ReturnStatus.Cancelled:
      return {
        backgroundColor: colors.dangerSoft,
        color: colors.danger,
      };

    default:
      return {
        backgroundColor: colors.primarySoft,
        color: colors.primary,
      };
  }
}

function ProductReturnSearchCard({
  productReturn,
}: {
  productReturn: ProductReturn;
}) {
  const statusColors =
    getReturnStatusColors(
      productReturn.status,
    );

  const returnType =
    getReturnTypeSummary(
      productReturn.items.map(
        item => item.productType,
      ),
    );

  const totalQuantity =
    productReturn.items.reduce(
      (total, item) =>
        total + item.quantity,
      0,
    );

  const itemSummary = productReturn.items
    .slice(0, 3)
    .map(
      item =>
        `${item.productCode}/${item.batchNumber}`,
    )
    .join(' · ');

  return (
    <View style={styles.returnCard}>
      <View style={styles.returnCardHeader}>
        <View style={styles.returnTypeContainer}>
          <View style={styles.returnIconContainer}>
            <Ionicons
              name={
                productReturn.items.some(
                  item =>
                    item.productType ===
                    ProductType.Showcase,
                )
                  ? 'storefront-outline'
                  : 'arrow-undo-outline'
              }
              size={19}
              color={colors.primary}
            />
          </View>

          <View style={styles.returnTypeTextContainer}>
            <Text style={styles.returnTypeCaption}>
              GERİ QAYTARMA
            </Text>

            <Text style={styles.returnTypeText}>
              {returnType}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.returnStatusBadge,
            {
              backgroundColor:
                statusColors.backgroundColor,
            },
          ]}
        >
          <Text
            style={[
              styles.returnStatusText,
              {
                color: statusColors.color,
              },
            ]}
          >
            {getReturnStatusLabel(
              productReturn.status,
            )}
          </Text>
        </View>
      </View>

      <View style={styles.returnCustomerRow}>
        <Ionicons
          name="business-outline"
          size={18}
          color={colors.textSecondary}
        />

        <Text
          style={styles.returnCustomerName}
          numberOfLines={2}
        >
          {productReturn.customerName}
        </Text>
      </View>

      {itemSummary ? (
        <View style={styles.productCodeContainer}>
          <Ionicons
            name="barcode-outline"
            size={17}
            color={colors.primary}
          />

          <Text
            style={styles.productCodeText}
            numberOfLines={2}
          >
            {itemSummary}
            {productReturn.items.length > 3
              ? ` +${productReturn.items.length - 3}`
              : ''}
          </Text>
        </View>
      ) : null}

      <View style={styles.returnInformationGrid}>
        <View style={styles.returnInformationItem}>
          <Text style={styles.returnInformationLabel}>
            Anbar
          </Text>

          <Text
            style={styles.returnInformationValue}
            numberOfLines={1}
          >
            {productReturn.warehouseName}
          </Text>
        </View>

        <View style={styles.returnInformationItem}>
          <Text style={styles.returnInformationLabel}>
            Tarix
          </Text>

          <Text style={styles.returnInformationValue}>
            {formatDate(
              productReturn.returnDateUtc,
            )}
          </Text>
        </View>

        <View style={styles.returnInformationItem}>
          <Text style={styles.returnInformationLabel}>
            Məhsul sətri
          </Text>

          <Text style={styles.returnInformationValue}>
            {productReturn.items.length}
          </Text>
        </View>

        <View style={styles.returnInformationItem}>
          <Text style={styles.returnInformationLabel}>
            Ümumi say
          </Text>

          <Text style={styles.returnInformationValue}>
            {totalQuantity} ədəd
          </Text>
        </View>
      </View>

      <View style={styles.returnDivider} />

      <View style={styles.returnFooter}>
        <View style={styles.returnFooterItem}>
          <Ionicons
            name="person-outline"
            size={15}
            color={colors.textLight}
          />

          <Text
            style={styles.returnFooterText}
            numberOfLines={1}
          >
            Daxil edən: {productReturn.createdByFullName}
          </Text>
        </View>

        <View style={styles.returnFooterItem}>
          <Ionicons
            name="images-outline"
            size={15}
            color={colors.textLight}
          />

          <Text style={styles.returnFooterText}>
            {productReturn.photos.length} şəkil
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function SearchScreen() {
  const { session } = useAuth();

  const accessToken = session?.accessToken;

  const [searchText, setSearchText] =
    useState('');

  const [appliedSearch, setAppliedSearch] =
    useState('');

  const [selectedFilter, setSelectedFilter] =
    useState<SearchFilter>('all');

  const [orders, setOrders] =
    useState<OrderListItem[]>([]);

  const [productReturns, setProductReturns] =
    useState<ProductReturn[]>([]);

  const [orderTotalCount, setOrderTotalCount] =
    useState(0);

  const [returnTotalCount, setReturnTotalCount] =
    useState(0);

  const [isLoading, setIsLoading] =
    useState(false);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [reloadNumber, setReloadNumber] =
    useState(0);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const normalizedInput =
    searchText.trim();

  const hasEnoughCharacters =
    normalizedInput.length >=
    MINIMUM_SEARCH_LENGTH;

  const results = createSearchResults(
    orders,
    productReturns,
  );

  const totalCount =
    orderTotalCount + returnTotalCount;

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setAppliedSearch(
        searchText.trim(),
      );
    }, SEARCH_DELAY_MILLISECONDS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchText]);

  useEffect(() => {
    if (
      !accessToken ||
      appliedSearch.length <
        MINIMUM_SEARCH_LENGTH
    ) {
      return;
    }

    let isActive = true;

    const currentAccessToken = accessToken;

    const shouldLoadOrders =
      selectedFilter === 'all' ||
      selectedFilter === 'orders';

    const shouldLoadReturns =
      selectedFilter !== 'orders';

    const productType =
      selectedFilter === 'returns'
        ? ProductType.Product
        : selectedFilter === 'showcase'
          ? ProductType.Showcase
          : undefined;

    const requestTimeoutId = setTimeout(() => {
      const orderRequest = shouldLoadOrders
        ? getOrders(currentAccessToken, {
            search: appliedSearch,
            pageNumber: 1,
            pageSize: SEARCH_PAGE_SIZE,
          })
        : Promise.resolve(null);

      const returnRequest = shouldLoadReturns
        ? getProductReturns(
            currentAccessToken,
            {
              search: appliedSearch,
              productType,
              pageNumber: 1,
              pageSize: SEARCH_PAGE_SIZE,
            },
          )
        : Promise.resolve(null);

      void Promise.all([
        orderRequest,
        returnRequest,
      ])
        .then(
          ([orderResult, returnResult]) => {
            if (!isActive) {
              return;
            }

            setOrders(
              orderResult?.items ?? [],
            );

            setOrderTotalCount(
              orderResult?.totalCount ?? 0,
            );

            setProductReturns(
              returnResult?.items ?? [],
            );

            setReturnTotalCount(
              returnResult?.totalCount ?? 0,
            );

            setErrorMessage(null);
          },
        )
        .catch(error => {
          if (!isActive) {
            return;
          }

          setOrders([]);
          setProductReturns([]);
          setOrderTotalCount(0);
          setReturnTotalCount(0);
          setErrorMessage(
            getErrorMessage(error),
          );
        })
        .finally(() => {
          if (!isActive) {
            return;
          }

          setIsLoading(false);
          setIsRefreshing(false);
        });
    }, 0);

    return () => {
      isActive = false;
      clearTimeout(requestTimeoutId);
    };
  }, [
    accessToken,
    appliedSearch,
    reloadNumber,
    selectedFilter,
  ]);

  function changeSearchText(value: string) {
    setSearchText(value);
    setErrorMessage(null);

    if (
      value.trim().length >=
      MINIMUM_SEARCH_LENGTH
    ) {
      setIsLoading(true);
      return;
    }

    setIsLoading(false);
    setOrders([]);
    setProductReturns([]);
    setOrderTotalCount(0);
    setReturnTotalCount(0);
  }

  function clearSearch() {
    setSearchText('');
    setAppliedSearch('');
    setOrders([]);
    setProductReturns([]);
    setOrderTotalCount(0);
    setReturnTotalCount(0);
    setErrorMessage(null);
    setIsLoading(false);
    Keyboard.dismiss();
  }

  function changeFilter(filter: SearchFilter) {
    if (filter === selectedFilter) {
      return;
    }

    setSelectedFilter(filter);
    setErrorMessage(null);

    if (hasEnoughCharacters) {
      setIsLoading(true);
    }
  }

  function refreshSearch() {
    if (!hasEnoughCharacters) {
      return;
    }

    setIsRefreshing(true);
    setIsLoading(true);
    setReloadNumber(
      currentValue => currentValue + 1,
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerCaption}>
            RAM COLLECTION
          </Text>

          <Text style={styles.headerTitle}>
            Ümumi axtarış
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Ionicons
            name="search"
            size={22}
            color={colors.primary}
          />
        </View>
      </View>

      <View style={styles.searchArea}>
        <View
          style={[
            styles.searchContainer,
            hasEnoughCharacters &&
              styles.searchContainerActive,
          ]}
        >
          <Ionicons
            name="search-outline"
            size={21}
            color={
              hasEnoughCharacters
                ? colors.primary
                : colors.textLight
            }
          />

          <TextInput
            value={searchText}
            onChangeText={changeSearchText}
            onSubmitEditing={Keyboard.dismiss}
            placeholder="Qaimə №, müştəri, məhsul kodu və ya partiya"
            placeholderTextColor={colors.textLight}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
          />

          {searchText ? (
            <Pressable
              hitSlop={10}
              onPress={clearSearch}
            >
              <Ionicons
                name="close-circle"
                size={22}
                color={colors.textLight}
              />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.filterContent}
        >
          {filters.map(filter => {
            const isSelected =
              selectedFilter === filter.value;

            return (
              <Pressable
                key={filter.value}
                onPress={() => {
                  changeFilter(filter.value);
                }}
                style={({ pressed }) => [
                  styles.filterChip,
                  isSelected &&
                    styles.filterChipSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name={filter.icon}
                  size={17}
                  color={
                    isSelected
                      ? colors.white
                      : colors.textSecondary
                  }
                />

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
      </View>

      {hasEnoughCharacters ? (
        <View style={styles.resultSummary}>
          <View>
            <Text style={styles.resultTitle}>
              {isLoading
                ? 'Axtarılır...'
                : `${totalCount} nəticə`}
            </Text>

            {!isLoading && !errorMessage ? (
              <Text style={styles.resultDescription}>
                {orderTotalCount} qaimə ·{' '}
                {returnTotalCount} vazvrad/vitrin
              </Text>
            ) : null}
          </View>

          {isLoading ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
            />
          ) : (
            <Pressable
              hitSlop={10}
              onPress={refreshSearch}
              style={({ pressed }) => [
                styles.refreshButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="refresh"
                size={19}
                color={colors.primary}
              />
            </Pressable>
          )}
        </View>
      ) : null}

      {errorMessage ? (
        <Pressable
          onPress={refreshSearch}
          style={({ pressed }) => [
            styles.errorCard,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.errorIcon}>
            <Ionicons
              name="warning-outline"
              size={21}
              color={colors.danger}
            />
          </View>

          <View style={styles.errorContent}>
            <Text style={styles.errorTitle}>
              Axtarış alınmadı
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

      <FlatList
        data={
          hasEnoughCharacters &&
          !isLoading &&
          !errorMessage
            ? results
            : []
        }
        keyExtractor={item => item.key}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshing={isRefreshing}
        onRefresh={refreshSearch}
        renderItem={({ item }) => {
          if (item.type === 'order') {
            return (
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();

                  router.push(
                    `/order-detail/${item.order.id}` as Href,
                  );
                }}
                style={({ pressed }) => [
                  pressed && styles.pressed,
                ]}
              >
                <OrderListCard
                  order={item.order}
                />
              </Pressable>
            );
          }

          return (
            <Pressable
              onPress={() => {
                Keyboard.dismiss();

                router.push(
                  `/return-detail/${item.productReturn.id}` as Href,
                );
              }}
              style={({ pressed }) => [
                pressed && styles.pressed,
              ]}
            >
              <ProductReturnSearchCard
                productReturn={item.productReturn}
              />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !hasEnoughCharacters ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons
                  name="search-outline"
                  size={34}
                  color={colors.primary}
                />
              </View>

              <Text style={styles.emptyTitle}>
                Axtarmağa başlayın
              </Text>

              <Text style={styles.emptyDescription}>
                Qaimə nömrəsi, müştəri adı,
                məhsul kodu və ya partiyadan ən azı
                2 simvol yazın.
              </Text>

              <View style={styles.searchTips}>
                <View style={styles.searchTip}>
                  <Ionicons
                    name="receipt-outline"
                    size={17}
                    color={colors.primary}
                  />

                  <Text style={styles.searchTipText}>
                    Məsələn: 5004
                  </Text>
                </View>

                <View style={styles.searchTip}>
                  <Ionicons
                    name="business-outline"
                    size={17}
                    color={colors.primary}
                  />

                  <Text style={styles.searchTipText}>
                    Məsələn: Ruslan
                  </Text>
                </View>
              </View>
            </View>
          ) : isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator
                size="large"
                color={colors.primary}
              />

              <Text style={styles.loadingText}>
                Qaimə və vazvradlar axtarılır...
              </Text>
            </View>
          ) : !errorMessage ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons
                  name="file-tray-outline"
                  size={33}
                  color={colors.primary}
                />
              </View>

              <Text style={styles.emptyTitle}>
                Nəticə tapılmadı
              </Text>

              <Text style={styles.emptyDescription}>
                Yazılışı yoxlayın və ya başqa
                bölmə seçərək yenidən axtarın.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },

  headerCaption: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  headerTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
    marginTop: 3,
  },

  headerIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },

  searchArea: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },

  searchContainer: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  searchContainerActive: {
    borderColor: colors.primary,
  },

  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    paddingVertical: spacing.md,
  },

  filterContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },

  filterChip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.round,
    backgroundColor: colors.surface,
  },

  filterChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },

  filterText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  filterTextSelected: {
    color: colors.white,
  },

  resultSummary: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },

  resultTitle: {
    color: colors.primaryDark,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  resultDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 3,
  },

  refreshButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.surface,
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#F4C5C9',
    borderRadius: radius.lg,
    backgroundColor: colors.dangerSoft,
  },

  errorIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },

  errorContent: {
    flex: 1,
  },

  errorTitle: {
    color: colors.danger,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  errorDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 3,
  },

  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: 110,
  },

  returnCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  returnCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  returnTypeContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  returnIconContainer: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },

  returnTypeTextContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },

  returnTypeCaption: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },

  returnTypeText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
    marginTop: 2,
  },

  returnStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radius.round,
  },

  returnStatusText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },

  returnCustomerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  returnCustomerName: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },

  productCodeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },

  productCodeText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  returnInformationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.md,
    marginTop: spacing.lg,
  },

  returnInformationItem: {
    width: '50%',
    paddingRight: spacing.md,
  },

  returnInformationLabel: {
    color: colors.textLight,
    fontSize: fontSize.xs,
  },

  returnInformationValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: 3,
  },

  returnDivider: {
    height: 1,
    marginVertical: spacing.md,
    backgroundColor: colors.border,
  },

  returnFooter: {
    gap: spacing.sm,
  },

  returnFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  returnFooterText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: 70,
  },

  emptyIconContainer: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
    marginTop: spacing.lg,
  },

  emptyDescription: {
    maxWidth: 330,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  searchTips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  searchTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.round,
    backgroundColor: colors.surface,
  },

  searchTipText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },

  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.lg,
  },

  pressed: {
    opacity: 0.65,
  },
});