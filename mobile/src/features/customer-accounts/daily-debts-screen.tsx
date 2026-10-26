import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Text, View } from 'react-native';

import {
  getAccountDay,
  getAllCustomerAccounts,
  saveDailyDebts,
} from '../../api/customer-account-api';
import { MoneyInput, TextField } from '../../components/form-inputs';
import { colors } from '../../theme';
import { dateLabel, todayKey } from './account-dates';
import {
  AccountPageShell,
  Btn,
  Card,
  Grid,
  Line,
  Loading,
  Notice,
  money,
} from './account-ui';
import { CustomerAccountSummary, DailyDebtItem } from './customer-account-types';
import { cleanMoneyInput, parseMoney } from './settlement-math';
import { errorText, useAccountSession } from './use-account-session';

/**
 * Step one of the day: write each customer's daily debt and press save. Only the daily debt
 * lives here; the old debt is written and corrected on the Sədərək customer page. Saving again
 * with the same numbers changes nothing, and a changed number posts only the difference.
 */
export default function DailyDebtsScreen() {
  const { token, canUse } = useAccountSession();
  const [customers, setCustomers] = useState<CustomerAccountSummary[]>([]);
  const [initial, setInitial] = useState<Record<string, string>>({});
  const [daily, setDaily] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const request = useRef(0);
  const busyLock = useRef(false);
  const today = todayKey();

  const load = useCallback(async () => {
    if (!token || !canUse) return;
    const serial = ++request.current;
    setError('');
    try {
      const [list, day] = await Promise.all([
        getAllCustomerAccounts(token),
        getAccountDay(token, todayKey()),
      ]);
      if (serial !== request.current) return;
      const written: Record<string, string> = {};
      for (const row of day.customers) {
        if (row.todayDebt > 0) written[row.customerId] = String(row.todayDebt);
      }
      setCustomers(list.filter((customer) => customer.isActive));
      setInitial(written);
      setDaily((current) => ({ ...written, ...onlyEdited(current, written) }));
    } catch (e) {
      if (serial === request.current) setError(errorText(e, 'Müştərilər alınmadı.'));
    } finally {
      if (serial === request.current) setLoading(false);
    }
  }, [token, canUse]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        request.current++;
      };
    }, [load]),
  );

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('az-AZ');
    return customers.filter((c) => !query || c.customerName.toLocaleLowerCase('az-AZ').includes(query));
  }, [customers, search]);

  const changes = useMemo(() => {
    const items: DailyDebtItem[] = [];
    let invalid: string | null = null;
    for (const customer of customers) {
      const id = customer.customerId;
      const typed = daily[id];
      if (typed === undefined) continue;
      const value = parseMoney(typed);
      if (value === null) {
        invalid = customer.customerName;
        continue;
      }
      if (value !== (parseMoney(initial[id] ?? '') ?? 0)) items.push({ customerId: id, dailyDebt: value });
    }
    return { items, invalid };
  }, [customers, daily, initial]);

  async function save() {
    if (busyLock.current || changes.items.length === 0) return;
    if (changes.invalid) {
      setError(`${changes.invalid}: məbləği düzgün yazın (məsələn 150,50).`);
      return;
    }
    busyLock.current = true;
    setBusy(true);
    setError('');
    setSaved('');
    try {
      await saveDailyDebts(token, changes.items);
      setSaved(`${changes.items.length} müştərinin borcu yadda saxlanıldı.`);
      await load();
    } catch (e) {
      setError(errorText(e, 'Borclar saxlanmadı.'));
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  }

  if (!canUse) {
    return (
      <AccountPageShell title="Günlük borclar">
        <Notice tone="error">Bu səhifəyə icazəniz yoxdur.</Notice>
      </AccountPageShell>
    );
  }

  const count = changes.items.length;

  return (
    <AccountPageShell
      title="Günlük borclar"
      subtitle={`${dateLabel(today)} · müştərilərin bugünkü borcu`}
      refreshing={loading}
      onRefresh={() => void load()}
      footer={
        <Btn
          icon="save-outline"
          title={count > 0 ? `Yadda saxla (${count})` : 'Yadda saxla'}
          onPress={() => void save()}
          disabled={count === 0}
          busy={busy}
        />
      }
    >
      <TextField
        label="Müştəri axtar"
        value={search}
        onChangeText={setSearch}
        placeholder="Ad yazın"
        autoCorrect={false}
      />
      {error ? <Notice tone="error">{error}</Notice> : null}
      {saved ? <Notice tone="success">{saved}</Notice> : null}
      {loading && customers.length === 0 ? (
        <Loading />
      ) : visible.length === 0 ? (
        <Notice>
          {customers.length === 0
            ? 'Açotda görünən müştəri yoxdur. Müştəri yaradarkən “Sədərək dükanı” seçimini işarələyin.'
            : 'Axtarışa uyğun müştəri yoxdur.'}
        </Notice>
      ) : (
        <Grid>
          {visible.map((customer) => {
            const id = customer.customerId;
            const typed = daily[id];
            const changed = typed !== undefined && typed !== (initial[id] ?? '');
            return (
              <Card key={id} tone={initial[id] ? 'done' : 'default'}>
                <View style={{ gap: 4 }}>
                  <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }} numberOfLines={2}>
                    {customer.customerName}
                  </Text>
                  <Line label="Köhnə borc" value={money(customer.oldDebt)} />
                  {customer.carriedDebt > 0 ? <Line label="Dünənki (sabaha saxlanılan)" value={money(customer.carriedDebt)} tone="warn" /> : null}
                </View>
                <MoneyInput
                  label={initial[id] ? 'Bugünkü günlük borc (yazılıb)' : 'Bugünkü günlük borc'}
                  value={typed ?? initial[id] ?? ''}
                  onChangeText={(value) => {
                    setSaved('');
                    setDaily((current) => ({ ...current, [id]: cleanMoneyInput(value) }));
                  }}
                  hint={changed ? 'Dəyişdi — yadda saxlayın' : undefined}
                />
              </Card>
            );
          })}
        </Grid>
      )}
    </AccountPageShell>
  );
}

/** Keeps what the user typed that differs from what the server holds. */
function onlyEdited(current: Record<string, string>, server: Record<string, string>) {
  const edited: Record<string, string> = {};
  for (const [id, value] of Object.entries(current)) {
    if (value !== (server[id] ?? '')) edited[id] = value;
  }
  return edited;
}
