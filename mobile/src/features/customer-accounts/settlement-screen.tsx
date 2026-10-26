import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { Href, router, useFocusEffect } from 'expo-router';
import { randomUUID } from 'expo-crypto';

import {
  completeSettlement,
  getAccountDay,
  getCustomerAccountDetails,
} from '../../api/customer-account-api';
import { getProductReturns } from '../../api/product-return-api';
import { MoneyInput, TextField } from '../../components/form-inputs';
import { ProductReturn } from '../product-returns/product-return-types';
import { colors } from '../../theme';
import { dateLabel, todayKey } from './account-dates';
import {
  AccountPageShell,
  Btn,
  Card,
  Chip,
  Line,
  Loading,
  Notice,
  SectionTitle,
  StatusMark,
  goBack,
  money,
} from './account-ui';
import { AccountDayCustomer, CustomerAccountDetails, SettlementRequest } from './customer-account-types';
import { parseMoney, previewSettlement } from './settlement-math';
import { errorText, useAccountSession } from './use-account-session';

/**
 * "Bu müştəri ilə açotu bitir": what the customer paid (cash, card or both), the return
 * and bonus that reduce the debt right now, and whether the unpaid daily debt stays for
 * tomorrow. The same screen serves a late payment after the customer was already finished.
 */
