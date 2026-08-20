import { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import {
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
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
  getProductReturns,
} from '../../../api/product-return-api';
import { useAuth } from '../../../auth/auth-context';
import { DateFilterBar } from '../../../components/date-filter-bar';
import {
  formatDateKey,
  getBakuUtcDayRange,
  getTodayDateKey,
} from '../../../features/dates/date-filter';
import {
  getReturnStatusLabel,
  getReturnTypeSummary,
} from '../../../features/product-returns/product-return-status';
import type {
  ProductReturn,
} from '../../../features/product-returns/product-return-types';
import {
  ProductType,
  ReturnStatus,
} from '../../../features/product-returns/product-return-types';
import {
  colors,
  fontSize,
  radius,
  spacing,
} from '../../../theme';

type StatusFilter =
  | 'all'
  | ReturnStatus;

type ProductTypeFilter =
  | 'all'
  | ProductType;

function getErrorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : 'Vazvradlar alınmadı.';
}

function formatReturnDate(
  value: string,
): string {
  return new Date(value).toLocaleDateString(
    'az-AZ',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Baku',
    },
  );
}

function getStatusColors(
  status: ReturnStatus,
) {
  switch (status) {
    case ReturnStatus.Completed:
      return {
        background: '#E8F7EF',
        text: '#218653',
      };

    case ReturnStatus.Submitted:
      return {
        background: '#FFF4D8',
        text: '#A56B00',
      };

    case ReturnStatus.Cancelled:
      return {
        background: colors.dangerSoft,
        text: colors.danger,
      };

    default:
      return {
        background: colors.primarySoft,
        text: colors.primary,
      };
  }
}

