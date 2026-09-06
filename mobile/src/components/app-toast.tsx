import { Ionicons } from '@expo/vector-icons';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  colors,
  fontSize,
  radius,
  spacing,
} from '../theme';

export type AppToastVariant =
  | 'success'
  | 'error'
  | 'warning'
  | 'info';

export type ShowAppToastOptions = {
  title: string;
  message?: string;
  variant?: AppToastVariant;
  duration?: number;
};

type VisibleToast = Required<
  Pick<ShowAppToastOptions, 'title' | 'variant'>
> &
  Pick<ShowAppToastOptions, 'message'>;

type AppToastContextValue = {
  showToast: (options: ShowAppToastOptions) => void;
  hideToast: () => void;
};

const AppToastContext =
  createContext<AppToastContextValue | null>(null);

function getVariantPresentation(
  variant: AppToastVariant,
) {
  switch (variant) {
    case 'success':
      return {
        icon: 'checkmark-circle' as const,
        color: colors.success,
        backgroundColor: colors.successSoft,
      };
    case 'error':
      return {
        icon: 'alert-circle' as const,
        color: colors.danger,
        backgroundColor: colors.dangerSoft,
      };
    case 'warning':
      return {
        icon: 'warning' as const,
        color: colors.warning,
        backgroundColor: colors.warningSoft,
      };
    default:
      return {
        icon: 'information-circle' as const,
        color: colors.primary,
        backgroundColor: colors.primarySoft,
      };
  }
}

export function AppToastProvider({
  children,
}: {
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] =
    useState<VisibleToast | null>(null);
  const [translateY] = useState(
    () => new Animated.Value(120),
  );
  const [opacity] = useState(
    () => new Animated.Value(0),
  );
  const timeoutReference =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutReference.current) {
      clearTimeout(timeoutReference.current);
      timeoutReference.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    clearTimer();

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 120,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setToast(null);
      }
    });
  }, [clearTimer, opacity, translateY]);

  const showToast = useCallback(
    (options: ShowAppToastOptions) => {
      clearTimer();
      translateY.stopAnimation();
      opacity.stopAnimation();
      translateY.setValue(120);
      opacity.setValue(0);

      setToast({
        title: options.title,
        message: options.message,
        variant: options.variant ?? 'info',
      });

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 18,
          stiffness: 210,
          mass: 0.8,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 170,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();

      timeoutReference.current = setTimeout(
        hideToast,
        options.duration ?? 3500,
      );
    },
    [
      clearTimer,
      hideToast,
      opacity,
      translateY,
    ],
  );

  useEffect(
    () => () => {
      clearTimer();
      translateY.stopAnimation();
      opacity.stopAnimation();
    },
    [clearTimer, opacity, translateY],
  );

  const presentation = toast
    ? getVariantPresentation(toast.variant)
    : getVariantPresentation('info');

  return (
    <AppToastContext.Provider
      value={{ showToast, hideToast }}
    >
      {children}

      <Modal
        visible={toast !== null}
        transparent
        animationType="none"
        statusBarTranslucent
        navigationBarTranslucent
        hardwareAccelerated
        onRequestClose={hideToast}
      >
        <View
          pointerEvents="box-none"
          style={styles.modalLayer}
        >
          {toast ? (
            <Animated.View
              accessibilityLiveRegion="assertive"
              accessibilityRole="alert"
              style={[
                styles.toast,
                {
                  marginBottom:
                    Math.max(insets.bottom, spacing.md),
                  opacity,
                  borderColor: presentation.color,
                  transform: [{ translateY }],
                },
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor:
                      presentation.backgroundColor,
                  },
                ]}
              >
                <Ionicons
                  name={presentation.icon}
                  size={24}
                  color={presentation.color}
                />
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.title}>
                  {toast.title}
                </Text>
                {toast.message ? (
                  <Text style={styles.message}>
                    {toast.message}
                  </Text>
                ) : null}
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Bildirişi bağla"
                hitSlop={10}
                onPress={hideToast}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            </Animated.View>
          ) : null}
        </View>
      </Modal>
    </AppToastContext.Provider>
  );
}

export function useAppToast(): AppToastContextValue {
  const context = useContext(AppToastContext);

  if (!context) {
    throw new Error(
      'useAppToast AppToastProvider daxilində istifadə edilməlidir.',
    );
  }

  return context;
}

const styles = StyleSheet.create({
  modalLayer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    zIndex: 2147483647,
    elevation: 9999,
  },
  toast: {
    width: '100%',
    maxWidth: 620,
    minHeight: 72,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    boxShadow: '0 12px 35px rgba(24, 34, 48, 0.24)',
    elevation: 9999,
  },
  iconContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  textContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  message: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    borderRadius: radius.md,
  },
  pressed: {
    opacity: 0.58,
  },
});