export default function SettlementScreen({ customerId }: { customerId: string }) {
  const { token, canUse } = useAccountSession();
  const [details, setDetails] = useState<CustomerAccountDetails | null>(null);
  const [row, setRow] = useState<AccountDayCustomer | null>(null);
  const [returns, setReturns] = useState<ProductReturn[]>([]);
  const [cash, setCash] = useState('');
  const [card, setCard] = useState('');
  const [bonus, setBonus] = useState('');
  const [showBonus, setShowBonus] = useState(false);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [carry, setCarry] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<SettlementRequest | null>(null);
  const [done, setDone] = useState(false);
  const operation = useRef<SettlementRequest | null>(null);
  const lock = useRef(false);
  const today = todayKey();

  const load = useCallback(async () => {
    if (!token || !customerId || !canUse) return;
    try {
      const [account, day, unused] = await Promise.all([
        getCustomerAccountDetails(token, customerId),
        getAccountDay(token, todayKey()),
        getProductReturns(token, { customerId, unapplied: true, pageSize: 100 }),
      ]);
      setDetails(account);
      setRow(day.customers.find((c) => c.customerId === customerId) ?? null);
      setReturns(unused.items);
      setChosen((current) => {
        const available = new Set(unused.items.map((r) => r.id));
        return Object.fromEntries(Object.entries(current).filter(([id]) => available.has(id)));
      });
    } catch (e) {
      setError(errorText(e, 'Müştərinin açotu alınmadı.'));
    }
  }, [token, customerId, canUse]);

  useFocusEffect(
    useCallback(() => {
      if (!done) void load();
    }, [load, done]),
  );

  const amounts = useMemo(() => {
    const cashValue = parseMoney(cash);
    const cardValue = parseMoney(card);
    const bonusValue = showBonus ? parseMoney(bonus) : 0;
    const picked = Object.entries(chosen).map(([returnId, text]) => ({ returnId, amount: parseMoney(text) }));
    const valid =
      cashValue !== null &&
      cardValue !== null &&
      bonusValue !== null &&
      picked.every((p) => p.amount !== null && p.amount > 0);
    if (!valid) return null;
    const returnTotal = picked.reduce((sum, p) => sum + (p.amount ?? 0), 0);
    return {
      cash: cashValue ?? 0,
      card: cardValue ?? 0,
      bonus: bonusValue ?? 0,
      returns: picked.map((p) => ({ returnId: p.returnId, amount: p.amount ?? 0 })),
      returnTotal,
      credit: Math.round(((cashValue ?? 0) + (cardValue ?? 0) + (bonusValue ?? 0) + returnTotal) * 100) / 100,
    };
  }, [cash, card, bonus, showBonus, chosen]);

  const balances = details
    ? { remainingOld: details.oldDebt, remainingCarried: details.carriedDebt, remainingToday: details.todayDebt }
    : null;
  const preview = balances && amounts ? previewSettlement(balances, amounts.credit, carry) : null;

  function edit(update: () => void) {
    setError('');
    update();
  }

  function toggleReturn(record: ProductReturn) {
    edit(() =>
      setChosen((current) => {
        if (record.id in current) {
          const { [record.id]: _removed, ...rest } = current;
          return rest;
        }
        return { ...current, [record.id]: record.amount > 0 ? String(record.amount) : '' };
      }),
    );
  }

  function confirmSave() {
    if (lock.current || !amounts) {
      setError('Məbləğləri düzgün yazın (məsələn 150,50).');
      return;
    }
    if (amounts.credit === 0) {
      Alert.alert(
        'Ödəniş yazılmayıb',
        'Müştəri ilə açot pul olmadan bitirilsin?',
        [
          { text: 'Xeyr', style: 'cancel' },
          { text: 'Bəli, bitir', onPress: () => void save() },
        ],
      );
      return;
    }
    void save();
  }

  async function save() {
    if (lock.current || !token || !amounts) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      // The same operation id is reused on retry, so a lost response never posts twice.
      operation.current ??= {
        operationId: randomUUID(),
        customerId,
        cash: amounts.cash,
        card: amounts.card,
        bonus: amounts.bonus,
        returns: amounts.returns,
        carryToTomorrow: carry,
        note: note.trim() || null,
      };
      setReceipt(operation.current);
      setDetails(await completeSettlement(token, operation.current));
      setDone(true);
    } catch (e) {
      const status = e instanceof Error && 'statusCode' in e ? Number((e as { statusCode: unknown }).statusCode) : 0;
      if (status >= 400 && status < 500 && status !== 408) {
        operation.current = null;
        setReceipt(null);
      }
      setError(errorText(e, 'Açot tamamlanmadı.'));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function newReturn() {
    router.push({
      pathname: '/create-return',
      params: { customerId, customerName: details?.customerName ?? '' },
    } as Href);
  }

  if (!canUse) {
    return (
      <AccountPageShell title="Müştəri açotu">
        <Notice tone="error">Bu səhifəyə icazəniz yoxdur.</Notice>
      </AccountPageShell>
    );
  }

  if (!details || !balances) {
    return (
      <AccountPageShell title="Müştəri açotu">
        {error ? <Notice tone="error">{error}</Notice> : <Loading />}
      </AccountPageShell>
    );
  }

  const locked = busy || Boolean(receipt && !done);

  if (done && receipt) {
    return (
      <AccountPageShell title="Açot bitdi" subtitle={`${details.customerName} · ${dateLabel(today)}`} hideBack>
        <Card tone="done">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <StatusMark done />
            <Text style={{ flex: 1, color: colors.text, fontSize: 18, fontWeight: '700' }}>
              {details.customerName}
            </Text>
          </View>
          {receipt.cash > 0 ? <Line label="Nağd" value={money(receipt.cash)} /> : null}
          {receipt.card > 0 ? <Line label="Kart" value={money(receipt.card)} /> : null}
          <Line label="Alınan pul" value={money(receipt.cash + receipt.card)} strong tone="good" />
          {receipt.returns.length > 0 ? (
            <Line label="Vazvrat" value={money(receipt.returns.reduce((s, r) => s + r.amount, 0))} />
          ) : null}
          {receipt.bonus > 0 ? <Line label="Bonus" value={money(receipt.bonus)} /> : null}
          <Line label="Köhnə borc" value={money(details.oldDebt)} />
          {details.carriedDebt > 0 ? <Line label="Dünənki (sabaha saxlanılan)" value={money(details.carriedDebt)} /> : null}
          <Line label="Bu günkü günlük" value={money(details.todayDebt)} />
          {details.advance > 0 ? <Line label="Avans" value={money(details.advance)} tone="good" /> : null}
          <Line label="Qalan borc" value={money(details.remainingDebt)} strong tone={details.remainingDebt > 0 ? 'warn' : 'good'} />
          {receipt.carryToTomorrow && details.todayDebt > 0 ? (
            <Text style={{ color: colors.warning }}>Bu günkü borc sabaha saxlanıldı.</Text>
          ) : null}
        </Card>
        <Btn title="Siyahıya qayıt" onPress={() => goBack('/account/collect')} />
      </AccountPageShell>
    );
  }

  return (
    <AccountPageShell
      title={details.customerName}
      subtitle={`${dateLabel(today)} · açotu bitir`}
      footer={
        <Btn
          icon="checkmark-circle-outline"
          variant="success"
          title="Müştəri ilə açotu bitir"
          onPress={confirmSave}
          busy={busy}
          disabled={!amounts}
        />
      }
    >
      {row?.isDone ? (
        <Notice tone="success">
          Bu müştəri bu gün artıq bitirilib (+). Gec gələn pulu və ya yeni borcu yazmaq olar.
        </Notice>
      ) : null}

      <Card>
        <SectionTitle>Borc</SectionTitle>
        <Line label="Köhnə borc" value={money(details.oldDebt)} />
        {details.carriedDebt > 0 ? (
          <Line label="Dünənki (sabaha saxlanılan)" value={money(details.carriedDebt)} />
        ) : null}
        <Line label="Bu günkü günlük" value={money(details.todayDebt)} />
        <Line label="Cəmi ödənməli" value={money(details.remainingDebt)} strong tone={details.remainingDebt > 0 ? 'warn' : 'good'} />
        {details.advance > 0 ? <Line label="Avans (artıq verilib)" value={money(details.advance)} tone="good" /> : null}
      </Card>

      <Card>
        <SectionTitle>Alınan pul</SectionTitle>
        <MoneyInput label="Nağd" value={cash} onChangeText={(v) => edit(() => setCash(v))} editable={!locked} />
        <MoneyInput label="Kart" value={card} onChangeText={(v) => edit(() => setCard(v))} editable={!locked} />
      </Card>

      <Card>
        <SectionTitle>Vazvrat</SectionTitle>
        {returns.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>Bu müştəri üçün borca tətbiq olunmamış vazvrat yoxdur.</Text>
        ) : (
          returns.map((record) => {
            const selected = record.id in chosen;
            return (
              <View key={record.id} style={{ gap: 8 }}>
                <Chip
                  selected={selected}
                  onPress={() => !locked && toggleReturn(record)}
                  label={`${selected ? '✓ ' : ''}${dateLabel(record.returnDateUtc.slice(0, 10))} · ${record.items
                    .map((i) => `${i.productCode}/${i.batchNumber}`)
                    .join(', ')}`}
                />
                {selected ? (
                  <MoneyInput
                    label="Vazvratın məbləği (borcdan çıxılır)"
                    value={chosen[record.id]}
                    onChangeText={(v) => edit(() => setChosen((current) => ({ ...current, [record.id]: v })))}
                    editable={!locked}
                  />
                ) : null}
              </View>
            );
          })
        )}
        <Btn icon="add" variant="secondary" title="Yeni vazvrat yarat" onPress={newReturn} disabled={locked} />
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <SectionTitle>Bonus</SectionTitle>
          <Switch
            value={showBonus}
            onValueChange={(v) => edit(() => setShowBonus(v))}
            disabled={locked}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
        {showBonus ? (
          <MoneyInput label="Bonus məbləği (borcdan çıxılır)" value={bonus} onChangeText={(v) => edit(() => setBonus(v))} editable={!locked} />
        ) : null}
      </Card>

      <Card tone={carry ? 'warning' : 'default'}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>Günlük borcu sabaha saxla</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
              {carry
                ? 'Bu günkü ödənilməyən borc sabah siyahıda “dünənki” kimi görünəcək. Dünənki saxlanılan borc isə köhnəyə qatılır.'
                : 'Ödənilməyən günlük borc köhnə borca keçəcək.'}
            </Text>
          </View>
          <Switch
            value={carry}
            onValueChange={(v) => edit(() => setCarry(v))}
            disabled={locked}
            trackColor={{ true: colors.warning, false: colors.border }}
          />
        </View>
      </Card>

      <TextField label="Qeyd (istəyə görə)" value={note} onChangeText={(v) => edit(() => setNote(v))} maxLength={400} editable={!locked} />

      {preview ? (
        <Card>
          <SectionTitle>Nəticə</SectionTitle>
          <Line label="Borcdan çıxılır" value={money(preview.credit)} />
          {preview.paidFromToday > 0 ? <Line label="· bu günkü borcdan" value={money(preview.paidFromToday)} /> : null}
          {preview.paidFromCarried > 0 ? <Line label="· dünənki borcdan" value={money(preview.paidFromCarried)} /> : null}
          {preview.paidFromOld > 0 ? <Line label="· köhnə borcdan" value={money(preview.paidFromOld)} /> : null}
          {preview.advance > 0 ? <Line label="Avans kimi qalır" value={money(preview.advance)} tone="good" /> : null}
          {preview.remainingToday > 0 ? (
            <Line
              label={carry ? 'Sabaha “dünənki” kimi qalır' : 'Köhnə borca keçir'}
              value={money(preview.remainingToday)}
              tone="warn"
            />
          ) : null}
          {preview.remainingCarried > 0 ? (
            <Line label="Dünənki ödənilməyən köhnəyə qatılır" value={money(preview.remainingCarried)} tone="warn" />
          ) : null}
          <Line label="Qalan köhnə borc" value={money(preview.finalOld)} />
          {preview.finalCarried > 0 ? <Line label="Sabaha saxlanılan" value={money(preview.finalCarried)} /> : null}
          <Line
            label="Qalan borc cəmi"
            value={money(preview.finalOld + preview.finalCarried)}
            strong
            tone={preview.finalOld + preview.finalCarried > 0 ? 'warn' : 'good'}
          />
        </Card>
      ) : null}

      {error ? <Notice tone="error">{error}</Notice> : null}
      {receipt && !done ? (
        <Notice>Cavab alınmayıbsa, yenidən basın. Əməliyyat ikinci dəfə yazılmayacaq.</Notice>
      ) : null}
    </AccountPageShell>
  );
}
