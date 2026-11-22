import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { getHandoverDay, type HandoverDay } from '../../api/handover-api';
import { useAuth } from '../../auth/auth-context';
import { colors } from '../../theme';
import { dateLabel, todayKey } from '../customer-accounts/account-dates';
import { HandoverCard } from './handover-card';

const shiftDay = (date: string, delta: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
};

/**
 * One day's handovers. Every day starts as an empty sheet; earlier days are one tap away.
 * `mine`: only the signed-in user's own (driver side, no notifications).
 */
export function HandoverList({ mine, initialDate, focusId }: { mine: boolean; initialDate?: string; focusId?: string }) {
  const { session } = useAuth();
  const token = session?.accessToken ?? '';
  const userId = session?.userId ?? '';
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 32, 560);
  const today = todayKey();
  const [date, setDate] = useState(initialDate && initialDate <= today ? initialDate : today);
  const [day, setDay] = useState<HandoverDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(0);

  const load = useCallback(async () => {
    if (!token) return;
    const serial = ++request.current;
    setLoading(true);
    setError('');
    try {
      const result = await getHandoverDay(token, date, mine);
      if (serial === request.current) setDay(result);
    } catch (e) {
      if (serial === request.current) setError(e instanceof Error ? e.message : 'Təhvillər alınmadı.');
    } finally {
      if (serial === request.current) setLoading(false);
    }
  }, [token, date, mine]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const isToday = date === today;
  const items = day?.date === date ? day.items : [];

  return (
    <View style={styles.wrap}>
      <View style={styles.dateBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Əvvəlki gün" onPress={() => setDate(shiftDay(date, -1))} style={styles.arrow}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <View style={styles.dateMid}>
          <Text style={styles.dateText}>{dateLabel(date)}</Text>
          <Text style={styles.dateSub}>{isToday ? 'Bu gün' : 'Keçmiş gün'}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Növbəti gün"
          disabled={isToday}
          onPress={() => setDate(shiftDay(date, 1))}
          style={[styles.arrow, isToday && { opacity: 0.3 }]}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </Pressable>
      </View>
      {!isToday ? (
        <Pressable accessibilityRole="button" onPress={() => setDate(today)} style={styles.todayLink}>
          <Text style={styles.todayText}>Bu günə qayıt</Text>
        </Pressable>
      ) : null}

      {error ? (
        <Pressable onPress={() => void load()}>
          <Text style={styles.error}>{error} · Yenidən sına</Text>
        </Pressable>
      ) : null}

      {loading && !day ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : items.length === 0 && !error ? (
        <View style={styles.empty}>
          <Ionicons name="cube-outline" size={40} color={colors.textLight} />
          <Text style={styles.emptyText}>{isToday ? 'Bu gün hələ təhvil yoxdur.' : 'Bu gün təhvil olmayıb.'}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.count}>
            {items.length} təhvil · {items.reduce((sum, h) => sum + h.photos.length, 0)} şəkil
          </Text>
          {items.map((handover) => (
            <HandoverCard
              key={handover.id}
              handover={handover}
              token={token}
              userId={userId}
              width={cardWidth}
              highlighted={handover.id === focusId}
              onChanged={() => void load()}
            />
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  arrow: { width: 52, height: 56, alignItems: 'center', justifyContent: 'center' },
  dateMid: { flex: 1, alignItems: 'center' },
  dateText: { color: colors.text, fontSize: 18, fontWeight: '700' },
  dateSub: { color: colors.textLight, fontSize: 13 },
  todayLink: { alignSelf: 'center', paddingVertical: 4 },
  todayText: { color: colors.primary, fontWeight: '700' },
  error: { color: colors.danger },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
  count: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
