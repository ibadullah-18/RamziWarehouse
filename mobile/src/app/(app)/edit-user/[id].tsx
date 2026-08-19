import { Ionicons } from '@expo/vector-icons';
import {
    type Href,
    router,
    useLocalSearchParams,
} from 'expo-router';
import {
    useEffect,
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
    changeUserPassword,
    getUserById,
    updateUser,
} from '../../../api/users-api';
import { useAuth } from '../../../auth/auth-context';
import {
    UserRole,
} from '../../../auth/auth-types';
import {
    canManageUsers,
} from '../../../auth/permissions';
import {
    UserRoleOption,
    userRoleOptions,
} from '../../../features/users/user-role';
import {
    WarehouseUser,
} from '../../../features/users/user-types';
import {
    colors,
    fontSize,
    radius,
    spacing,
} from '../../../theme';

type RoleCardProps = {
  option: UserRoleOption;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
};

function RoleCard({
  option,
  selected,
  disabled,
  onPress,
}: RoleCardProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.roleCard,
        selected && styles.selectedRoleCard,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.radio,
          selected && styles.selectedRadio,
        ]}
      >
        {selected ? (
          <View style={styles.radioCenter} />
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

export default function EditUserScreen() {
  const parameters =
    useLocalSearchParams<{
      id?: string | string[];
    }>();

  const userId = Array.isArray(parameters.id)
    ? parameters.id[0]
    : parameters.id;

  const { session } = useAuth();

  const accessToken =
    session?.accessToken;

  const hasPermission =
    canManageUsers(session?.role);

  const [user, setUser] =
    useState<WarehouseUser | null>(null);

  const [fullName, setFullName] =
    useState('');

  const [username, setUsername] =
    useState('');

  const [role, setRole] =
    useState<UserRole>(
      UserRole.WarehouseWorker,
    );

  const [isActive, setIsActive] =
    useState(true);

  const [newPassword, setNewPassword] =
    useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [
    passwordVisible,
    setPasswordVisible,
  ] = useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    isChangingPassword,
    setIsChangingPassword,
  ] = useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  useEffect(() => {
    if (
      !userId ||
      !accessToken ||
      !hasPermission
    ) {
      return;
    }

    let isActiveRequest = true;
    const currentUserId = userId;
    const currentAccessToken = accessToken;

    getUserById(
      currentAccessToken,
      currentUserId,
    )
      .then((result) => {
        if (!isActiveRequest) {
          return;
        }

        setUser(result);
        setFullName(result.fullName);
        setUsername(result.username);
        setRole(result.role);
        setIsActive(result.isActive);
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (!isActiveRequest) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'İşçi məlumatları alınmadı.',
        );
      })
      .finally(() => {
        if (isActiveRequest) {
          setIsLoading(false);
        }
      });

    return () => {
      isActiveRequest = false;
    };
  }, [
    accessToken,
    hasPermission,
    userId,
  ]);

  const isAdminAccount =
    user?.role === UserRole.Admin;

  const isCurrentAccount =
    user?.id === session?.userId;

  const availableRoleOptions =
    isAdminAccount
      ? userRoleOptions.filter(
          (option) =>
            option.value === UserRole.Admin,
        )
      : userRoleOptions.filter(
          (option) =>
            option.value !== UserRole.Admin,
        );

  async function saveUserChanges() {
    if (
      !user ||
      !accessToken ||
      !userId ||
      isSaving
    ) {
      return;
    }

    const normalizedFullName =
      fullName.trim();

    const normalizedUsername =
      username.trim().toLowerCase();

    if (normalizedFullName.length < 2) {
      Alert.alert(
        'Məlumatları yoxla',
        'Ad və soyadı düzgün yaz.',
      );

      return;
    }

    if (normalizedUsername.length < 3) {
      Alert.alert(
        'Məlumatları yoxla',
        'İstifadəçi adı ən azı 3 simvol olmalıdır.',
      );

      return;
    }

    if (/\s/.test(normalizedUsername)) {
      Alert.alert(
        'Məlumatları yoxla',
        'İstifadəçi adında boşluq ola bilməz.',
      );

      return;
    }

    setIsSaving(true);

    try {
      await updateUser(
        accessToken,
        userId,
        {
          fullName: normalizedFullName,
          username: normalizedUsername,
          role:
            isAdminAccount
              ? UserRole.Admin
              : role,
          isActive:
            isCurrentAccount
              ? true
              : isActive,
        },
      );

      Alert.alert(
        'Məlumatlar yeniləndi',
        'İstifadəçi məlumatları uğurla yadda saxlanıldı.',
        [
          {
            text: 'Oldu',
            onPress: () => {
              router.replace(
                '/users' as Href,
              );
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        'Yadda saxlanılmadı',
        error instanceof Error
          ? error.message
          : 'Gözlənilməz xəta baş verdi.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleSavePress() {
    if (
      user?.isActive &&
      !isActive &&
      !isCurrentAccount
    ) {
      Alert.alert(
        'İşçini deaktiv et',
        'Bu işçi daha tətbiqə daxil ola bilməyəcək. Əvvəlki məlumatları isə silinməyəcək.',
        [
          {
            text: 'Ləğv et',
            style: 'cancel',
          },
          {
            text: 'Deaktiv et',
            style: 'destructive',
            onPress: () => {
              void saveUserChanges();
            },
          },
        ],
      );

      return;
    }

    void saveUserChanges();
  }

  async function handleChangePassword() {
    if (
      !accessToken ||
      !userId ||
      isChangingPassword
    ) {
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert(
        'Şifrə düzgün deyil',
        'Yeni şifrə ən azı 8 simvol olmalıdır.',
      );

      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        'Şifrələr eyni deyil',
        'Yeni şifrəni hər iki sahədə eyni yaz.',
      );

      return;
    }

    setIsChangingPassword(true);

    try {
      await changeUserPassword(
        accessToken,
        userId,
        {
          newPassword,
        },
      );

      setNewPassword('');
      setConfirmPassword('');

      Alert.alert(
        'Şifrə dəyişdirildi',
        isCurrentAccount
          ? 'Şifrəniz dəyişdirildi. Sessiyanın vaxtı bitdikdə yeni şifrə ilə daxil olacaqsınız.'
          : 'İşçinin şifrəsi uğurla dəyişdirildi.',
      );
    } catch (error) {
      Alert.alert(
        'Şifrə dəyişdirilmədi',
        error instanceof Error
          ? error.message
          : 'Gözlənilməz xəta baş verdi.',
      );
    } finally {
      setIsChangingPassword(false);
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
            İşçiləri yalnız Admin idarə edə bilər.
          </Text>

          <Pressable
            onPress={() => router.back()}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              Geri qayıt
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text style={styles.loadingText}>
            İşçi məlumatları açılır...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user || !userId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.danger}
          />

          <Text style={styles.stateTitle}>
            İşçi tapılmadı
          </Text>

          <Text style={styles.stateDescription}>
            {errorMessage ??
              'İstifadəçi məlumatları alınmadı.'}
          </Text>

          <Pressable
            onPress={() => router.back()}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
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
          disabled={
            isSaving ||
            isChangingPassword
          }
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
            İSTİFADƏÇİ
          </Text>

          <Text
            style={styles.headerTitle}
            numberOfLines={1}
          >
            {user.fullName}
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
          {isAdminAccount ? (
            <View style={styles.adminBanner}>
              <Ionicons
                name="shield-checkmark"
                size={22}
                color={colors.primary}
              />

              <Text style={styles.adminBannerText}>
                Bu əsas Admin hesabıdır. Rolu və
                aktivliyi dəyişdirilə bilməz.
              </Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Şəxsi məlumatlar
            </Text>

            <Text style={styles.inputLabel}>
              Ad və soyad
            </Text>

            <TextInput
              value={fullName}
              onChangeText={setFullName}
              editable={!isSaving}
              placeholder="Ad və soyad"
              placeholderTextColor={
                colors.textLight
              }
              autoCapitalize="words"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>
              İstifadəçi adı
            </Text>

            <TextInput
              value={username}
              onChangeText={setUsername}
              editable={!isSaving}
              placeholder="İstifadəçi adı"
              placeholderTextColor={
                colors.textLight
              }
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Vəzifə
            </Text>

            <View style={styles.roleList}>
              {availableRoleOptions.map(
                (option) => (
                  <RoleCard
                    key={option.value}
                    option={option}
                    selected={
                      role === option.value
                    }
                    disabled={
                      isAdminAccount ||
                      isSaving
                    }
                    onPress={() => {
                      setRole(option.value);
                    }}
                  />
                ),
              )}
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.activeRow}>
              <View style={styles.activeInformation}>
                <Text style={styles.sectionTitle}>
                  Hesab aktivdir
                </Text>

                <Text
                  style={styles.activeDescription}
                >
                  Deaktiv işçi tətbiqə daxil ola
                  bilməyəcək.
                </Text>
              </View>

              <Switch
                value={
                  isCurrentAccount
                    ? true
                    : isActive
                }
                disabled={
                  isCurrentAccount ||
                  isSaving
                }
                onValueChange={setIsActive}
                trackColor={{
                  false: colors.border,
                  true: colors.successSoft,
                }}
                thumbColor={
                  isActive
                    ? colors.success
                    : colors.textLight
                }
              />
            </View>

            {isCurrentAccount ? (
              <Text style={styles.protectionText}>
                Hazırda daxil olduğunuz hesabı
                deaktiv edə bilməzsiniz.
              </Text>
            ) : null}
          </View>

          <Pressable
            disabled={isSaving}
            onPress={handleSavePress}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.pressed,
              isSaving && styles.disabled,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator
                size="small"
                color={colors.white}
              />
            ) : (
              <Ionicons
                name="save-outline"
                size={21}
                color={colors.white}
              />
            )}

            <Text style={styles.saveButtonText}>
              {isSaving
                ? 'Yadda saxlanılır...'
                : 'Dəyişiklikləri yadda saxla'}
            </Text>
          </Pressable>

          <View style={styles.passwordCard}>
            <View style={styles.passwordHeader}>
              <Ionicons
                name="key-outline"
                size={22}
                color={colors.warning}
              />

              <Text style={styles.sectionTitle}>
                Şifrəni dəyiş
              </Text>
            </View>

            <Text style={styles.inputLabel}>
              Yeni şifrə
            </Text>

            <View style={styles.passwordInputContainer}>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                editable={!isChangingPassword}
                placeholder="Ən azı 8 simvol"
                placeholderTextColor={
                  colors.textLight
                }
                secureTextEntry={!passwordVisible}
                autoCapitalize="none"
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

            <Text style={styles.inputLabel}>
              Yeni şifrəni təkrarla
            </Text>

            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isChangingPassword}
              placeholder="Şifrəni yenidən yaz"
              placeholderTextColor={
                colors.textLight
              }
              secureTextEntry={!passwordVisible}
              autoCapitalize="none"
              style={styles.input}
            />

            <Pressable
              disabled={
                isChangingPassword ||
                newPassword.length === 0
              }
              onPress={() => {
                void handleChangePassword();
              }}
              style={({ pressed }) => [
                styles.passwordButton,
                pressed && styles.pressed,
                (isChangingPassword ||
                  newPassword.length === 0) &&
                  styles.disabled,
              ]}
            >
              {isChangingPassword ? (
                <ActivityIndicator
                  size="small"
                  color={colors.warning}
                />
              ) : (
                <Ionicons
                  name="key-outline"
                  size={20}
                  color={colors.warning}
                />
              )}

              <Text
                style={styles.passwordButtonText}
              >
                {isChangingPassword
                  ? 'Şifrə dəyişdirilir...'
                  : 'Şifrəni dəyiş'}
              </Text>
            </Pressable>
          </View>
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
    paddingHorizontal: spacing.sm,
  },

  headerCaption: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1,
  },

  headerTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
    marginTop: 2,
  },

  headerPlaceholder: {
    width: 42,
  },

  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },

  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },

  adminBannerText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },

  card: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  passwordCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  passwordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  inputLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
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

  roleList: {
    gap: spacing.md,
    marginTop: spacing.md,
  },

  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },

  selectedRoleCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },

  radio: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.round,
  },

  selectedRadio: {
    borderColor: colors.primary,
  },

  radioCenter: {
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
    fontSize: fontSize.sm,
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

  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  activeInformation: {
    flex: 1,
    marginRight: spacing.md,
  },

  activeDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginTop: spacing.xs,
  },

  protectionText: {
    color: colors.warning,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginTop: spacing.md,
  },

  saveButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },

  saveButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  passwordInputContainer: {
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

  passwordButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },

  passwordButtonText: {
    color: colors.warning,
    fontSize: fontSize.sm,
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
    textAlign: 'center',
    marginTop: spacing.lg,
  },

  stateDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  primaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    marginTop: spacing.xl,
  },

  primaryButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },

  pressed: {
    opacity: 0.72,
  },

  disabled: {
    opacity: 0.5,
  },
});