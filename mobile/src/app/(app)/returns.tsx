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
} from '../../api/product-return-api';
import { useAuth } from '../../auth/auth-context';
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

type StatusFilter =
  | 'all'
  | ReturnStatus;

type ProductTypeFilter =
  | 'all'
  | ProductType;

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Vazvradlar alınmadı.';
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(
    'az-AZ',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
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

  const accessToken =
    session?.accessToken;

  const [searchText, setSearchText] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('all');

  const [
    productTypeFilter,
    setProductTypeFilter,
  ] = useState<ProductTypeFilter>('all');

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

    const currentAccessToken =
      accessToken;

    const timeoutId = setTimeout(() => {
      async function loadReturns() {
        try {
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
    statusFilter,
  ]);

  function refresh() {
    setIsRefreshing(true);

    setReloadNumber(
      currentValue => currentValue + 1,
    );
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerCaption}>
            ANBAR ƏMƏLİYYATLARI
          </Text>

          <Text style={styles.headerTitle}>
            Vazvrad və Vitrin
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
          placeholderTextColor={
            colors.textLight
          }
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
          contentContainerStyle={
            styles.filterContent
          }
        >
          <Pressable
            onPress={() => {
              changeProductTypeFilter('all');
            }}
            style={[
              styles.filterChip,
              productTypeFilter === 'all' &&
                styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                productTypeFilter === 'all' &&
                  styles.filterTextActive,
              ]}
            >
              Hamısı
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              changeProductTypeFilter(
                ProductType.Product,
              );
            }}
            style={[
              styles.filterChip,
              productTypeFilter ===
                ProductType.Product &&
                styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                productTypeFilter ===
                  ProductType.Product &&
                  styles.filterTextActive,
              ]}
            >
              Vazvrad
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              changeProductTypeFilter(
                ProductType.Showcase,
              );
            }}
            style={[
              styles.filterChip,
              productTypeFilter ===
                ProductType.Showcase &&
                styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                productTypeFilter ===
                  ProductType.Showcase &&
                  styles.filterTextActive,
              ]}
            >
              Vitrin
            </Text>
          </Pressable>
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            styles.filterContent
          }
        >
          {[
            {
              value: 'all' as StatusFilter,
              label: 'Bütün statuslar',
            },
            {
              value:
                ReturnStatus.Pending as StatusFilter,
              label: 'Şəkil gözləyir',
            },
            {
              value:
                ReturnStatus.Submitted as StatusFilter,
              label: 'Təsdiq gözləyir',
            },
            {
              value:
                ReturnStatus.Completed as StatusFilter,
              label: 'Tamamlanıb',
            },
            {
              value:
                ReturnStatus.Cancelled as StatusFilter,
              label: 'Ləğv edilib',
            },
          ].map(option => {
            const isActive =
              statusFilter === option.value;

            return (
              <Pressable
                key={String(option.value)}
                onPress={() => {
                  changeStatusFilter(
                    option.value,
                  );
                }}
                style={[
                  styles.statusChip,
                  isActive &&
                    styles.statusChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    isActive &&
                      styles.statusChipTextActive,
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

      <FlatList
        data={isLoading ? [] : returns}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => {
          const statusColors =
            getStatusColors(item.status);

          const totalQuantity =
            item.items.reduce(
              (total, returnItem) =>
                total +
                returnItem.quantity,
              0,
            );

          const returnType =
            getReturnTypeSummary(
              item.items.map(
                returnItem =>
                  returnItem.productType,
              ),
            );

          return (
            <Pressable
                onPress={() => {
                  router.push(
                    `/return-detail/${item.id}` as Href,
                  );
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
                        color:
                          statusColors.text,
                      },
                    ]}
                  >
                    {getReturnStatusLabel(
                      item.status,
                    )}
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
                  {formatDate(
                    item.returnDateUtc,
                  )}
                </Text>

                <Text style={styles.footerText}>
                  {item.createdByFullName}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator
                size="small"
                color={colors.primary}
              />

              <Text style={styles.stateText}>
                Vazvradlar alınır...
              </Text>
            </View>
          ) : !errorMessage ? (
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
                Yeni Vazvrad və ya Vitrin
                əlavə edə bilərsiniz.
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
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    margin: spacing.lg,
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
    backgroundColor:
      colors.surfaceSecondary,
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
    marginHorizontal: spacing.lg,
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

  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },

  returnCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
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
    marginTop: spacing.sm,
  },

  pressed: {
    opacity: 0.65,
  },
});