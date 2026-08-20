import { Ionicons } from '@expo/vector-icons';
import {
    router,
    type Href,
} from 'expo-router';
import {
    useEffect,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCustomers } from '../../api/customers-api';
import { useAuth } from '../../auth/auth-context';
import {
    canManageOperations,
} from '../../auth/permissions';
import type {
    Customer,
} from '../../features/customers/customer-types';
import {
    colors,
    fontSize,
    radius,
    spacing,
} from '../../theme';

type CustomerFilter = 'all' | 'active' | 'inactive';

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Müştərilər alınmadı.';
}

export default function CustomersScreen() {
  const { session } = useAuth();
  const accessToken = session?.accessToken;
  const canManage = canManageOperations(session?.role);

  const [customers, setCustomers] =
    useState<readonly Customer[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] =
    useState<CustomerFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isActive = true;
    const currentAccessToken = accessToken;
    const currentSearch = search.trim();

    const timeoutId = setTimeout(() => {
      getCustomers(currentAccessToken, {
        search: currentSearch || undefined,
        isActive:
          filter === 'all'
            ? undefined
            : filter === 'active',
      })
        .then(result => {
          if (!isActive) {
            return;
          }

          setCustomers(result);
          setErrorMessage(null);
        })
        .catch((error: unknown) => {
          if (isActive) {
            setErrorMessage(getErrorMessage(error));
          }
        })
        .finally(() => {
          if (isActive) {
            setIsLoading(false);
          }
        });
    }, 250);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [accessToken, filter, search]);

  async function refreshCustomers() {
    if (!accessToken || isRefreshing) {
      return;
    }

    setIsRefreshing(true);

    try {
      const result = await getCustomers(accessToken, {
        search: search.trim() || undefined,
        isActive:
          filter === 'all'
            ? undefined
            : filter === 'active',
      });

      setCustomers(result);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }

  function changeFilter(nextFilter: CustomerFilter) {
    setIsLoading(true);
    setFilter(nextFilter);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void refreshCustomers();
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <Animated.View
          entering={FadeInUp.duration(300)}
          style={styles.header}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.text}
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              RAM COLLECTION
            </Text>
            <Text style={styles.title}>Müştərilər</Text>
          </View>

          {canManage ? (
            <Pressable
              onPress={() => {
                router.push('/create-customer' as Href);
              }}
              style={({ pressed }) => [
                styles.addButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="add" size={25} color={colors.white} />
            </Pressable>
          ) : null}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(330).delay(50)}
          style={styles.heroCard}
        >
          <View style={styles.heroIcon}>
            <Ionicons
              name="storefront-outline"
              size={25}
              color={colors.white}
            />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroLabel}>Ümumi müştəri</Text>
            <Text style={styles.heroNumber}>{customers.length}</Text>
          </View>
          <Text style={styles.heroDescription}>
            Qaimə və vazvradların aid olduğu mağazalar
          </Text>
        </Animated.View>

        <View style={styles.searchBox}>
          <Ionicons
            name="search-outline"
            size={20}
            color={colors.textSecondary}
          />
          <TextInput
            value={search}
            onChangeText={value => {
              setIsLoading(true);
              setSearch(value);
            }}
            placeholder="Ad və ya telefonla axtar"
            placeholderTextColor={colors.textLight}
            style={styles.searchInput}
            autoCorrect={false}
          />
          {search ? (
            <Pressable
              onPress={() => {
                setIsLoading(true);
                setSearch('');
              }}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filters}>
          {(
            [
              ['all', 'Hamısı'],
              ['active', 'Aktiv'],
              ['inactive', 'Deaktiv'],
            ] as const
          ).map(([value, label]) => {
            const isSelected = filter === value;

            return (
              <Pressable
                key={value}
                onPress={() => changeFilter(value)}
                style={[
                  styles.filterButton,
                  isSelected && styles.selectedFilter,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    isSelected && styles.selectedFilterText,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {errorMessage ? (
          <Pressable
            onPress={() => void refreshCustomers()}
            style={styles.errorCard}
          >
            <Ionicons
              name="warning-outline"
              size={21}
              color={colors.danger}
            />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </Pressable>
        ) : null}

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Müştərilər alınır...</Text>
          </View>
        ) : null}

        {!isLoading &&
        !errorMessage &&
        customers.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="people-outline"
                size={29}
                color={colors.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>Müştəri tapılmadı</Text>
            <Text style={styles.emptyDescription}>
              Axtarışa uyğun müştəri mövcud deyil.
            </Text>
          </View>
        ) : null}

        {!isLoading && !errorMessage
          ? customers.map((customer, index) => (
              <Animated.View
                key={customer.id}
                entering={FadeInDown
                  .duration(270)
                  .delay(Math.min(index * 30, 240))}
              >
                <Pressable
                  disabled={!canManage}
                  onPress={() => {
                    router.push(
                      `/edit-customer/${customer.id}` as Href,
                    );
                  }}
                  style={({ pressed }) => [
                    styles.customerCard,
                    pressed && canManage && styles.pressed,
                  ]}
                >
                  <View
                    style={[
                      styles.customerIcon,
                      !customer.isActive && styles.inactiveIcon,
                    ]}
                  >
                    <Ionicons
                      name="storefront-outline"
                      size={22}
                      color={
                        customer.isActive
                          ? colors.primary
                          : colors.textLight
                      }
                    />
                  </View>

                  <View style={styles.customerContent}>
                    <View style={styles.customerHeading}>
                      <Text
                        style={styles.customerName}
                        numberOfLines={1}
                      >
                        {customer.name}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          customer.isActive
                            ? styles.activeBadge
                            : styles.inactiveBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            customer.isActive
                              ? styles.activeText
                              : styles.inactiveText,
                          ]}
                        >
                          {customer.isActive ? 'Aktiv' : 'Deaktiv'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.infoRow}>
                      <Ionicons
                        name="call-outline"
                        size={15}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.infoText}>
                        {customer.phoneNumber || 'Telefon yazılmayıb'}
                      </Text>
                    </View>

                    {customer.note ? (
                      <Text style={styles.note} numberOfLines={2}>
                        {customer.note}
                      </Text>
                    ) : null}
                  </View>

                  {canManage ? (
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.textLight}
                    />
                  ) : null}
                </Pressable>
              </Animated.View>
            ))
          : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  headerText: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: fontSize.xl, fontWeight: '800', marginTop: 2 },
  addButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primary },
  pressed: { opacity: 0.72 },
  heroCard: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.xl, backgroundColor: colors.primaryDark, padding: spacing.xl, marginTop: spacing.xl },
  heroIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: '#244C73' },
  heroText: { marginLeft: spacing.md },
  heroLabel: { color: '#AFC0D6', fontSize: fontSize.xs },
  heroNumber: { color: colors.white, fontSize: fontSize.xl, fontWeight: '900', marginTop: 2 },
  heroDescription: { flex: 1, color: '#C8D6EA', fontSize: fontSize.xs, lineHeight: 18, textAlign: 'right', marginLeft: spacing.md },
  searchBox: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md, marginTop: spacing.lg },
  searchInput: { flex: 1, color: colors.text, fontSize: fontSize.sm },
  filters: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  filterButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  selectedFilter: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  filterText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '600' },
  selectedFilterText: { color: colors.primary, fontWeight: '800' },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, backgroundColor: colors.dangerSoft, padding: spacing.md, marginTop: spacing.md },
  errorText: { flex: 1, color: colors.danger, fontSize: fontSize.sm },
  loadingBox: { alignItems: 'center', paddingVertical: spacing.xxl },
  loadingText: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.md },
  emptyCard: { alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, backgroundColor: colors.surface, padding: spacing.xxl, marginTop: spacing.md },
  emptyIcon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.primarySoft },
  emptyTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '800', marginTop: spacing.md },
  emptyDescription: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.xs },
  customerCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, backgroundColor: colors.surface, padding: spacing.md, marginTop: spacing.md },
  customerIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primarySoft },
  inactiveIcon: { backgroundColor: colors.background },
  customerContent: { flex: 1, marginHorizontal: spacing.md },
  customerHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  customerName: { flex: 1, color: colors.text, fontSize: fontSize.md, fontWeight: '800' },
  statusBadge: { borderRadius: radius.round, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  activeBadge: { backgroundColor: colors.successSoft },
  inactiveBadge: { backgroundColor: colors.background },
  statusText: { fontSize: fontSize.xs, fontWeight: '700' },
  activeText: { color: colors.success },
  inactiveText: { color: colors.textSecondary },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.xs },
  infoText: { color: colors.textSecondary, fontSize: fontSize.xs },
  note: { color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 18, marginTop: spacing.sm },
});