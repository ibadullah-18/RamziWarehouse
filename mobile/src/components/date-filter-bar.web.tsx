import { Ionicons } from '@expo/vector-icons';
import type {
  ChangeEvent,
  CSSProperties,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  formatDateKey,
  getTodayDateKey,
  shiftDateKey,
} from '../features/dates/date-filter';
import {
  colors,
  fontSize,
  radius,
  spacing,
} from '../theme';

type DateFilterBarProps = {
  dateKey: string;
  onDateChange: (dateKey: string) => void;
};

const webDateInputStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  height: 24,
  padding: 0,
  border: 'none',
  outline: 'none',
  backgroundColor: 'transparent',
  color: colors.text,
  fontSize: 14,
  fontWeight: '700',
  fontFamily: 'inherit',
  cursor: 'pointer',
};

export function DateFilterBar({
  dateKey,
  onDateChange,
}: DateFilterBarProps) {
  const todayDateKey = getTodayDateKey();
  const isToday = dateKey === todayDateKey;

  function handleDateChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedDateKey =
      event.currentTarget.value;

    if (!selectedDateKey) {
      return;
    }

    onDateChange(selectedDateKey);
  }

  return (
    <View style={styles.container}>
      <View style={styles.dateRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Əvvəlki gün"
          hitSlop={8}
          onPress={() => {
            onDateChange(
              shiftDateKey(dateKey, -1),
            );
          }}
          style={({ pressed }) => [
            styles.arrowButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={colors.primary}
          />
        </Pressable>

        <View style={styles.dateButton}>
          <View style={styles.calendarIcon}>
            <Ionicons
              name="calendar-outline"
              size={19}
              color={colors.primary}
            />
          </View>

          <View style={styles.dateInputContainer}>
            <Text style={styles.dateCaption}>
              {isToday
                ? 'BUGÜN'
                : formatDateKey(dateKey)}
            </Text>

            <input
              aria-label="Tarix seç"
              onChange={handleDateChange}
              style={webDateInputStyle}
              type="date"
              value={dateKey}
            />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Növbəti gün"
          hitSlop={8}
          onPress={() => {
            onDateChange(
              shiftDateKey(dateKey, 1),
            );
          }}
          style={({ pressed }) => [
            styles.arrowButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.primary}
          />
        </Pressable>
      </View>

      {!isToday ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onDateChange(todayDateKey);
          }}
          style={({ pressed }) => [
            styles.todayButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="today-outline"
            size={17}
            color={colors.primary}
          />

          <Text style={styles.todayText}>
            Bugünkü tarixə qayıt
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  arrowButton: {
    width: 42,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },

  dateButton: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },

  calendarIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },

  dateInputContainer: {
    flex: 1,
    minWidth: 0,
  },

  dateCaption: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 1,
  },

  todayButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },

  todayText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },

  pressed: {
    opacity: 0.65,
  },
});