import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Children, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsiveLayout } from '../../hooks/use-responsive-layout';
import { colors } from '../../theme';

export const money = (value: number) =>
  `${value.toLocaleString('az-AZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₼`;

export function goBack(fallback: string = '/(app)/(tabs)/accounts') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as never);
}

/**
 * Page shell shared by every açot screen: safe area, a back button, a title and a
 * scrolling body that keeps a readable width on tablets and a single column on phones.
 */
export function AccountPageShell({
  title,
  subtitle,
  onBack,
  hideBack,
  children,
  footer,
  refreshing,
  onRefresh,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  hideBack?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const layout = useResponsiveLayout();
  // Android draws the system back/home buttons over the bottom edge: keep the footer above them.
  const insets = useSafeAreaInsets();
  const width = layout.isTablet ? Math.min(layout.contentMaxWidth, 1040) : layout.contentMaxWidth;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAwareScrollView
        bottomOffset={62}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={Boolean(refreshing)}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          ) : undefined
        }
        contentContainerStyle={[
          styles.page,
          {
            paddingHorizontal: layout.horizontalPadding,
            maxWidth: width,
            gap: layout.isTablet ? 18 : 14,
          },
        ]}
      >
        <View style={styles.header}>
          {!hideBack && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Geri"
              onPress={onBack ?? (() => goBack())}
              hitSlop={8}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
          )}
          <View style={styles.headerText}>
            <Text style={[styles.title, layout.isTablet && styles.titleTablet]} numberOfLines={2}>
              {title}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        {children}
      </KeyboardAwareScrollView>
      {footer ? (
        <View
          style={[
            styles.footer,
            { paddingHorizontal: layout.horizontalPadding, paddingBottom: Math.max(insets.bottom, 12) + 4 },
          ]}
        >
          <View style={[styles.footerInner, { maxWidth: width }]}>{footer}</View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger';

export function Btn({
  title,
  onPress,
  variant = 'primary',
  disabled,
  busy,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  busy?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  const inactive = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(busy) }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        buttonStyles[variant],
        inactive && styles.btnDisabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={variant === 'primary' ? colors.background : colors.text} />
      ) : icon ? (
        <Ionicons name={icon} size={20} color={buttonText[variant]} />
      ) : null}
      <Text style={[styles.btnText, { color: buttonText[variant] }]}>{title}</Text>
    </Pressable>
  );
}

const buttonStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  success: { backgroundColor: colors.success },
  danger: { backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.danger },
});

const buttonText: Record<ButtonVariant, string> = {
  primary: colors.background,
  secondary: colors.text,
  success: colors.background,
  danger: colors.danger,
};

export function Card({
  children,
  tone = 'default',
  onPress,
  style,
}: {
  children: ReactNode;
  tone?: 'default' | 'done' | 'warning' | 'bad';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const content = [
    styles.card,
    tone === 'done' && styles.cardDone,
    tone === 'warning' && styles.cardWarning,
    tone === 'bad' && styles.cardBad,
    style,
  ];
  if (!onPress) return <View style={content}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [...content, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

/** Responsive columns: one on phones, two on tablets, three on wide tablets. */
export function Grid({ children, columns }: { children: ReactNode; columns?: 1 | 2 | 3 }) {
  const layout = useResponsiveLayout();
  const count = columns ?? layout.columnCount;
  const basis = count === 1 ? '100%' : count === 2 ? '48.5%' : '31.8%';
  const items = Children.toArray(children);
  return (
    <View style={styles.grid}>
      {items.map((child, index) => (
        <View key={index} style={{ width: basis, flexGrow: count === 1 ? 1 : 0, minWidth: 0 }}>
          {child}
        </View>
      ))}
    </View>
  );
}

export function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'warn';
}) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text
        style={[
          styles.tileValue,
          tone === 'good' && { color: colors.success },
          tone === 'warn' && { color: colors.warning },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

export function TileRow({ children }: { children: ReactNode }) {
  return <View style={styles.tileRow}>{children}</View>;
}

export function Line({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: 'good' | 'warn' | 'bad';
}) {
  return (
    <View style={styles.line}>
      <Text style={[styles.lineLabel, strong && styles.lineStrong]}>{label}</Text>
      <Text
        style={[
          styles.lineValue,
          strong && styles.lineStrong,
          tone === 'good' && { color: colors.success },
          tone === 'warn' && { color: colors.warning },
          tone === 'bad' && { color: colors.danger },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/** "−" while the customer still has to be finished, "+" (green) once done. */
export function StatusMark({ done }: { done: boolean }) {
  return (
    <View style={[styles.mark, done ? styles.markDone : styles.markPending]}>
      <Text style={[styles.markText, { color: done ? colors.background : colors.warning }]}>
        {done ? '+' : '−'}
      </Text>
    </View>
  );
}

export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'error' | 'success';
}) {
  return (
    <View
      style={[
        styles.notice,
        tone === 'error' && styles.noticeError,
        tone === 'success' && styles.noticeSuccess,
      ]}
    >
      <Text
        style={[
          styles.noticeText,
          tone === 'error' && { color: colors.danger },
          tone === 'success' && { color: colors.success },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && { color: colors.background }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: { width: '100%', alignSelf: 'center', paddingTop: 12, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  headerText: { flex: 1, minWidth: 0 },
  back: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  titleTablet: { fontSize: 30 },
  subtitle: { color: colors.textSecondary, fontSize: 15, marginTop: 2 },
  pressed: { opacity: 0.75 },
  footer: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  footerInner: { width: '100%', gap: 10 },
  btn: {
    minHeight: 56,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontSize: 17, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  cardDone: { borderColor: colors.success, backgroundColor: colors.successSoft },
  cardBad: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  cardWarning: { borderColor: colors.warning, backgroundColor: colors.warningSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tileRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexGrow: 1,
    flexBasis: 100,
    minWidth: 100,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  tileLabel: { color: colors.textSecondary, fontSize: 13 },
  tileValue: { color: colors.text, fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  lineLabel: { color: colors.textSecondary, fontSize: 16, flexShrink: 1 },
  lineValue: { color: colors.text, fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  lineStrong: { color: colors.text, fontSize: 18, fontWeight: '700' },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  markPending: { borderColor: colors.warning, backgroundColor: colors.warningSoft },
  markDone: { borderColor: colors.success, backgroundColor: colors.success },
  markText: { fontSize: 24, fontWeight: '800', lineHeight: 28 },
  notice: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noticeError: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
  noticeSuccess: { backgroundColor: colors.successSoft, borderColor: colors.success },
  noticeText: { color: colors.textSecondary, fontSize: 15, lineHeight: 22 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 6 },
  loading: { paddingVertical: 40, alignItems: 'center' },
  chip: {
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
