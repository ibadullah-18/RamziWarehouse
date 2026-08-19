import { Ionicons } from '@expo/vector-icons';
import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createCustomer,
  getActiveCustomers,
} from '../api/create-order-api';
import type {
  Customer,
} from '../features/orders/create-order-types';
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
  onSelect: (customer: Customer) => void;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Əməliyyat yerinə yetirilmədi.';
}

export function CustomerPickerModal({
  visible,
  accessToken,
  selectedCustomerId,
  onClose,
  onSelect,
}: CustomerPickerModalProps) {
  const nameInputRef =
    useRef<TextInput>(null);

  const phoneInputRef =
    useRef<TextInput>(null);

  const [searchText, setSearchText] =
    useState('');

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [reloadNumber, setReloadNumber] =
    useState(0);

  const [
    isCreateMode,
    setIsCreateMode,
  ] = useState(false);

  const [customerName, setCustomerName] =
    useState('');

  const [
    customerPhoneNumber,
    setCustomerPhoneNumber,
  ] = useState('');

  const [customerNote, setCustomerNote] =
    useState('');

  const [
    createErrorMessage,
    setCreateErrorMessage,
  ] = useState<string | null>(null);

  const [
    isCreatingCustomer,
    setIsCreatingCustomer,
  ] = useState(false);

  useEffect(() => {
    if (!visible || isCreateMode) {
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
    isCreateMode,
    reloadNumber,
    searchText,
    visible,
  ]);

  function resetCreateForm() {
    setCustomerName('');
    setCustomerPhoneNumber('');
    setCustomerNote('');
    setCreateErrorMessage(null);
    setIsCreatingCustomer(false);
  }

  function closePicker() {
    setSearchText('');
    setCustomers([]);
    setIsLoading(true);
    setErrorMessage(null);
    setIsCreateMode(false);
    resetCreateForm();
    onClose();
  }

  function changeSearchText(value: string) {
    setSearchText(value);
    setIsLoading(true);
  }

  function retry() {
    setIsLoading(true);
    setReloadNumber(
      currentValue => currentValue + 1,
    );
  }

  function selectCustomer(
    customer: Customer,
  ) {
    onSelect(customer);
    closePicker();
  }

  function openCreateForm() {
    setCustomerName(searchText.trim());
    setCustomerPhoneNumber('');
    setCustomerNote('');
    setCreateErrorMessage(null);
    setIsCreateMode(true);

    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 150);
  }

  function closeCreateForm() {
    setIsCreateMode(false);
    resetCreateForm();
    setIsLoading(true);

    setTimeout(() => {
      setReloadNumber(
        currentValue =>
          currentValue + 1,
      );
    }, 50);
  }

  async function submitCustomer() {
    if (isCreatingCustomer) {
      return;
    }

    const normalizedName =
      customerName.trim();

    const normalizedPhoneNumber =
      customerPhoneNumber.trim();

    const normalizedNote =
      customerNote.trim();

    if (!normalizedName) {
      setCreateErrorMessage(
        'Müştərinin adını yazın.',
      );

      nameInputRef.current?.focus();
      return;
    }

    if (normalizedName.length > 150) {
      setCreateErrorMessage(
        'Müştəri adı maksimum 150 simvol ola bilər.',
      );

      nameInputRef.current?.focus();
      return;
    }

    if (
      normalizedPhoneNumber &&
      !/^[0-9+\s()-]{7,30}$/.test(
        normalizedPhoneNumber,
      )
    ) {
      setCreateErrorMessage(
        'Telefon nömrəsi düzgün formatda deyil.',
      );

      phoneInputRef.current?.focus();
      return;
    }

    if (normalizedNote.length > 1000) {
      setCreateErrorMessage(
        'Qeyd maksimum 1000 simvol ola bilər.',
      );

      return;
    }

    try {
      setIsCreatingCustomer(true);
      setCreateErrorMessage(null);

      const createdCustomer =
        await createCustomer(
          accessToken,
          {
            name: normalizedName,

            phoneNumber:
              normalizedPhoneNumber ||
              null,

            note:
              normalizedNote ||
              null,
          },
        );

      onSelect(createdCustomer);
      closePicker();
    } catch (error) {
      setCreateErrorMessage(
        getErrorMessage(error),
      );

      setIsCreatingCustomer(false);
    }
  }

  const requestClose = () => {
    if (isCreatingCustomer) {
      return;
    }

    if (isCreateMode) {
      closeCreateForm();
      return;
    }

    closePicker();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={requestClose}
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
              accessibilityLabel={
                isCreateMode
                  ? 'Müştəri siyahısına qayıt'
                  : 'Müştəri seçimini bağla'
              }
              disabled={isCreatingCustomer}
              onPress={
                isCreateMode
                  ? closeCreateForm
                  : closePicker
              }
              style={({ pressed }) => [
                styles.headerButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={
                  isCreateMode
                    ? 'arrow-back'
                    : 'close'
                }
                size={23}
                color={colors.text}
              />
            </Pressable>

            <View style={styles.headerText}>
              <Text style={styles.headerCaption}>
                QAİMƏ
              </Text>

              <Text style={styles.headerTitle}>
                {isCreateMode
                  ? 'Yeni müştəri'
                  : 'Müştəri seç'}
              </Text>
            </View>

            {isCreateMode ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Pəncərəni bağla"
                disabled={isCreatingCustomer}
                onPress={closePicker}
                style={({ pressed }) => [
                  styles.headerButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="close"
                  size={23}
                  color={colors.text}
                />
              </Pressable>
            ) : (
              <View
                style={styles.headerPlaceholder}
              />
            )}
          </View>

          {isCreateMode ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={
                styles.createContent
              }
            >
              <View style={styles.createIntro}>
                <View style={styles.createIntroIcon}>
                  <Ionicons
                    name="person-add-outline"
                    size={25}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.createIntroText}>
                  <Text style={styles.createIntroTitle}>
                    Müştərini sürətli yarat
                  </Text>

                  <Text
                    style={
                      styles.createIntroDescription
                    }
                  >
                    Müştəri yaradıldıqdan sonra
                    qaiməyə avtomatik seçiləcək.
                  </Text>
                </View>
              </View>

              {createErrorMessage ? (
                <View style={styles.errorCard}>
                  <Ionicons
                    name="warning-outline"
                    size={21}
                    color={colors.danger}
                  />

                  <Text
                    style={
                      styles.createErrorText
                    }
                  >
                    {createErrorMessage}
                  </Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>
                Müştəri adı
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="storefront-outline"
                  size={20}
                  color={colors.textLight}
                />

                <TextInput
                  ref={nameInputRef}
                  value={customerName}
                  onChangeText={value => {
                    setCustomerName(value);
                    setCreateErrorMessage(null);
                  }}
                  placeholder="Məsələn, Ruslan Aboy"
                  placeholderTextColor={
                    colors.textLight
                  }
                  maxLength={150}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => {
                    phoneInputRef.current?.focus();
                  }}
                  style={styles.input}
                />
              </View>

              <Text style={styles.inputLabel}>
                Telefon nömrəsi
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={colors.textLight}
                />

                <TextInput
                  ref={phoneInputRef}
                  value={customerPhoneNumber}
                  onChangeText={value => {
                    setCustomerPhoneNumber(
                      value,
                    );

                    setCreateErrorMessage(null);
                  }}
                  placeholder="+994 50 000 00 00"
                  placeholderTextColor={
                    colors.textLight
                  }
                  maxLength={30}
                  keyboardType="phone-pad"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>

              <Text style={styles.optionalText}>
                Telefon məcburi deyil. Ancaq
                WhatsApp paylaşımı üçün yazılması
                məsləhətdir.
              </Text>

              <Text style={styles.inputLabel}>
                Əlavə qeyd
              </Text>

              <View
                style={[
                  styles.inputContainer,
                  styles.noteContainer,
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={colors.textLight}
                  style={styles.noteIcon}
                />

                <TextInput
                  value={customerNote}
                  onChangeText={value => {
                    setCustomerNote(value);
                    setCreateErrorMessage(null);
                  }}
                  placeholder="Müştəri haqqında əlavə məlumat..."
                  placeholderTextColor={
                    colors.textLight
                  }
                  maxLength={1000}
                  multiline
                  textAlignVertical="top"
                  style={[
                    styles.input,
                    styles.noteInput,
                  ]}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={isCreatingCustomer}
                onPress={() => {
                  void submitCustomer();
                }}
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.pressed,
                  isCreatingCustomer &&
                    styles.disabled,
                ]}
              >
                {isCreatingCustomer ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.white}
                  />
                ) : (
                  <Ionicons
                    name="checkmark"
                    size={22}
                    color={colors.white}
                  />
                )}

                <Text style={styles.saveButtonText}>
                  {isCreatingCustomer
                    ? 'Müştəri yaradılır...'
                    : 'Yarat və qaiməyə seç'}
                </Text>
              </Pressable>

              <Pressable
                disabled={isCreatingCustomer}
                onPress={closeCreateForm}
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={styles.cancelButtonText}
                >
                  Müştəri siyahısına qayıt
                </Text>
              </Pressable>
            </ScrollView>
          ) : (
            <>
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

              <Pressable
                onPress={openCreateForm}
                style={({ pressed }) => [
                  styles.newCustomerButton,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={
                    styles.newCustomerIcon
                  }
                >
                  <Ionicons
                    name="person-add-outline"
                    size={21}
                    color={colors.white}
                  />
                </View>

                <View
                  style={
                    styles.newCustomerInformation
                  }
                >
                  <Text
                    style={
                      styles.newCustomerTitle
                    }
                  >
                    Yeni müştəri yarat
                  </Text>

                  <Text
                    style={
                      styles.newCustomerDescription
                    }
                  >
                    Siyahıda olmayan müştərini
                    dərhal əlavə et
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.primary}
                />
              </Pressable>

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
                      style={
                        styles.errorDescription
                      }
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
                data={
                  isLoading
                    ? []
                    : customers
                }
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
                        pressed &&
                          styles.pressed,
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
                          style={
                            styles.customerName
                          }
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>

                        <Text
                          style={
                            styles.customerMeta
                          }
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
                          color={
                            colors.textLight
                          }
                        />
                      )}
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  isLoading ? (
                    <View
                      style={
                        styles.stateContainer
                      }
                    >
                      <ActivityIndicator
                        size="small"
                        color={colors.primary}
                      />

                      <Text
                        style={styles.stateText}
                      >
                        Müştərilər alınır...
                      </Text>
                    </View>
                  ) : !errorMessage ? (
                    <View
                      style={
                        styles.stateContainer
                      }
                    >
                      <View
                        style={styles.emptyIcon}
                      >
                        <Ionicons
                          name="storefront-outline"
                          size={28}
                          color={colors.primary}
                        />
                      </View>

                      <Text
                        style={styles.emptyTitle}
                      >
                        Müştəri tapılmadı
                      </Text>

                      <Text
                        style={
                          styles.emptyDescription
                        }
                      >
                        Yeni müştəri yarat
                        düyməsindən istifadə edin.
                      </Text>
                    </View>
                  ) : null
                }
              />
            </>
          )}
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

  headerButton: {
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
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
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

  newCustomerButton: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },

  newCustomerIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },

  newCustomerInformation: {
    flex: 1,
  },

  newCustomerTitle: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  newCustomerDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 3,
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
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

  createErrorText: {
    flex: 1,
    color: colors.danger,
    fontSize: fontSize.sm,
    fontWeight: '600',
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
    textAlign: 'center',
  },

  createContent: {
    padding: spacing.lg,
    paddingBottom: 48,
  },

  createIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },

  createIntroIcon: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },

  createIntroText: {
    flex: 1,
  },

  createIntroTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  createIntroDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginTop: 4,
  },

  inputLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },

  inputContainer: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },

  input: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    paddingVertical: spacing.md,
  },

  optionalText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },

  noteContainer: {
    minHeight: 112,
    alignItems: 'flex-start',
  },

  noteIcon: {
    marginTop: spacing.md,
  },

  noteInput: {
    minHeight: 108,
  },

  saveButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
  },

  saveButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  cancelButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },

  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  disabled: {
    opacity: 0.55,
  },

  pressed: {
    opacity: 0.65,
  },
});