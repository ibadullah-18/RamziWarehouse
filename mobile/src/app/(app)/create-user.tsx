import { Ionicons } from '@expo/vector-icons';
import {
    type Href,
    router,
} from 'expo-router';
import {
    useMemo,
    useState,
} from 'react';
import {
    ActivityIndicator,
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

import { createUser } from '../../api/users-api';
import { useAuth } from '../../auth/auth-context';
import { useAppToast } from '../../components/app-toast';
import {
    UserRole,
} from '../../auth/auth-types';
import {
    canManageUsers,
} from '../../auth/permissions';
import {
    UserRoleOption,
    userRoleOptions,
} from '../../features/users/user-role';
import {
    colors,
    fontSize,
    radius,
    spacing,
} from '../../theme';

type FormFieldProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  children: React.ReactNode;
};

function FormField({
  icon,
  label,
  children,
}: FormFieldProps) {
  return (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldLabelRow}>
        <Ionicons
          name={icon}
          size={17}
          color={colors.primary}
        />

        <Text style={styles.fieldLabel}>
          {label}
        </Text>
      </View>

      {children}
    </View>
  );
}

type RoleCardProps = {
  option: UserRoleOption;
  selected: boolean;
  onPress: () => void;
};

function RoleCard({
  option,
  selected,
  onPress,
}: RoleCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.roleCard,
        selected && styles.selectedRoleCard,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.roleRadio,
          selected && styles.selectedRoleRadio,
        ]}
      >
        {selected ? (
          <View style={styles.roleRadioCenter} />
        ) : null}
      </View>

      <View style={styles.roleInformation}>
        <Text
          style={[
            styles.roleTitle,
            selected && styles.selectedRoleTitle,
          ]}
        >
          {option.label}
        </Text>

        <Text style={styles.roleDescription}>
          {option.description}
        </Text>
      </View>
    </Pressable>
  );
}

