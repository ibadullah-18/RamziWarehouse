import { Ionicons } from '@expo/vector-icons';
import {
    useEffect,
    useState,
} from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    getActiveCustomers,
} from '../api/create-order-api';
import { Customer } from '../features/orders/create-order-types';
import {
    colors,
    fontSize,
    radius,
    spacing,
} from '../theme';

type CustomerPickerModalProps = {
  visible: boolean;
  accessToken: string;
  selectedCustomerId?: string;
  onClose: () => void;
  onSelect: (
    customer: Customer,
  ) => void;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Müştərilər alınmadı.';
}

export function CustomerPickerModal({
  visible,
  accessToken,
  selectedCustomerId,
  onClose,
  onSelect,
}: CustomerPickerModalProps) {
  const [searchText, setSearchText] =
    useState('');

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let isActive = true;

    const currentAccessToken =
      accessToken;

    const currentSearch =
      searchText.trim();

    const timeoutId = setTimeout(() => {
      async function loadCustomers() {
        try {
          const result =
            await getActiveCustomers(
              currentAccessToken,
              currentSearch,
            );

          if (isActive) {
            setCustomers(result);
            setErrorMessage(null);
          }
        } catch (error) {
          if (isActive) {
            setErrorMessage(
              getErrorMessage(error),
            );
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      void loadCustomers();
    }, 250);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [
    accessToken,
    searchText,
    visible,
  ]);

  function changeSearchText(
    value: string,
  ) {
    setSearchText(value);
    setIsLoading(true);
  }

  function retry() {
    setIsLoading(true);
    setSearchText(currentValue =>
      currentValue.endsWith(' ')
        ? currentValue.trimEnd()
        : `${currentValue} `,
    );
  }

  function selectCustomer(
    customer: Customer,
  ) {
    onSelect(customer);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent={false}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Müştəri seçimini bağla"
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="close"
                size={23}
                color={colors.text}
              />
            </Pressable>

            <View style={styles.headerText}>
              <Text style={styles.headerCaption}>
                QAİMƏ
              </Text>

              <Text style={styles.headerTitle}>
                Müştəri seç
              </Text>
            </View>

            <View style={styles.headerPlaceholder} />
          </View>

          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={20}
              color={colors.textLight}
            />

            <TextInput
              value={searchText}
              onChangeText={changeSearchText}
              placeholder="Müştərinin adını yaz..."
              placeholderTextColor={
                colors.textLight
              }
              autoFocus
              autoCorrect={false}
              returnKeyType="search"
              style={styles.searchInput}
            />

            {searchText ? (
              <Pressable
                hitSlop={10}
                onPress={() => {
                  changeSearchText('');
                }}
              >
                <Ionicons
                  name="close-circle"
                  size={21}
                  color={colors.textLight}
                />
              </Pressable>
            ) : null}
          </View>

          {errorMessage ? (
            <Pressable
              onPress={retry}
              style={styles.errorCard}
            >
              <Ionicons
                name="warning-outline"
                size={21}
                color={colors.danger}
              />

              <View style={styles.errorContent}>
                <Text style={styles.errorTitle}>
                  Müştərilər açılmadı
                </Text>

                <Text
                  style={styles.errorDescription}
                >
                  {errorMessage}
                </Text>
              </View>

              <Ionicons
                name="refresh"
                size={20}
                color={colors.danger}
              />
            </Pressable>
          ) : null}

          <FlatList
            data={isLoading ? [] : customers}
            keyExtractor={customer =>
              customer.id
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              styles.listContent
            }
            renderItem={({ item }) => {
              const isSelected =
                item.id ===
                selectedCustomerId;

              return (
                <Pressable
                  onPress={() => {
                    selectCustomer(item);
                  }}
                  style={({ pressed }) => [
                    styles.customerCard,
                    isSelected &&
                      styles.customerCardSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[
                      styles.customerIcon,
                      isSelected &&
                        styles.customerIconSelected,
                    ]}
                  >
                    <Ionicons
                      name="storefront-outline"
                      size={20}
                      color={
                        isSelected
                          ? colors.white
                          : colors.primary
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.customerInformation
                    }
                  >
                    <Text
                      style={styles.customerName}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>

                    <Text
                      style={styles.customerMeta}
                      numberOfLines={1}
                    >
                      {item.phoneNumber ??
                        item.note ??
                        'Əlavə məlumat yoxdur'}
                    </Text>
                  </View>

                  {isSelected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={colors.primary}
                    />
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={19}
                      color={colors.textLight}
                    />
                  )}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              isLoading ? (
                <View style={styles.stateContainer}>
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                  />

                  <Text style={styles.stateText}>
                    Müştərilər alınır...
                  </Text>
                </View>
              ) : !errorMessage ? (
                <View style={styles.stateContainer}>
                  <View style={styles.emptyIcon}>
                    <Ionicons
                      name="storefront-outline"
                      size={28}
                      color={colors.primary}
                    />
                  </View>

                  <Text style={styles.emptyTitle}>
                    Müştəri tapılmadı
                  </Text>

                  <Text
                    style={styles.emptyDescription}
                  >
                    Axtarış sözünü yoxlayın.
                  </Text>
                </View>
              ) : null
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
  },

  header: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },

  closeButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor:
      colors.surfaceSecondary,
  },

  headerText: {
    flex: 1,
    alignItems: 'center',
  },

  headerCaption: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '700',
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

  searchContainer: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    paddingVertical: spacing.md,
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#F4C5C9',
    borderRadius: radius.lg,
    backgroundColor: colors.dangerSoft,
  },

  errorContent: {
    flex: 1,
  },

  errorTitle: {
    color: colors.danger,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  errorDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },

  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  customerCard: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },

  customerCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },

  customerIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },

  customerIconSelected: {
    backgroundColor: colors.primary,
  },

  customerInformation: {
    flex: 1,
  },

  customerName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },

  customerMeta: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },

  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
  },

  stateText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.lg,
  },

  emptyDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },

  pressed: {
    opacity: 0.65,
  },
});