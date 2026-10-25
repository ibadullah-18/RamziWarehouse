import { forwardRef, useRef } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
} from 'react-native';

import {
  cleanCodeInput,
  cleanMoneyInput,
} from '../features/customer-accounts/settlement-math';
import { colors } from '../theme';
import { dismissKeyboard } from './keyboard-form';

type FieldProps = Omit<
  TextInputProps,
  'keyboardType' | 'inputMode' | 'value' | 'onChangeText' | 'style'
> & {
  label?: string;
  hint?: string;
  value: string;
  onChangeText: (value: string) => void;
  inputStyle?: StyleProp<TextStyle>;
};

function FieldFrame({
  label,
  hint,
  children,
}: {
  label?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.frame}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Amounts: decimal keyboard, comma or dot, at most two decimals. */
export function MoneyInput({
  label,
  hint,
  value,
  onChangeText,
  inputStyle,
  ...rest
}: FieldProps) {
  return (
    <FieldFrame label={label} hint={hint}>
      <TextInput
        placeholder="0,00"
        placeholderTextColor={colors.textLight}
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
        onSubmitEditing={dismissKeyboard}
        selectTextOnFocus
        {...rest}
        value={value}
        onChangeText={(text) => onChangeText(cleanMoneyInput(text))}
        keyboardType="decimal-pad"
        inputMode="decimal"
        style={[styles.input, styles.money, inputStyle]}
      />
    </FieldFrame>
  );
}

/**
 * Wallpaper codes and batches: only digits and "-" (1019, 340-1). The numeric
 * keyboard has no hyphen on many devices, so a dedicated "-" key sits beside it.
 */
export const CodeInput = forwardRef<TextInput, FieldProps>(function CodeInput(
  { label, hint, value, onChangeText, inputStyle, ...rest },
  forwardedRef,
) {
  const localRef = useRef<TextInput>(null);
  const setRef = (instance: TextInput | null) => {
    localRef.current = instance;
    if (typeof forwardedRef === 'function') forwardedRef(instance);
    else if (forwardedRef) forwardedRef.current = instance;
  };
  return (
    <FieldFrame label={label} hint={hint}>
      <View style={styles.codeRow}>
        <TextInput
          placeholderTextColor={colors.textLight}
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          onSubmitEditing={dismissKeyboard}
          autoCorrect={false}
          autoCapitalize="none"
          {...rest}
          ref={setRef}
          value={value}
          onChangeText={(text) => onChangeText(cleanCodeInput(text))}
          keyboardType="number-pad"
          inputMode="numeric"
          style={[styles.input, styles.codeInput, inputStyle]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Defis əlavə et"
          onPress={() => {
            if (value && !value.endsWith('-')) onChangeText(`${value}-`);
            localRef.current?.focus();
          }}
          style={({ pressed }) => [styles.dash, pressed && styles.dashPressed]}
        >
          <Text style={styles.dashText}>-</Text>
        </Pressable>
      </View>
    </FieldFrame>
  );
});

/** Plain text: names, notes, reasons, search. */
export function TextField({
  label,
  hint,
  value,
  onChangeText,
  inputStyle,
  ...rest
}: FieldProps) {
  return (
    <FieldFrame label={label} hint={hint}>
      <TextInput
        placeholderTextColor={colors.textLight}
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
        onSubmitEditing={dismissKeyboard}
        {...rest}
        value={value}
        onChangeText={onChangeText}
        keyboardType="default"
        inputMode="text"
        style={[styles.input, inputStyle]}
      />
    </FieldFrame>
  );
}

const styles = StyleSheet.create({
  frame: { gap: 6, minWidth: 0 },
  label: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  hint: { color: colors.textLight, fontSize: 13 },
  input: {
    color: colors.text,
    backgroundColor: colors.surface,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
  },
  money: { textAlign: 'right', fontVariant: ['tabular-nums'] },
  codeRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  codeInput: { flex: 1, minWidth: 0 },
  dash: {
    width: 54,
    minHeight: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  dashPressed: { opacity: 0.7 },
  dashText: { color: colors.primary, fontSize: 26, fontWeight: '700' },
});
