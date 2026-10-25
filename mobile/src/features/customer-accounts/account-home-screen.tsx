import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { Href, router, useFocusEffect } from 'expo-router';

import { closeAccountDay, getAccountDay, startAccountDay } from '../../api/customer-account-api';
import { AppUpdateBanner } from '../../components/app-update-banner';
import { AccountDay } from './customer-account-types';
import { dateLabel, todayKey } from './account-dates';
import { accountDestination } from './account-navigation';
import {
  AccountPageShell,
  Btn,
  Card,
  Grid,
  Loading,
  Notice,
  Tile,
  TileRow,
  money,
} from './account-ui';
import { errorText, useAccountSession } from './use-account-session';

const stateText = {
  notStarted: 'Başlanmayıb',
  open: 'Davam edir',
  closed: 'Bitirilib',
} as const;

/** The Açot tab: today's date, the day's state, the three main actions and the totals. */
export default function AccountHomeScreen() {
  const { token, canUse, isAdmin } = useAccountSession();
  const [day, setDay] = useState<AccountDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
      if (serial === request.current) setError(errorText(e, 'Açot məlumatı alınmadı.'));
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

  const open = (target: Href) => {
    if (navigating.current) return;
    navigating.current = true;
    router.push(target);
  };

  async function startOrContinue() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (!day || day.state === 'notStarted') setDay(await startAccountDay(token));
      open(accountDestination('daily') as Href);
    } catch (e) {
      setError(errorText(e, 'Açot başlamadı.'));
    } finally {
      setBusy(false);
    }
  }

  function confirmClose() {
    Alert.alert(
      `${dateLabel(today)} açotu bitirilsin?`,
      'Yekun hazırlanır. Bitəndən sonra sifariş gəlsə, müştəri üçün yenidən pul yaza bilərsiniz.',
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
      setDay(await closeAccountDay(token));
      open(accountDestination('report', undefined, today) as Href);
    } catch (e) {
      setError(errorText(e, 'Açot bitirilmədi.'));
    } finally {
      setBusy(false);
    }
  }

  if (!canUse) {
    return (
      <AccountPageShell title="Açot" hideBack>
        <Notice tone="error">Açota yalnız admin, açot operatoru və sürücü daxil ola bilər.</Notice>
      </AccountPageShell>
    );
  }

  const state = day?.state ?? 'notStarted';
  const started = state !== 'notStarted';

  return (
    <AccountPageShell
      title="Açot"
      subtitle={`${dateLabel(today)} · ${stateText[state]}`}
      hideBack
      refreshing={loading}
      onRefresh={() => void load()}
    >
      <AppUpdateBanner />
      {error ? <Notice tone="error">{error}</Notice> : null}
      {loading && !day ? (
        <Loading />
      ) : (
        <>
          <Grid>
            <Btn
              icon={started ? 'create-outline' : 'play'}
              title={started ? 'Günlük borcları yaz' : `${dateLabel(today)} açota başla`}
              onPress={() => void startOrContinue()}
              busy={busy}
            />
            <Btn
              icon="cash-outline"
              variant="success"
              title="Pul yığımına başla"
              onPress={() => open(accountDestination('collect') as Href)}
              disabled={busy}
            />
          </Grid>

          {started && day ? (
            <>
              <TileRow>
                <Tile label="Yığılan pul" value={money(day.collected)} tone="good" />
                <Tile label="Nağd" value={money(day.cash)} />
                <Tile label="Kart" value={money(day.card)} />
              </TileRow>
              <TileRow>
                <Tile label="Bitirilən müştəri" value={`${day.doneCount} / ${day.customerCount}`} />
                <Tile label="Bugünkü yeni borc" value={money(day.newDailyDebt)} />
                {day.returnCredit > 0 ? <Tile label="Vazvrat" value={money(day.returnCredit)} /> : null}
                {day.bonus > 0 ? <Tile label="Bonus" value={money(day.bonus)} /> : null}
              </TileRow>
            </>
          ) : (
            <Card>
              <Notice>
                Əvvəlcə açota başlayın: müştərilərin günlük borcunu yazın. Sonra pul yığımına keçib hər müştəri ilə açotu
                bitirin.
              </Notice>
            </Card>
          )}

          {started ? (
            <Btn
              icon="checkmark-done"
              variant={state === 'closed' ? 'secondary' : 'primary'}
              title={state === 'closed' ? 'Yekunu göstər' : `${dateLabel(today)} açotunu bitir`}
              onPress={state === 'closed' ? () => open(accountDestination('report', undefined, today) as Href) : confirmClose}
              busy={busy}
            />
          ) : null}
          {state === 'closed' && day ? (
            <Notice tone="success">
              Bitirilib{day.closedByFullName ? ` · ${day.closedByFullName}` : ''}. Yeni sifariş gəlsə, müştəri üçün pul
              yazın; açot avtomatik yenidən açılır, sonra yenə bitirin.
            </Notice>
          ) : null}

          <Grid>
            <Btn
              icon="time-outline"
              variant="secondary"
              title="Tarixçə"
              onPress={() => open(accountDestination('reports') as Href)}
            />
            {isAdmin ? (
              <Btn
                icon="storefront-outline"
                variant="secondary"
                title="Müştərilər"
                onPress={() => open('/customers' as Href)}
              />
            ) : null}
          </Grid>
        </>
      )}
    </AccountPageShell>
  );
}
