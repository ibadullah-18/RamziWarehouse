import { useCallback, useEffect, useRef, useState } from 'react';
import { type Href, router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getProductReturns } from '../../api/product-return-api';
import { useAuth } from '../../auth/auth-context';
import { AppUpdateBanner } from '../../components/app-update-banner';
import { CustomerPickerModal } from '../../components/customer-picker-modal';
import { CodeSearchField } from '../../components/code-search-field';
import { ReturnCard } from '../../components/return-card';
import type { Customer } from '../orders/create-order-types';
import { useResponsiveLayout } from '../../hooks/use-responsive-layout';
import { Btn, Chip } from '../customer-accounts/account-ui';
import AccountDateInput from '../customer-accounts/account-date-input';
import { isBusinessDate } from '../customer-accounts/account-navigation';
import { todayKey } from '../customer-accounts/account-dates';
import { ProductReturn, ProductType, ReturnStatus } from './product-return-types';
import { colors } from '../../theme';

type Kind = 'both' | 'return' | 'showcase';
type StatusFilter = ReturnStatus | 'all';
const pageSize = 30;

/**
 * Lists returns and showcase items, newest first. The search box matches the customer
 * name, the product code and the batch: typing 1019 shows every return and showcase item
 * that contains 1019. The Axtarış tab adds a customer filter on top of the same list.
 */
