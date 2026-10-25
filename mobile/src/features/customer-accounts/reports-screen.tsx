import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Href, router, useFocusEffect } from 'expo-router';

import { getAccountHistory, getAllCustomerAccounts } from '../../api/customer-account-api';
import { TextField } from '../../components/form-inputs';
import { colors } from '../../theme';
import { dateLabel, monthKey, monthLabel, shiftMonth, todayKey } from './account-dates';
import { accountDestination } from './account-navigation';
import {
  AccountPageShell,
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
import { AccountHistoryMonth, CustomerAccountSummary } from './customer-account-types';
import { errorText, useAccountSession } from './use-account-session';

type View_ = 'days' | 'customers';

/** History: one month at a time, by day (with the cash/card totals) or by customer. */
export default function ReportsScreen() {
  const { token, canUse } = useAccountSession();
  const [month, setMonth] = useState(monthKey(todayKey()));
  const [mode, setMode] = useState<View_>('days');
  const [history, setHistory] = useState<AccountHistoryMonth | null>(null);
  const [customers, setCustomers] = useState<CustomerAccountSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(0);
  const navigating = useRef(false);
  const currentMonth = monthKey(todayKey());

  const load = useCallback(async () => {
    if (!token || !canUse) return;
    const serial = ++request.current;
    setLoading(true);
    setError('');
    try {
      const [result, list] = await Promise.all([
        getAccountHistory(token, month),
        mode === 'customers' ? getAllCustomerAccounts(token) : Promise.resolve(null),
      ]);
      if (serial !== request.current) return;
      setHistory(result);
      if (list) setCustomers(list);
    } catch (e) {
      if (serial === request.current) setError(errorText(e, 'Tarixçə alınmadı.'));
    } finally {
      if (serial === request.current) setLoading(false);
    }
  }, [token, canUse, month, mode]);

  useFocusEffect(
    useCallback(() => {
      navigating.current = false;
      void load();
      return () => {
        request.current++;
      };
    }, [load]),
  );

  const open = (target: string) => {
    if (navigating.current) return;
    navigating.current = true;
    router.push(target as Href);
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('az-AZ');
    return customers.filter((c) => !query || c.customerName.toLocaleLowerCase('az-AZ').includes(query));
  }, [customers, search]);

  return (
    <AccountPageShell
      title="Tarixçə"
      subtitle={monthLabel(month)}
      refreshing={loading}
      onRefresh={() => void load()}
    >
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Chip label="‹ Əvvəlki ay" onPress={() => setMonth(shiftMonth(month, -1))} />
        <View style={{ flex: 1 }} />
        <Chip
          label="Sonrakı ay ›"
          onPress={() => month < currentMonth && setMonth(shiftMonth(month, 1))}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Chip label="Günlərə görə" selected={mode === 'days'} onPress={() => setMode('days')} />
        <Chip label="Müştərilərə görə" selected={mode === 'customers'} onPress={() => setMode('customers')} />
      </View>

      {error ? <Notice tone="error">{error}</Notice> : null}

      {history ? (
        <TileRow>
          <Tile label="Ayda yığılan" value={money(history.collected)} tone="good" />
          <Tile label="Nağd" value={money(history.cash)} />
          <Tile label="Kart" value={money(history.card)} />
        </TileRow>
      ) : null}

      {loading && !history ? (
        <Loading />
      ) : mode === 'days' ? (
        history && history.days.length > 0 ? (
          <Grid>
            {history.days.map((day) => (
              <Card key={day.businessDate} onPress={() => open(accountDestination('report', undefined, day.businessDate))}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: colors.text, fontSize: 19, fontWeight: '700' }}>{dateLabel(day.businessDate)}</Text>
                  <Text style={{ color: day.closed ? colors.success : colors.warning, fontSize: 14 }}>
                    {day.closed ? 'Bitirilib' : 'Bitirilməyib'}
                  </Text>
                </View>
                <Line label="Yığılan pul" value={money(day.collected)} strong tone="good" />
                <Line label="Nağd" value={money(day.cash)} />
                <Line label="Kart" value={money(day.card)} />
                <Line label="Müştəri" value={String(day.customerCount)} />
              </Card>
            ))}
          </Grid>
        ) : (
          <Notice>Bu ayda açot qeydi yoxdur.</Notice>
        )
      ) : (
        <>
          <TextField label="Müştəri axtar" value={search} onChangeText={setSearch} placeholder="Ad yazın" autoCorrect={false} />
          <Grid>
            {filtered.map((customer) => (
              <Pressable
                key={customer.customerId}
                accessibilityRole="button"
                onPress={() => open(accountDestination('detail', customer.customerId))}
              >
                <Card>
                  <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }} numberOfLines={2}>
                    {customer.customerName}
                  </Text>
                  <Line label="Qalan borc" value={money(customer.remainingDebt)} tone={customer.remainingDebt > 0 ? 'warn' : 'good'} />
                </Card>
              </Pressable>
            ))}
          </Grid>
        </>
      )}
    </AccountPageShell>
  );
}
