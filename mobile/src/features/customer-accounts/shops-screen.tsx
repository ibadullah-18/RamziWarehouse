import { useCallback, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Href, router, useFocusEffect } from 'expo-router';

import { getAllCustomerAccounts } from '../../api/customer-account-api';
import { TextField } from '../../components/form-inputs';
import { colors } from '../../theme';
import { accountDestination } from './account-navigation';
import {
  AccountPageShell,
  Btn,
  Card,
  Chip,
  Grid,
  Line,
  Loading,
  Notice,
  Tile,
  TileRow,
  money,
} from './account-ui';
import { CustomerAccountSummary } from './customer-account-types';
import { errorText, useAccountSession } from './use-account-session';

type Sort = 'name' | 'debt';

/**
 * The Sədərək customers, apart from the ordinary customer list: each shop with its debt under
 * its name. A tap opens the shop page where the old and daily debt can be added or corrected.
 */
export default function ShopsScreen() {
  const { token, canUse } = useAccountSession();
  const [items, setItems] = useState<CustomerAccountSummary[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('name');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(0);
  const navigating = useRef(false);

  const load = useCallback(async () => {
    if (!token || !canUse) return;
    const serial = ++request.current;
    setError('');
    try {
      const result = await getAllCustomerAccounts(token);
      if (serial === request.current) setItems(result);
    } catch (e) {
      if (serial === request.current) setError(errorText(e, 'Sədərək müştəriləri alınmadı.'));
    } finally {
      if (serial === request.current) setLoading(false);
    }
  }, [token, canUse]);

  useFocusEffect(
    useCallback(() => {
      navigating.current = false;
      void load();
      return () => {
        request.current++;
      };
    }, [load]),
  );

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('az-AZ');
    const filtered = items.filter((c) => !query || c.customerName.toLocaleLowerCase('az-AZ').includes(query));
    return [...filtered].sort((a, b) =>
      sort === 'debt' ? b.remainingDebt - a.remainingDebt : a.customerName.localeCompare(b.customerName, 'az'),
    );
  }, [items, search, sort]);

  const totalOld = items.reduce((sum, c) => sum + c.oldDebt, 0);
  const totalDebt = items.reduce((sum, c) => sum + c.remainingDebt, 0);

  const open = (target: string) => {
    if (navigating.current) return;
    navigating.current = true;
    router.push(target as Href);
  };

  return (
    <AccountPageShell
      title="Sədərək müştəriləri"
      subtitle={items.length > 0 ? `${items.length} müştəri` : undefined}
      refreshing={loading}
      onRefresh={() => void load()}
    >
      {error ? <Notice tone="error">{error}</Notice> : null}
      <TileRow>
        <Tile label="Ümumi köhnə borc" value={money(totalOld)} tone={totalOld > 0 ? 'warn' : undefined} />
        <Tile label="Ümumi borc" value={money(totalDebt)} tone={totalDebt > 0 ? 'warn' : 'good'} />
      </TileRow>
      <Btn
        icon="storefront-outline"
        title="Yeni Sədərək müştərisi"
        onPress={() => open('/create-customer?shop=1')}
      />
      <TextField label="Müştəri axtar" value={search} onChangeText={setSearch} placeholder="Ad yazın" autoCorrect={false} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Chip label="Ada görə" selected={sort === 'name'} onPress={() => setSort('name')} />
        <Chip label="Borca görə" selected={sort === 'debt'} onPress={() => setSort('debt')} />
      </View>

      {loading && items.length === 0 ? (
        <Loading />
      ) : visible.length === 0 ? (
        <Notice>
          {items.length === 0
            ? 'Hələ Sədərək müştərisi yoxdur. “Yeni Sədərək müştərisi” ilə əlavə edin.'
            : 'Axtarışa uyğun müştəri yoxdur.'}
        </Notice>
      ) : (
        <Grid>
          {visible.map((customer) => (
            <Card
              key={customer.customerId}
              tone={customer.remainingDebt > 0 ? 'default' : 'done'}
              onPress={() => open(accountDestination('detail', customer.customerId))}
            >
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }} numberOfLines={2}>
                {customer.customerName}
              </Text>
              {!customer.isAccountCustomer ? (
                <Text style={{ color: colors.textLight, fontSize: 13 }}>Sədərək dükanı deyil · borcu qalıb</Text>
              ) : null}
              <Line label="Köhnə borc" value={money(customer.oldDebt)} />
              {customer.carriedDebt > 0 ? <Line label="Dünənki" value={money(customer.carriedDebt)} /> : null}
              {customer.todayDebt > 0 ? <Line label="Bu günkü" value={money(customer.todayDebt)} /> : null}
              {customer.advance > 0 ? <Line label="Avans" value={money(customer.advance)} tone="good" /> : null}
              <Line
                label="Cəmi borc"
                value={money(customer.remainingDebt)}
                strong
                tone={customer.remainingDebt > 0 ? 'warn' : 'good'}
              />
            </Card>
          ))}
        </Grid>
      )}
    </AccountPageShell>
  );
}
