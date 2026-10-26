import { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Href, router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { getAccountDay } from '../../api/customer-account-api';
import { colors } from '../../theme';
import { dateLabel, todayKey } from './account-dates';
import { accountDestination, isBusinessDate, singleAccountParam } from './account-navigation';
import {
  AccountPageShell,
  Btn,
  Card,
  SectionTitle,
  Line,
  Loading,
  Notice,
  StatusMark,
  Tile,
  TileRow,
  money,
} from './account-ui';
import { AccountDay, AccountDayCustomer } from './customer-account-types';
import { errorText, useAccountSession } from './use-account-session';

/**
 * The yekun of one day: for every customer the old debt, the daily debt, what was paid
 * (cash/card), any return or bonus and the debt that remains, with the day's totals on top.
 */
export default function DayReportScreen() {
  const { token, canUse } = useAccountSession();
  const params = useLocalSearchParams<{ date?: string | string[] }>();
  const requested = singleAccountParam(params.date) ?? todayKey();
  const [day, setDay] = useState<AccountDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(0);
  // Everyone who paid stays on top as before; those who paid nothing go to the bottom, in red.
  const payers = (day?.customers ?? []).filter((customer) => customer.paid > 0);
  const nonPayers = (day?.customers ?? []).filter((customer) => customer.paid === 0);

  const load = useCallback(async () => {
    if (!token || !canUse) return;
    if (!isBusinessDate(requested)) {
      setError('Düzgün tarix seçin.');
      setLoading(false);
      return;
    }
    const serial = ++request.current;
    setError('');
    try {
      const result = await getAccountDay(token, requested);
      if (serial === request.current) setDay(result);
    } catch (e) {
      if (serial === request.current) setError(errorText(e, 'Yekun alınmadı.'));
    } finally {
      if (serial === request.current) setLoading(false);
    }
  }, [token, canUse, requested]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        request.current++;
      };
    }, [load]),
  );

  return (
    <AccountPageShell
      title={`${dateLabel(requested)} yekun`}
      subtitle={
        day
          ? day.state === 'closed'
            ? `Bitirilib${day.closedByFullName ? ` · ${day.closedByFullName}` : ''}`
            : day.isLocked
              ? 'Gün keçib, dəyişdirilə bilməz'
              : 'Gün davam edir'
          : undefined
      }
      refreshing={loading}
      onRefresh={() => void load()}
    >
      {error ? <Notice tone="error">{error}</Notice> : null}
      {loading && !day ? (
        <Loading />
      ) : day ? (
        <>
          <TileRow>
            <Tile label="Yığılan pul" value={money(day.collected)} tone="good" />
            <Tile label="Nağd alınan" value={money(day.cash)} />
            <Tile label="Kartla alınan" value={money(day.card)} />
          </TileRow>
          {day.returnCredit > 0 || day.bonus > 0 ? (
            <TileRow>
              {day.returnCredit > 0 ? <Tile label="Vazvrat (borcdan çıxıldı)" value={money(day.returnCredit)} /> : null}
              {day.bonus > 0 ? <Tile label="Bonus (borcdan çıxıldı)" value={money(day.bonus)} /> : null}
            </TileRow>
          ) : null}

          {day.customers.length === 0 ? (
            <Notice>Bu gün üçün müştəri qeydi yoxdur.</Notice>
          ) : (
            <View style={{ gap: 12 }}>
              {payers.map((customer) => (
                <ReportCard key={customer.customerId} customer={customer} />
              ))}
              {nonPayers.length > 0 ? (
                <>
                  <SectionTitle>Pul ödəməyənlər ({nonPayers.length})</SectionTitle>
                  {nonPayers.map((customer) => (
                    <ReportCard key={customer.customerId} customer={customer} />
                  ))}
                </>
              ) : null}
            </View>
          )}

          {day.isToday ? (
            <Btn
              icon="cash-outline"
              variant="secondary"
              title="Pul yığımına qayıt"
              onPress={() => router.push(accountDestination('collect') as Href)}
            />
          ) : null}
        </>
      ) : null}
    </AccountPageShell>
  );
}

function ReportCard({ customer }: { customer: AccountDayCustomer }) {
  const unpaid = customer.paid === 0;
  return (
    <Card tone={unpaid ? 'bad' : customer.isDone ? 'done' : 'default'}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <StatusMark done={customer.isDone} />
        <Text style={{ flex: 1, color: colors.text, fontSize: 18, fontWeight: '700' }} numberOfLines={2}>
          {customer.customerName}
        </Text>
        {unpaid ? <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '700' }}>Ödəməyib</Text> : null}
      </View>
      <Line label="Köhnə" value={money(customer.oldDebt)} />
      {customer.carriedDebt > 0 ? <Line label="Dünənki" value={money(customer.carriedDebt)} /> : null}
      <Line label="Bu günkü" value={money(customer.todayDebt)} />
      <Line
        label={`Ödədi${customer.cash > 0 && customer.card > 0 ? ' (nağd + kart)' : customer.card > 0 ? ' (kart)' : ''}`}
        value={money(customer.paid)}
        tone={customer.paid > 0 ? 'good' : 'bad'}
      />
      {customer.returnCredit > 0 ? <Line label="Vazvrat" value={money(customer.returnCredit)} /> : null}
      {customer.bonus > 0 ? <Line label="Bonus" value={money(customer.bonus)} /> : null}
      <Line label="Qalan borc" value={money(customer.remaining)} strong tone={customer.remaining > 0 ? (unpaid ? 'bad' : 'warn') : 'good'} />
      {customer.carryToTomorrow ? (
        <Text style={{ color: colors.warning, fontSize: 14 }}>Bu günkü borc sabaha saxlanılıb</Text>
      ) : null}
    </Card>
  );
}
