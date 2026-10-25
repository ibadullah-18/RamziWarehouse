import { StyleSheet, TextInput, View } from 'react-native';

import { colors } from '../theme';
import { dismissKeyboard } from './keyboard-form';

/**
 * One search box for customer names and wallpaper codes. It uses the default keyboard
 * because a name is as likely as a code such as 1019 or 340-1.
 */
export function CodeSearchField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.wrap}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Kod, partiya və ya müştəri adı (məs. 1019)"
        placeholderTextColor={colors.textLight}
        keyboardType="default"
        inputMode="text"
        returnKeyType="search"
        submitBehavior="blurAndSubmit"
        onSubmitEditing={dismissKeyboard}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  input: {
    minHeight: 56,
    color: colors.text,
    backgroundColor: colors.surface,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 17,
  },
});