export default function ReturnsBrowser({
  title,
  description,
  allowCreate,
  allowCustomerFilter,
  defaultStatus = 'all',
  allowAcceptedDate,
}: {
  title: string;
  description: string;
  allowCreate?: boolean;
  allowCustomerFilter?: boolean;
  /** The Vazvrad tab opens on the returns waiting for the manager. */
  defaultStatus?: StatusFilter;
  /** Search by the day the manager accepted the return into the warehouse. */
  allowAcceptedDate?: boolean;
}) {
  const { session } = useAuth();
  const token = session?.accessToken ?? '';
  const layout = useResponsiveLayout();
  const columns = layout.isTablet ? 2 : 1;

  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<Kind>('both');
  const [status, setStatus] = useState<StatusFilter>(defaultStatus);
  const [acceptedOn, setAcceptedOn] = useState(false);
  const [acceptedDate, setAcceptedDate] = useState(todayKey);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [picker, setPicker] = useState(false);
  const [items, setItems] = useState<ProductReturn[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  const navigating = useRef(false);

  // Wait for a pause in typing before asking the server.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 350);
    return () => clearTimeout(timer);
  }, [text]);

  const load = useCallback(
    async (page: number) => {
      if (!token) return;
      const serial = ++request.current;
      setLoading(true);
      setError('');
      try {
        const result = await getProductReturns(token, {
          search: search || undefined,
          customerId: customer?.id,
          status: acceptedOn || status === 'all' ? undefined : status,
          acceptedDate: acceptedOn && isBusinessDate(acceptedDate) ? acceptedDate : undefined,
          productType: kind === 'both' ? undefined : kind === 'return' ? ProductType.Product : ProductType.Showcase,
          pageNumber: page,
          pageSize,
        });
        if (serial !== request.current) return;
        setItems((current) => (page === 1 ? result.items : [...current, ...result.items]));
        setTotal(result.totalCount);
      } catch (e) {
        if (serial === request.current) setError(e instanceof Error ? e.message : 'Siyahı alınmadı.');
      } finally {
        if (serial === request.current) setLoading(false);
      }
    },
    [token, search, customer, kind, status, acceptedOn, acceptedDate],
  );

  useFocusEffect(
    useCallback(() => {
      navigating.current = false;
      void load(1);
      return () => {
        request.current++;
      };
    }, [load]),
  );

  const open = (url: string) => {
    if (navigating.current) return;
    navigating.current = true;
    router.push(url as Href);
  };

  const quantity = items.reduce((sum, r) => sum + r.items.reduce((n, i) => n + i.quantity, 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        key={columns}
        numColumns={columns}
        data={items}
        keyExtractor={(record) => record.id}
        columnWrapperStyle={columns > 1 ? styles.column : undefined}
        contentContainerStyle={[
          styles.page,
          { maxWidth: layout.isTablet ? 1040 : 720, paddingHorizontal: layout.horizontalPadding },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={loading && items.length === 0} onRefresh={() => void load(1)} tintColor={colors.primary} />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (!loading && items.length < total) void load(Math.floor(items.length / pageSize) + 1);
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppUpdateBanner />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.muted}>{description}</Text>
            {allowCreate ? (
              <Btn icon="add-circle-outline" title="Yeni vazvrad yarat" onPress={() => open('/create-return')} />
            ) : null}
            <CodeSearchField value={text} onChangeText={setText} />
            {allowCustomerFilter ? (
              <View style={styles.filters}>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.customerButton, customer && { borderColor: colors.primary }]}
                  onPress={() => setPicker(true)}
                >
                  <Text style={styles.customerText} numberOfLines={1}>
                    {customer ? customer.name : 'Müştəri seçin (istəyə görə)'}
                  </Text>
                </Pressable>
                {customer ? <Chip label="Təmizlə" onPress={() => setCustomer(null)} /> : null}
              </View>
            ) : null}
            {!acceptedOn ? (
              <View style={styles.filters}>
                <Chip label="Təsdiq gözləyir" selected={status === ReturnStatus.Submitted} onPress={() => setStatus(ReturnStatus.Submitted)} />
                <Chip label="Şəkil gözləyir" selected={status === ReturnStatus.Pending} onPress={() => setStatus(ReturnStatus.Pending)} />
                <Chip label="İşlənib" selected={status === ReturnStatus.Completed} onPress={() => setStatus(ReturnStatus.Completed)} />
                <Chip label="Ləğv" selected={status === ReturnStatus.Cancelled} onPress={() => setStatus(ReturnStatus.Cancelled)} />
                <Chip label="Hamısı" selected={status === 'all'} onPress={() => setStatus('all')} />
              </View>
            ) : null}
            {allowAcceptedDate ? (
              <>
                <View style={styles.filters}>
                  <Chip label="Anbara qəbul tarixi" selected={acceptedOn} onPress={() => setAcceptedOn((on) => !on)} />
                </View>
                {acceptedOn ? <AccountDateInput value={acceptedDate} onChange={setAcceptedDate} /> : null}
              </>
            ) : null}
            <View style={styles.filters}>
              <Chip label="Hamısı" selected={kind === 'both'} onPress={() => setKind('both')} />
              <Chip label="Vazvrad" selected={kind === 'return'} onPress={() => setKind('return')} />
              <Chip label="Vitrin" selected={kind === 'showcase'} onPress={() => setKind('showcase')} />
            </View>
            <Text style={styles.muted}>
              {total} qeyd{items.length > 0 ? ` · göstərilən ${quantity} ədəd` : ''}
            </Text>
            {error ? (
              <Pressable onPress={() => void load(1)}>
                <Text style={{ color: colors.danger }}>{error} · Yenidən yoxla</Text>
              </Pressable>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.muted}>{error ? '' : 'Seçiminizə uyğun qeyd yoxdur.'}</Text>
          )
        }
        ListFooterComponent={loading && items.length > 0 ? <ActivityIndicator color={colors.primary} /> : null}
        renderItem={({ item }) => (
          <View style={columns > 1 ? styles.cell : undefined}>
            <ReturnCard record={item} highlight={search} onPress={() => open(`/return-detail/${item.id}`)} />
          </View>
        )}
      />
      {allowCustomerFilter ? (
        <CustomerPickerModal
          visible={picker}
          accessToken={token}
          includeInactive
          selectedCustomerId={customer?.id}
          onClose={() => setPicker(false)}
          onSelect={(value) => {
            setCustomer(value);
            setPicker(false);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: { width: '100%', alignSelf: 'center', paddingTop: 16, paddingBottom: 40, gap: 12 },
  column: { gap: 12 },
  cell: { flex: 1, minWidth: 0 },
  header: { gap: 12, marginBottom: 6 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  muted: { fontSize: 15, lineHeight: 22, color: colors.textSecondary },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  customerButton: {
    flex: 1,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  customerText: { color: colors.text, fontSize: 16 },
});
