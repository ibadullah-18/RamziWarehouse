import DateTimePicker from '@expo/ui/community/datetime-picker';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {
    dateKeyToPickerDate,
    formatDateKey,
    getTodayDateKey,
    pickerDateToDateKey,
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

export function DateFilterBar({
  dateKey,
  onDateChange,
}: DateFilterBarProps) {
  const [isPickerVisible, setIsPickerVisible] =
    useState(false);

  const todayDateKey = getTodayDateKey();
  const isToday = dateKey === todayDateKey;

  function chooseDate(date: Date) {
    onDateChange(
      pickerDateToDateKey(date),
    );

    if (Platform.OS === 'android') {
      setIsPickerVisible(false);
    }
  }

  const picker = (
    <DateTimePicker
      value={dateKeyToPickerDate(dateKey)}
      mode="date"
      display={
        Platform.OS === 'ios'
          ? 'inline'
          : 'default'
      }
      presentation={
        Platform.OS === 'android'
          ? 'dialog'
          : 'inline'
      }
      accentColor={colors.primary}
      onValueChange={(_event, date) => {
        chooseDate(date);
      }}
      onDismiss={() => {
        setIsPickerVisible(false);
      }}
    />
  );

  return (
    <View style={styles.container}>
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tarix seç"
        onPress={() => {
          setIsPickerVisible(true);
        }}
        style={({ pressed }) => [
          styles.dateButton,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.calendarIcon}>
          <Ionicons
            name="calendar-outline"
            size={19}
            color={colors.primary}
          />
        </View>

        <View style={styles.dateTextContainer}>
          <Text style={styles.dateCaption}>
            {isToday
              ? 'BUGÜN'
              : 'SEÇİLMİŞ TARİX'}
          </Text>

          <Text style={styles.dateText}>
            {formatDateKey(dateKey)}
          </Text>
        </View>

        <Ionicons
          name="chevron-down"
          size={17}
          color={colors.textLight}
        />
      </Pressable>

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

      {!isToday ? (
        <Pressable
          onPress={() => {
            onDateChange(todayDateKey);
          }}
          style={({ pressed }) => [
            styles.todayButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.todayText}>
            Bu gün
          </Text>
        </Pressable>
      ) : null}

      {isPickerVisible &&
      Platform.OS === 'android'
        ? picker
        : null}

      <Modal
        animationType="fade"
        transparent
        visible={
          isPickerVisible &&
          Platform.OS === 'ios'
        }
        onRequestClose={() => {
          setIsPickerVisible(false);
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setIsPickerVisible(false);
          }}
        >
          <Pressable
            style={styles.modalCard}
            onPress={event => {
              event.stopPropagation();
            }}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Tarixi seç
              </Text>

              <Pressable
                onPress={() => {
                  setIsPickerVisible(false);
                }}
              >
                <Text style={styles.doneText}>
                  Hazır
                </Text>
              </Pressable>
            </View>

            {picker}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
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

  dateTextContainer: {
    flex: 1,
  },

  dateCaption: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  dateText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
    marginTop: 2,
  },

  todayButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },

  todayText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },

  modalCard: {
    overflow: 'hidden',
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },

  modalHeader: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  modalTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  doneText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  pressed: {
    opacity: 0.65,
  },
});