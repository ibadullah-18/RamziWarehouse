import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '../api/auth-api';
import { useAuth } from '../auth/auth-context';
import { BrandLogo } from '../components/brand-logo';
import {
  cardShadow,
  colors,
  fontSize,
  radius,
  spacing,
} from '../theme';

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [username, setUsername] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [
    passwordVisible,
    setPasswordVisible,
  ] = useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const canSubmit =
    username.trim().length > 0 &&
    password.length > 0 &&
    !isSubmitting;

  const handleLogin = async () => {
    if (!canSubmit) {
      return;
    }

    Keyboard.dismiss();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await signIn({
        username: username.trim(),
        password,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          'Giriş zamanı gözlənilməz xəta baş verdi.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUsernameChange = (
    value: string,
  ) => {
    setUsername(value);

    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handlePasswordChange = (
    value: string,
  ) => {
    setPassword(value);

    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.scrollContent
          }
        >
          <View style={styles.content}>
            <Animated.View
              entering={FadeInUp
                .duration(450)
                .springify()}
              style={styles.brandSection}
            >
              <BrandLogo width={286} />

              <Text style={styles.appDescription}>
                Anbar idarəetmə sistemi
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeInDown
                .duration(450)
                .delay(100)
                .springify()}
              style={styles.loginCard}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  Xoş gəlmisiniz
                </Text>

                <Text
                  style={styles.cardDescription}
                >
                  İş hesabınızla sistemə
                  daxil olun
                </Text>
              </View>

              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.label}>
                    İstifadəçi adı
                  </Text>

                  <View
                    style={[
                      styles.inputContainer,
                      errorMessage &&
                        styles.inputContainerError,
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={
                        colors.textSecondary
                      }
                    />

                    <TextInput
                      value={username}
                      onChangeText={
                        handleUsernameChange
                      }
                      placeholder="İstifadəçi adınızı yazın"
                      placeholderTextColor={
                        colors.textLight
                      }
                      editable={!isSubmitting}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      style={styles.input}
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>
                    Şifrə
                  </Text>

                  <View
                    style={[
                      styles.inputContainer,
                      errorMessage &&
                        styles.inputContainerError,
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={
                        colors.textSecondary
                      }
                    />

                    <TextInput
                      value={password}
                      onChangeText={
                        handlePasswordChange
                      }
                      placeholder="Şifrənizi yazın"
                      placeholderTextColor={
                        colors.textLight
                      }
                      editable={!isSubmitting}
                      secureTextEntry={
                        !passwordVisible
                      }
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        void handleLogin();
                      }}
                      style={styles.input}
                    />

                    <Pressable
                      disabled={isSubmitting}
                      onPress={() =>
                        setPasswordVisible(
                          current => !current,
                        )
                      }
                      hitSlop={10}
                      accessibilityRole="button"
                    >
                      <Ionicons
                        name={
                          passwordVisible
                            ? 'eye-off-outline'
                            : 'eye-outline'
                        }
                        size={21}
                        color={
                          colors.textSecondary
                        }
                      />
                    </Pressable>
                  </View>
                </View>

                {errorMessage && (
                  <Animated.View
                    entering={FadeInDown
                      .duration(220)}
                    style={styles.errorContainer}
                  >
                    <Ionicons
                      name="alert-circle-outline"
                      size={20}
                      color={colors.danger}
                    />

                    <Text
                      style={styles.errorText}
                    >
                      {errorMessage}
                    </Text>
                  </Animated.View>
                )}

                <Pressable
                  disabled={!canSubmit}
                  onPress={() => {
                    void handleLogin();
                  }}
                  style={({ pressed }) => [
                    styles.loginButton,
                    !canSubmit &&
                      styles.loginButtonDisabled,
                    pressed &&
                      canSubmit &&
                      styles.loginButtonPressed,
                  ]}
                >
                  {isSubmitting ? (
                    <>
                      <ActivityIndicator
                        size="small"
                        color={colors.white}
                      />

                      <Text
                        style={
                          styles.loginButtonText
                        }
                      >
                        Giriş edilir
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text
                        style={
                          styles.loginButtonText
                        }
                      >
                        Daxil ol
                      </Text>

                      <Ionicons
                        name="arrow-forward"
                        size={20}
                        color={colors.white}
                      />
                    </>
                  )}
                </Pressable>
              </View>
            </Animated.View>

            <View style={styles.sessionInfo}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={colors.success}
              />

              <Text
                style={styles.sessionInfoText}
              >
                Giriş məlumatlarınız
                təhlükəsiz saxlanılacaq.
                Hər dəfə yenidən giriş
                tələb olunmayacaq.
              </Text>
            </View>
          </View>

          <Text style={styles.footer}>
            GrandWall • Daxili anbar sistemi
          </Text>
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

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },

  content: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },

  brandSection: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },

  appDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },

  loginCard: {
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...cardShadow,
  },

  cardHeader: {
    marginBottom: spacing.xxl,
  },

  cardTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },

  cardDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacing.sm,
  },

  form: {
    gap: spacing.xl,
  },

  field: {
    gap: spacing.sm,
  },

  label: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  inputContainer: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    backgroundColor:
      colors.surfaceSecondary,
  },

  inputContainerError: {
    borderColor: colors.danger,
  },

  input: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    paddingVertical: spacing.md,
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },

  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },

  loginButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    marginTop: spacing.xs,
  },

  loginButtonDisabled: {
    opacity: 0.45,
  },

  loginButtonPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.99 }],
  },

  loginButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },

  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xl,
  },

  sessionInfoText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },

  footer: {
    color: colors.textLight,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.xxxl,
  },
});