export default function ReturnsScreen() {
  const { session } = useAuth();

  const parameters =
    useLocalSearchParams<{
      reload?: string;
    }>();

  const accessToken = session?.accessToken;

  const [selectedDateKey, setSelectedDateKey] =
    useState(getTodayDateKey);

  const [searchText, setSearchText] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('all');

  const [productTypeFilter, setProductTypeFilter] =
    useState<ProductTypeFilter>('all');

  const [returns, setReturns] =
    useState<ProductReturn[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [reloadNumber, setReloadNumber] =
    useState(0);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isActive = true;
    const currentAccessToken = accessToken;

    const timeoutId = setTimeout(() => {
      async function loadReturns() {
        try {
          const dateRange =
            getBakuUtcDayRange(
              selectedDateKey,
            );

          const result =
            await getProductReturns(
              currentAccessToken,
              {
                search: searchText,

                status:
                  statusFilter === 'all'
                    ? undefined
                    : statusFilter,

                productType:
                  productTypeFilter === 'all'
                    ? undefined
                    : productTypeFilter,

                fromDateUtc:
                  dateRange.fromDateUtc,

                toDateUtc:
                  dateRange.toDateUtc,

                pageNumber: 1,
                pageSize: 100,
              },
            );

          if (isActive) {
            setReturns(result.items);
            setErrorMessage(null);
          }
        } catch (error) {
          if (isActive) {
            setErrorMessage(
              getErrorMessage(error),
            );
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
            setIsRefreshing(false);
          }
        }
      }

      void loadReturns();
    }, 300);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [
    accessToken,
    parameters.reload,
    productTypeFilter,
    reloadNumber,
    searchText,
    selectedDateKey,
    statusFilter,
  ]);

  function refresh() {
    setIsRefreshing(true);
    setReloadNumber(
      currentValue => currentValue + 1,
    );
  }

  function changeDate(dateKey: string) {
    if (dateKey === selectedDateKey) {
      return;
    }

    setReturns([]);
    setErrorMessage(null);
    setIsLoading(true);
    setSelectedDateKey(dateKey);
  }

  function changeStatusFilter(
    value: StatusFilter,
  ) {
    setStatusFilter(value);
    setIsLoading(true);
  }

  function changeProductTypeFilter(
    value: ProductTypeFilter,
  ) {
    setProductTypeFilter(value);
    setIsLoading(true);
  }

  return (
    <SafeAreaView
      edges={['top']}
      style={styles.safeArea}
    >
      <FlatList
        data={isLoading ? [] : returns}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressBackgroundColor={colors.surface}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerCaption}>
                  ANBAR ƏMƏLİYYATLARI
                </Text>

                <Text style={styles.headerTitle}>
                  Vazvrad və Vitrin
                </Text>

                <Text style={styles.headerSubtitle}>
                  {returns.length > 0
                    ? `${returns.length} nəticə tapıldı`
                    : `${formatDateKey(selectedDateKey)} tarixinin qeydləri`}
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  router.push(
                    '/create-return' as Href,
                  );
                }}
                style={({ pressed }) => [
                  styles.createButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="add"
                  size={20}
                  color={colors.white}
                />

                <Text style={styles.createButtonText}>
                  Yeni
                </Text>
              </Pressable>
            </View>

            <DateFilterBar
              dateKey={selectedDateKey}
              onDateChange={changeDate}
            />

            <View style={styles.searchContainer}>
              <Ionicons
                name="search-outline"
                size={20}
                color={colors.textLight}
              />

              <TextInput
                value={searchText}
                onChangeText={value => {
                  setSearchText(value);
                  setIsLoading(true);
                }}
                placeholder="Müştəri, kod və ya partiya..."
                placeholderTextColor={colors.textLight}
                autoCorrect={false}
                style={styles.searchInput}
              />

              {searchText ? (
                <Pressable
                  hitSlop={10}
                  onPress={() => {
                    setSearchText('');
                    setIsLoading(true);
                  }}
                >
                  <Ionicons
                    name="close-circle"
                    size={21}
                    color={colors.textLight}
                  />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.filters}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterContent}
              >
                {[
                  {
                    value: 'all' as ProductTypeFilter,
                    label: 'Hamısı',
                  },
                  {
                    value: ProductType.Product as ProductTypeFilter,
                    label: 'Vazvrad',
                  },
                  {
                    value: ProductType.Showcase as ProductTypeFilter,
                    label: 'Vitrin',
                  },
                ].map(option => {
                  const isActive =
                    productTypeFilter === option.value;

                  return (
                    <Pressable
                      key={String(option.value)}
                      onPress={() => {
                        changeProductTypeFilter(
                          option.value,
                        );
                      }}
                      style={[
                        styles.filterChip,
                        isActive && styles.filterChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          isActive && styles.filterTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterContent}
              >
                {[
                  {
                    value: 'all' as StatusFilter,
                    label: 'Bütün statuslar',
                  },
                  {
                    value: ReturnStatus.Pending as StatusFilter,
                    label: 'Şəkil gözləyir',
                  },
                  {
                    value: ReturnStatus.Submitted as StatusFilter,
                    label: 'Təsdiq gözləyir',
                  },
                  {
                    value: ReturnStatus.Completed as StatusFilter,
                    label: 'Tamamlanıb',
                  },
                  {
                    value: ReturnStatus.Cancelled as StatusFilter,
                    label: 'Ləğv edilib',
                  },
                ].map(option => {
                  const isActive =
                    statusFilter === option.value;

                  return (
                    <Pressable
                      key={String(option.value)}
                      onPress={() => {
                        changeStatusFilter(option.value);
                      }}
                      style={[
                        styles.statusChip,
                        isActive && styles.statusChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          isActive && styles.statusChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {errorMessage ? (
              <Pressable
                onPress={refresh}
                style={styles.errorCard}
              >
                <Ionicons
                  name="warning-outline"
                  size={21}
                  color={colors.danger}
                />

                <View style={styles.errorContent}>
                  <Text style={styles.errorTitle}>
                    Məlumatlar alınmadı
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

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                />

                <Text style={styles.stateText}>
                  Vazvradlar alınır...
                </Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const statusColors =
            getStatusColors(item.status);

          const totalQuantity = item.items.reduce(
            (total, returnItem) =>
              total + returnItem.quantity,
            0,
          );

          const returnType = getReturnTypeSummary(
            item.items.map(
              returnItem => returnItem.productType,
            ),
          );

          return (
            <Pressable
              onPress={() => {
                router.push({
                  pathname: '/return-detail/[id]',
                  params: {
                    id: item.id,
                    returnTo: 'returns',
                    returnDate: selectedDateKey,
                  },
                } as Href);
              }}
              style={({ pressed }) => [
                styles.returnCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.cardTop}>
                <View style={styles.typeContainer}>
                  <Ionicons
                    name="arrow-undo-outline"
                    size={19}
                    color={colors.primary}
                  />

                  <Text style={styles.typeText}>
                    {returnType}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        statusColors.background,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: statusColors.text,
                      },
                    ]}
                  >
                    {getReturnStatusLabel(item.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.customerName}>
                {item.customerName}
              </Text>

              <Text style={styles.warehouseText}>
                {item.warehouseName}
              </Text>

              <View style={styles.cardDivider} />

              <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaValue}>
                    {item.items.length}
                  </Text>

                  <Text style={styles.metaLabel}>
                    Məhsul sətri
                  </Text>
                </View>

                <View style={styles.metaItem}>
                  <Text style={styles.metaValue}>
                    {totalQuantity}
                  </Text>

                  <Text style={styles.metaLabel}>
                    Ümumi ədəd
                  </Text>
                </View>

                <View style={styles.metaItem}>
                  <Text style={styles.metaValue}>
                    {item.photos.length}
                  </Text>

                  <Text style={styles.metaLabel}>
                    Şəkil
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.footerText}>
                  {formatReturnDate(item.returnDateUtc)}
                </Text>

                <Text style={styles.footerText}>
                  {item.createdByFullName}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !isLoading && !errorMessage ? (
            <View style={styles.stateContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="arrow-undo-outline"
                  size={30}
                  color={colors.primary}
                />
              </View>

              <Text style={styles.emptyTitle}>
                Nəticə tapılmadı
              </Text>

              <Text style={styles.emptyDescription}>
                {formatDateKey(selectedDateKey)} tarixində
                uyğun Vazvrad və ya Vitrin yoxdur.
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

  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 100,
  },

  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },

  headerTextContainer: {
    flex: 1,
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

  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },

  createButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },

  createButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  searchContainer: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    paddingVertical: spacing.md,
  },

  filters: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    marginHorizontal: -spacing.lg,
  },

  filterContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },

  filterChip: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },

  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },

  filterText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  filterTextActive: {
    color: colors.white,
  },

  statusChip: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceSecondary,
  },

  statusChipActive: {
    backgroundColor: colors.primarySoft,
  },

  statusChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },

  statusChipTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#F4C5C9',
    borderRadius: radius.lg,
    backgroundColor: colors.dangerSoft,
  },

  errorContent: {
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
    marginTop: 2,
  },

  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },

  returnCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },

  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  typeText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.xl,
  },

  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },

  customerName: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
    marginTop: spacing.md,
  },

  warehouseText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 4,
  },

  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  cardMeta: {
    flexDirection: 'row',
  },

  metaItem: {
    flex: 1,
    alignItems: 'center',
  },

  metaValue: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },

  metaLabel: {
    color: colors.textLight,
    fontSize: fontSize.xs,
    marginTop: 3,
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },

  footerText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },

  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
  },

  stateText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },

  emptyIcon: {
    width: 60,
    height: 60,
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
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.sm,
  },

  pressed: {
    opacity: 0.65,
  },
});