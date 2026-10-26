import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { Href, router, useFocusEffect } from 'expo-router';

import { closeAccountDay, getAccountDay } from '../../api/customer-account-api';
import AccountCustomerPicker from './account-customer-picker';
import { dateLabel, todayKey } from './account-dates';
import { accountDestination } from './account-navigation';
import {
  AccountPageShell,
  Btn,
  Card,
  Grid,
  CompactHead,
  Pairs,
  compactCardStyle,
  moneyShort,
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
 * Step two of the day: the customers of today, each marked "−" until the açot is finished
 * with them. Tapping one opens the payment window; a finished customer turns green and "+".
 */
export default function CollectScreen() {
  const { token, canUse } = useAccountSession();
  const [day, setDay] = useState<AccountDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [picker, setPicker] = useState(false);
  const request = useRef(0);
  const navigating = useRef(false);
  const today = todayKey();

  const load = useCallback(async () => {
    if (!token || !canUse) return;
    const serial = ++request.current;
    setError('');
    try {
      const result = await getAccountDay(token, todayKey());
      if (serial === request.current) setDay(result);
    } catch (e) {
      if (serial === request.current) setError(errorText(e, 'Yığım siyahısı alınmadı.'));
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

  const openCustomer = (customerId: string) => {
    if (navigating.current) return;
    navigating.current = true;
    setPicker(false);
    router.push(accountDestination('settle', customerId) as Href);
  };

  function confirmClose() {
    const pending = day ? day.customerCount - day.doneCount : 0;
    Alert.alert(
      `${dateLabel(today)} açotu bitirilsin?`,
      pending > 0
        ? `${pending} müştəri ilə açot hələ bitirilməyib (−). Yenə də günü bitirmək istəyirsiniz?`
        : 'Yekun hazırlanacaq.',
      [
        { text: 'Xeyr', style: 'cancel' },
        { text: 'Bitir', onPress: () => void closeDay() },
      ],
    );
  }

  async function closeDay() {
    setBusy(true);
    setError('');
    try {
      await closeAccountDay(token);
      router.replace(accountDestination('report', undefined, today) as Href);
    } catch (e) {
      setError(errorText(e, 'Açot bitirilmədi.'));
    } finally {
      setBusy(false);
    }
  }

  if (!canUse) {
    return (
      <AccountPageShell title="Pul yığımı">
        <Notice tone="error">Bu səhifəyə icazəniz yoxdur.</Notice>
      </AccountPageShell>
    );
  }

  return (
    <AccountPageShell
      title="Pul yığımı"
      subtitle={`${dateLabel(today)} · ${day ? `${day.doneCount} / ${day.customerCount} müştəri bitdi` : ''}`}
      refreshing={loading}
      onRefresh={() => void load()}
      footer={
        <Btn
          icon="checkmark-done"
          variant={day?.state === 'closed' ? 'secondary' : 'primary'}
          title={day?.state === 'closed' ? 'Yekunu göstər' : `${dateLabel(today)} açotunu bitir`}
          onPress={
            day?.state === 'closed'
              ? () => router.push(accountDestination('report', undefined, today) as Href)
              : confirmClose
          }
          busy={busy}
          disabled={!day}
        />
      }
    >
      {error ? <Notice tone="error">{error}</Notice> : null}
      {day ? (
        <TileRow>
          <Tile label="Yığılan pul" value={money(day.collected)} tone="good" />
          <Tile label="Nağd" value={money(day.cash)} />
          <Tile label="Kart" value={money(day.card)} />
        </TileRow>
      ) : null}

      {loading && !day ? (
        <Loading />
      ) : day && day.customers.length === 0 ? (
        <Notice>
          Bu gün üçün müştəri yoxdur. Əvvəlcə “Günlük borclar” səhifəsində müştərilərin borcunu yazın və ya aşağıdan
          müştəri əlavə edin.
        </Notice>
      ) : (
        <Grid>
          {(day?.customers ?? []).map((customer) => (
            <CustomerCard key={customer.customerId} customer={customer} onPress={() => openCustomer(customer.customerId)} />
          ))}
        </Grid>
      )}

      <Btn icon="person-add-outline" variant="secondary" title="Müştəri əlavə et" onPress={() => setPicker(true)} />
      {day?.state === 'closed' ? (
        <Notice tone="success">
          Açot bitirilib. Müştəri sonradan sifariş verərsə, onu seçib pulunu yazın; gün avtomatik yenidən açılır.
        </Notice>
      ) : null}

      <AccountCustomerPicker
        visible={picker}
        token={token}
        excludeIds={(day?.customers ?? []).map((c) => c.customerId)}
        onClose={() => setPicker(false)}
        onSelect={(customer) => openCustomer(customer.customerId)}
      />
    </AccountPageShell>
  );
}

function CustomerCard({ customer, onPress }: { customer: AccountDayCustomer; onPress: () => void }) {
  const method = customer.cash > 0 && customer.card > 0 ? ' (nağd+kart)' : customer.card > 0 ? ' (kart)' : '';
  return (
    <Card tone={customer.isDone ? 'done' : 'default'} onPress={onPress} style={compactCardStyle}>
      <CompactHead
        leading={<StatusMark done={customer.isDone} small />}
        title={customer.customerName}
        amount={moneyShort(customer.due)}
        amountTone={customer.due > 0 ? 'warn' : 'good'}
      />
      <Pairs
        items={[
          { label: 'Köhnə', value: moneyShort(customer.oldDebt) },
          customer.carriedDebt > 0 && { label: 'Dünənki', value: moneyShort(customer.carriedDebt), tone: 'warn' },
          { label: 'Bu günkü', value: moneyShort(customer.todayDebt) },
        ]}
      />
      {customer.isDone || customer.paid > 0 || customer.bonus > 0 || customer.returnCredit > 0 ? (
        <Pairs
          items={[
            customer.paid > 0 && { label: `Ödədi${method}`, value: moneyShort(customer.paid), tone: 'good' },
            customer.returnCredit > 0 && { label: 'Vazvrat', value: moneyShort(customer.returnCredit) },
            customer.bonus > 0 && { label: 'Bonus', value: moneyShort(customer.bonus) },
            { label: 'Qalan', value: moneyShort(customer.remaining), tone: customer.remaining > 0 ? 'warn' : 'good' },
            customer.carryToTomorrow && { label: 'Sabaha saxlanılıb', value: '✓', tone: 'warn' },
          ]}
        />
      ) : null}
    </Card>
  );
}
