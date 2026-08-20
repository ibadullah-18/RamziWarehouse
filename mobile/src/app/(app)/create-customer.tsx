import { Ionicons } from '@expo/vector-icons';
import {
    router,
    type Href,
} from 'expo-router';
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createCustomer } from '../../api/customers-api';
import { useAuth } from '../../auth/auth-context';
import { canManageOperations } from '../../auth/permissions';
import {
    colors,
    fontSize,
    radius,
    spacing,
} from '../../theme';

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Müştəri yaradılmadı.';
}

export default function CreateCustomerScreen() {
  const { session } = useAuth();
  const accessToken = session?.accessToken;
  const canManage = canManageOperations(session?.role);

  const nameInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);

  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [note, setNote] = useState('');
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    if (!accessToken || !canManage || isSubmitting) {
      return;
    }

    const normalizedName = name.trim();
    const normalizedPhone = phoneNumber.trim();
    const normalizedNote = note.trim();

    if (!normalizedName) {
      setErrorMessage('Müştərinin adını yazın.');
      nameInputRef.current?.focus();
      return;
    }

    if (normalizedName.length > 150) {
      setErrorMessage('Müştəri adı maksimum 150 simvol ola bilər.');
      nameInputRef.current?.focus();
      return;
    }

    if (
      normalizedPhone &&
      !/^[0-9+\s()-]{7,30}$/.test(normalizedPhone)
    ) {
      setErrorMessage('Telefon nömrəsi düzgün formatda deyil.');
      phoneInputRef.current?.focus();
      return;
    }

    if (normalizedNote.length > 1000) {
      setErrorMessage('Qeyd maksimum 1000 simvol ola bilər.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const createdCustomer = await createCustomer(
        accessToken,
        {
          name: normalizedName,
          phoneNumber: normalizedPhone || null,
          note: normalizedNote || null,
        },
      );

      Alert.alert(
        'Müştəri yaradıldı',
        `${createdCustomer.name} siyahıya əlavə edildi.`,
        [
          {
            text: 'Tamam',
            onPress: () => {
              router.replace('/customers' as Href);
            },
          },
        ],
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!canManage) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.deniedContainer}>
          <View style={styles.deniedIcon}>
            <Ionicons
              name="lock-closed-outline"
              size={31}
              color={colors.danger}
            />
          </View>
          <Text style={styles.deniedTitle}>İcazəniz yoxdur</Text>
          <Text style={styles.deniedText}>
            Müştərini yalnız Admin və Menecer yarada bilər.
          </Text>
          <Pressable onPress={() => router.back()} style={styles.backAction}>
            <Text style={styles.backActionText}>Geri qayıt</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Pressable
              disabled={isSubmitting}
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.headerButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={colors.text}
              />
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>MÜŞTƏRİ</Text>
              <Text style={styles.title}>Yeni müştəri</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="storefront-outline"
                size={23}
                color={colors.primary}
              />
            </View>
            <Text style={styles.infoText}>
              Burada mağazanın və ya alıcının əsas məlumatlarını yazın.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Müştəri adı *</Text>
            <View style={styles.inputBox}>
              <Ionicons
                name="business-outline"
                size={20}
                color={colors.textSecondary}
              />
              <TextInput
                ref={nameInputRef}
                value={name}
                onChangeText={setName}
                placeholder="Məsələn: Ruslan Aboy"
                placeholderTextColor={colors.textLight}
                style={styles.input}
                maxLength={150}
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => phoneInputRef.current?.focus()}
              />
            </View>

            <Text style={styles.label}>Telefon nömrəsi</Text>
            <View style={styles.inputBox}>
              <Ionicons
                name="call-outline"
                size={20}
                color={colors.textSecondary}
              />
              <TextInput
                ref={phoneInputRef}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="+994 50 000 00 00"
                placeholderTextColor={colors.textLight}
                style={styles.input}
                maxLength={30}
                keyboardType="phone-pad"
              />
            </View>

            <Text style={styles.label}>Əlavə qeyd</Text>
            <View style={[styles.inputBox, styles.noteBox]}>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Müştəri haqqında vacib qeyd..."
                placeholderTextColor={colors.textLight}
                style={[styles.input, styles.noteInput]}
                maxLength={1000}
                multiline
                textAlignVertical="top"
              />
            </View>
            <Text style={styles.counter}>{note.length}/1000</Text>
          </View>

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Ionicons
                name="warning-outline"
                size={20}
                color={colors.danger}
              />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Pressable
            disabled={isSubmitting}
            onPress={() => void submit()}
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.pressed,
              isSubmitting && styles.disabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="add-circle-outline" size={22} color={colors.white} />
            )}
            <Text style={styles.submitText}>
              {isSubmitting ? 'Yaradılır...' : 'Müştərini yarat'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: 80 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  headerText: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: fontSize.xl, fontWeight: '800', marginTop: 2 },
  pressed: { opacity: 0.72 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.primarySoft, padding: spacing.md, marginTop: spacing.xl },
  infoIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.surface },
  infoText: { flex: 1, color: colors.primary, fontSize: fontSize.sm, lineHeight: 20 },
  formCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, backgroundColor: colors.surface, padding: spacing.lg, marginTop: spacing.lg },
  label: { color: colors.text, fontSize: fontSize.sm, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.sm },
  inputBox: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.background, paddingHorizontal: spacing.md },
  input: { flex: 1, color: colors.text, fontSize: fontSize.sm, paddingVertical: spacing.md },
  noteBox: { minHeight: 130, alignItems: 'flex-start' },
  noteInput: { minHeight: 125 },
  counter: { color: colors.textLight, fontSize: fontSize.xs, textAlign: 'right', marginTop: spacing.xs },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.dangerSoft, padding: spacing.md, marginTop: spacing.md },
  errorText: { flex: 1, color: colors.danger, fontSize: fontSize.sm },
  submitButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primary, marginTop: spacing.lg },
  submitText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  deniedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  deniedIcon: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.dangerSoft },
  deniedTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '800', marginTop: spacing.lg },
  deniedText: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 21, textAlign: 'center', marginTop: spacing.sm },
  backAction: { minWidth: 150, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primary, marginTop: spacing.xl },
  backActionText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '800' },
});