export default function CreateUserScreen() {
  const { session } = useAuth();
  const { showToast } = useAppToast();

  const accessToken =
    session?.accessToken;

  const hasPermission =
    canManageUsers(session?.role);

  const [fullName, setFullName] =
    useState('');

  const [username, setUsername] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [role, setRole] =
    useState<UserRole>(
      UserRole.WarehouseWorker,
    );

  const [passwordVisible, setPasswordVisible] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const creatableRoleOptions = useMemo(
    () =>
      userRoleOptions.filter(
        (option) =>
          option.value !== UserRole.Admin,
      ),
    [],
  );

  function validateForm(): string | null {
    const normalizedFullName =
      fullName.trim();

    const normalizedUsername =
      username.trim();

    if (normalizedFullName.length < 2) {
      return 'İşçinin ad və soyadını düzgün yaz.';
    }

    if (normalizedUsername.length < 3) {
      return 'İstifadəçi adı ən azı 3 simvol olmalıdır.';
    }

    if (/\s/.test(normalizedUsername)) {
      return 'İstifadəçi adında boşluq ola bilməz.';
    }

    if (password.length < 8) {
      return 'Şifrə ən azı 8 simvol olmalıdır.';
    }

    if (!confirmPassword) {
      return 'Şifrənin təkrarını daxil edin.';
    }

    if (password !== confirmPassword) {
      return 'Şifrələr bir-biri ilə eyni deyil.';
    }

    if (
      role === UserRole.Admin ||
      !creatableRoleOptions.some(
        (option) => option.value === role,
      )
    ) {
      return 'İşçi üçün düzgün rol seçilməyib.';
    }

    return null;
  }

  async function handleCreateUser() {
    if (isSubmitting) {
      return;
    }

    const validationError =
      validateForm();

    if (validationError) {
      showToast({
        title: 'Məlumatları yoxla',
        message: validationError,
        variant: 'warning',
      });

      return;
    }

    if (!accessToken || !hasPermission) {
      showToast({
        title: 'İcazə yoxdur',
        message:
          'İşçini yalnız Admin yarada bilər.',
        variant: 'error',
      });

      return;
    }

    setIsSubmitting(true);

    try {
      const createdUser = await createUser(
        accessToken,
        {
          fullName: fullName.trim(),
          username: username
            .trim()
            .toLowerCase(),
          password,
          role,
        },
      );

      showToast({
        title: 'İşçi yaradıldı',
        message:
          `${createdUser.fullName} sistemə uğurla əlavə edildi.`,
        variant: 'success',
      });

      router.replace(
        '/users' as Href,
      );
    } catch (error) {
      showToast({
        title: 'İşçi yaradılmadı',
        message:
          error instanceof Error
            ? error.message
            : 'Gözlənilməz xəta baş verdi.',
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Ionicons
            name="lock-closed-outline"
            size={48}
            color={colors.danger}
          />

          <Text style={styles.stateTitle}>
            Giriş icazəsi yoxdur
          </Text>

          <Text style={styles.stateDescription}>
            İşçini yalnız Admin yarada bilər.
          </Text>

          <Pressable
            onPress={() => router.back()}
            style={styles.backToPreviousButton}
          >
            <Text
              style={
                styles.backToPreviousButtonText
              }
            >
              Geri qayıt
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geri qayıt"
          disabled={isSubmitting}
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={colors.text}
          />
        </Pressable>

        <View style={styles.headerContent}>
          <Text style={styles.headerCaption}>
            ADMİN PANELİ
          </Text>

          <Text style={styles.headerTitle}>
            Yeni işçi
          </Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.contentContainer
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.informationBanner}>
            <View style={styles.bannerIcon}>
              <Ionicons
                name="person-add-outline"
                size={24}
                color={colors.primary}
              />
            </View>

            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>
                Yeni hesab
              </Text>

              <Text
                style={styles.bannerDescription}
              >
                İşçi bu istifadəçi adı və şifrə ilə
                tətbiqə daxil olacaq.
              </Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <FormField
              icon="person-outline"
              label="Ad və soyad"
            >
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                editable={!isSubmitting}
                placeholder="Məsələn: Əli Məmmədov"
                placeholderTextColor={
                  colors.textLight
                }
                autoCapitalize="words"
                returnKeyType="next"
                style={styles.input}
              />
            </FormField>

            <FormField
              icon="at-outline"
              label="İstifadəçi adı"
            >
              <TextInput
                value={username}
                onChangeText={setUsername}
                editable={!isSubmitting}
                placeholder="Məsələn: ali"
                placeholderTextColor={
                  colors.textLight
                }
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                style={styles.input}
              />
            </FormField>

            <FormField
              icon="key-outline"
              label="Şifrə"
            >
              <View style={styles.passwordContainer}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  editable={!isSubmitting}
                  placeholder="Ən azı 8 simvol"
                  placeholderTextColor={
                    colors.textLight
                  }
                  secureTextEntry={!passwordVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  style={styles.passwordInput}
                />

                <Pressable
                  onPress={() => {
                    setPasswordVisible(
                      (currentValue) =>
                        !currentValue,
                    );
                  }}
                  hitSlop={10}
                >
                  <Ionicons
                    name={
                      passwordVisible
                        ? 'eye-off-outline'
                        : 'eye-outline'
                    }
                    size={21}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>
            </FormField>

            <FormField
              icon="checkmark-circle-outline"
              label="Şifrəni təkrarla"
            >
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!isSubmitting}
                placeholder="Şifrəni yenidən yaz"
                placeholderTextColor={
                  colors.textLight
                }
                secureTextEntry={!passwordVisible}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                style={styles.input}
              />
            </FormField>
          </View>

          <View style={styles.roleSection}>
            <Text style={styles.sectionTitle}>
              İşçinin vəzifəsi
            </Text>

            <Text style={styles.sectionDescription}>
              İşçinin sistemdə hansı əməliyyatları
              edə biləcəyini seç.
            </Text>

            <View style={styles.roleList}>
              {creatableRoleOptions.map(
                (option) => (
                  <RoleCard
                    key={option.value}
                    option={option}
                    selected={
                      role === option.value
                    }
                    onPress={() => {
                      setRole(option.value);
                    }}
                  />
                ),
              )}
            </View>
          </View>

          <Pressable
            disabled={isSubmitting}
            onPress={() => {
              void handleCreateUser();
            }}
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.pressed,
              isSubmitting && styles.disabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator
                size="small"
                color={colors.white}
              />
            ) : (
              <Ionicons
                name="person-add-outline"
                size={21}
                color={colors.white}
              />
            )}

            <Text style={styles.submitButtonText}>
              {isSubmitting
                ? 'İşçi yaradılır...'
                : 'İşçini yarat'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  keyboardContainer: {
    flex: 1,
  },

  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },

  headerContent: {
    flex: 1,
    alignItems: 'center',
  },

  headerCaption: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1,
  },

  headerTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
    marginTop: 2,
  },

  headerPlaceholder: {
    width: 42,
  },

  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
  },

  informationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },

  bannerIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },

  bannerContent: {
    flex: 1,
    marginLeft: spacing.md,
  },

  bannerTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  bannerDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: 3,
  },

  formCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginTop: spacing.lg,
  },

  fieldContainer: {
    marginBottom: spacing.lg,
  },

  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },

  fieldLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  input: {
    minHeight: 50,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: fontSize.sm,
    backgroundColor: colors.background,
  },

  passwordContainer: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },

  passwordInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    paddingVertical: 0,
  },

  roleSection: {
    marginTop: spacing.xl,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },

  sectionDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
  },

  roleList: {
    gap: spacing.md,
    marginTop: spacing.md,
  },

  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  selectedRoleCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },

  roleRadio: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.round,
  },

  selectedRoleRadio: {
    borderColor: colors.primary,
  },

  roleRadioCenter: {
    width: 10,
    height: 10,
    borderRadius: radius.round,
    backgroundColor: colors.primary,
  },

  roleInformation: {
    flex: 1,
    marginLeft: spacing.md,
  },

  roleTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  selectedRoleTitle: {
    color: colors.primary,
  },

  roleDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginTop: 3,
  },

  submitButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    marginTop: spacing.xl,
  },

  submitButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },

  stateTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
    marginTop: spacing.lg,
  },

  stateDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  backToPreviousButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    marginTop: spacing.xl,
  },

  backToPreviousButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.72,
  },

  disabled: {
    opacity: 0.55,
  },
});