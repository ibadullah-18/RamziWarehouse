import { Ionicons } from '@expo/vector-icons';
import {
    router,
    useLocalSearchParams,
    type Href,
} from 'expo-router';
import {
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    getCustomerById,
    updateCustomer,
} from '../../../api/customers-api';
import { useAuth } from '../../../auth/auth-context';
import { canManageOperations } from '../../../auth/permissions';
import type {
    Customer,
} from '../../../features/customers/customer-types';
import {
    colors,
    fontSize,
    radius,
    spacing,
} from '../../../theme';

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Müştəri məlumatı yenilənmədi.';
}

export default function EditCustomerScreen() {
  const parameters = useLocalSearchParams<{ id?: string | string[] }>();
  const customerId = Array.isArray(parameters.id)
    ? parameters.id[0]
    : parameters.id;

  const { session } = useAuth();
  const accessToken = session?.accessToken;
  const canManage = canManageOperations(session?.role);

  const nameInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [note, setNote] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !customerId) {
      return;
    }

    let isMounted = true;

    getCustomerById(accessToken, customerId)
      .then(result => {
        if (!isMounted) {
          return;
        }

        setCustomer(result);
        setName(result.name);
        setPhoneNumber(result.phoneNumber ?? '');
        setNote(result.note ?? '');
        setIsActive(result.isActive);
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken, customerId]);

  async function saveCustomer(nextIsActive = isActive) {
    if (
      !accessToken ||
      !customerId ||
      !canManage ||
      isSubmitting
    ) {
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
      const updatedCustomer = await updateCustomer(
        accessToken,
        customerId,
        {
          name: normalizedName,
          phoneNumber: normalizedPhone || null,
          note: normalizedNote || null,
          isActive: nextIsActive,
        },
      );

      setCustomer(updatedCustomer);
      setIsActive(updatedCustomer.isActive);

      Alert.alert(
        'Müştəri yeniləndi',
        `${updatedCustomer.name} məlumatları yadda saxlanıldı.`,
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

  function changeActiveState(nextValue: boolean) {
    if (nextValue) {
      setIsActive(true);
      return;
    }

    Alert.alert(
      'Müştərini deaktiv et',
      'Deaktiv müştəri yeni qaimə seçimində görünməyəcək. Köhnə qaimə və vazvrad məlumatları silinməyəcək.',
      [
        { text: 'Ləğv et', style: 'cancel' },
        {
          text: 'Deaktiv et',
          style: 'destructive',
          onPress: () => setIsActive(false),
        },
      ],
    );
  }

  if (!canManage) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.deniedContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={42}
            color={colors.danger}
          />
          <Text style={styles.deniedTitle}>İcazəniz yoxdur</Text>
          <Text style={styles.deniedText}>
            Müştərini yalnız Admin və Menecer dəyişə bilər.
          </Text>
          <Pressable onPress={() => router.back()} style={styles.backAction}>
            <Text style={styles.backActionText}>Geri qayıt</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Müştəri məlumatı alınır...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!customer || !customerId) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.deniedContainer}>
          <Ionicons
            name="warning-outline"
            size={42}
            color={colors.danger}
          />
          <Text style={styles.deniedTitle}>Müştəri tapılmadı</Text>
          <Text style={styles.deniedText}>
            {errorMessage || 'Müştəri məlumatı mövcud deyil.'}
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
              <Text style={styles.title}>Məlumatları dəyiş</Text>
            </View>
          </View>

          <View style={styles.statusCard}>
            <View
              style={[
                styles.statusIcon,
                isActive ? styles.activeIcon : styles.inactiveIcon,
              ]}
            >
              <Ionicons
                name={isActive ? 'checkmark-circle' : 'pause-circle'}
                size={25}
                color={isActive ? colors.success : colors.textSecondary}
              />
            </View>
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>
                {isActive ? 'Aktiv müştəri' : 'Deaktiv müştəri'}
              </Text>
              <Text style={styles.statusDescription}>
                {isActive
                  ? 'Yeni qaimə və vazvrad üçün seçilə bilər.'
                  : 'Yeni əməliyyatlarda seçimdə göstərilmir.'}
              </Text>
            </View>
            <Switch
              value={isActive}
              disabled={isSubmitting}
              onValueChange={changeActiveState}
              trackColor={{ false: colors.border, true: colors.successSoft }}
              thumbColor={isActive ? colors.success : colors.textLight}
            />
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
                placeholder="Müştəri adı"
                placeholderTextColor={colors.textLight}
                style={styles.input}
                maxLength={150}
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
                placeholder="Müştəri haqqında qeyd..."
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
            onPress={() => void saveCustomer()}
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.pressed,
              isSubmitting && styles.disabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="save-outline" size={22} color={colors.white} />
            )}
            <Text style={styles.submitText}>
              {isSubmitting ? 'Yadda saxlanılır...' : 'Dəyişiklikləri saxla'}
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
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, backgroundColor: colors.surface, padding: spacing.lg, marginTop: spacing.xl },
  statusIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  activeIcon: { backgroundColor: colors.successSoft },
  inactiveIcon: { backgroundColor: colors.background },
  statusTextContainer: { flex: 1 },
  statusTitle: { color: colors.text, fontSize: fontSize.sm, fontWeight: '800' },
  statusDescription: { color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 18, marginTop: 3 },
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
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.md },
  deniedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  deniedTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '800', marginTop: spacing.lg },
  deniedText: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 21, textAlign: 'center', marginTop: spacing.sm },
  backAction: { minWidth: 150, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primary, marginTop: spacing.xl },
  backActionText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '800' },
});