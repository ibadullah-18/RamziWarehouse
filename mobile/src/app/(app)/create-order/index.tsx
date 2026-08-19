import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createOrder,
  getActiveWarehouses,
  getProductSuggestions,
} from '../../../api/create-order-api';
import { useAuth } from '../../../auth/auth-context';
import {
  canManageOperations,
} from '../../../auth/permissions';
import {
  CustomerPickerModal,
} from '../../../components/customer-picker-modal';
import {
  Customer,
  DraftOrderItem,
  ProductSuggestion,
  ProductType,
  Warehouse,
} from '../../../features/orders/create-order-types';
import {
  colors,
  fontSize,
  radius,
  spacing,
} from '../../../theme';

type DraftValidationResult =
  | {
      item: DraftOrderItem;
      error: null;
    }
  | {
      item: null;
      error: string;
    };

function createLocalId() {
  return (
    `${Date.now()}-` +
    `${Math.random().toString(36).slice(2)}`
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Qaimə yaradılmadı.';
}

function getProductTypeLabel(
  productType: ProductType,
) {
  return productType ===
    ProductType.Showcase
    ? 'Vitrin'
    : 'Aboy';
}

function normalizeComparisonValue(
  value: string,
) {
  return value
    .trim()
    .toLocaleUpperCase('az-AZ');
}

export default function CreateOrderScreen() {
  const { session } = useAuth();

  const accessToken =
    session?.accessToken;

  const productCodeInputRef =
    useRef<TextInput>(null);

  const partyNumberInputRef =
    useRef<TextInput>(null);

  const [orderNumber, setOrderNumber] =
    useState('');

  const [
    selectedCustomer,
    setSelectedCustomer,
  ] = useState<Customer | null>(null);

  const [
    isCustomerPickerVisible,
    setIsCustomerPickerVisible,
  ] = useState(false);

  const [warehouses, setWarehouses] =
    useState<Warehouse[]>([]);

  const [
    selectedWarehouseId,
    setSelectedWarehouseId,
  ] = useState('');

  const [
    isWarehousesLoading,
    setIsWarehousesLoading,
  ] = useState(true);

  const [
    warehouseError,
    setWarehouseError,
  ] = useState<string | null>(null);

  const [
    warehouseReloadNumber,
    setWarehouseReloadNumber,
  ] = useState(0);

  const [note, setNote] =
    useState('');

  const [isNoteVisible, setIsNoteVisible] =
    useState(false);

  const [items, setItems] =
    useState<DraftOrderItem[]>([]);

  const [
    editingItemId,
    setEditingItemId,
  ] = useState<string | null>(null);

  const [
    productCode,
    setProductCode,
  ] = useState('');

  const [
    partyNumber,
    setPartyNumber,
  ] = useState('');

  const [
    productType,
    setProductType,
  ] = useState<ProductType>(
    ProductType.Product,
  );

  const [quantity, setQuantity] =
    useState(1);

  const [
    suggestions,
    setSuggestions,
  ] = useState<ProductSuggestion[]>([]);

  const [
    suggestionsVisible,
    setSuggestionsVisible,
  ] = useState(false);

  const [
    suggestionsLoading,
    setSuggestionsLoading,
  ] = useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const todayLabel =
    new Date().toLocaleDateString(
      'az-AZ',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      },
    );

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isActive = true;

    const currentAccessToken =
      accessToken;

    async function loadWarehouses() {
      try {
        const result =
          await getActiveWarehouses(
            currentAccessToken,
          );

        if (!isActive) {
          return;
        }

        setWarehouses(result);
        setWarehouseError(null);

        const mainWarehouse =
          result.find(warehouse =>
            warehouse.name
              .trim()
              .toLocaleLowerCase('az-AZ')
              .includes('əsas'),
          ) ?? result[0];

        if (mainWarehouse) {
          setSelectedWarehouseId(
            mainWarehouse.id,
          );
        }
      } catch (error) {
        if (isActive) {
          setWarehouseError(
            getErrorMessage(error),
          );
        }
      } finally {
        if (isActive) {
          setIsWarehousesLoading(false);
        }
      }
    }

    void loadWarehouses();

    return () => {
      isActive = false;
    };
  }, [
    accessToken,
    warehouseReloadNumber,
  ]);

  useEffect(() => {
    if (
      !accessToken ||
      !suggestionsVisible
    ) {
      return;
    }

    let isActive = true;

    const currentAccessToken =
      accessToken;

    const currentSearch =
      productCode.trim() ||
      partyNumber.trim();

    const timeoutId = setTimeout(() => {
      async function loadSuggestions() {
        try {
          const result =
            await getProductSuggestions(
              currentAccessToken,
              currentSearch,
              8,
            );

          if (isActive) {
            setSuggestions(result);
          }
        } catch {
          if (isActive) {
            setSuggestions([]);
          }
        } finally {
          if (isActive) {
            setSuggestionsLoading(false);
          }
        }
      }

      void loadSuggestions();
    }, 180);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [
    accessToken,
    partyNumber,
    productCode,
    suggestionsVisible,
  ]);

  function changeProductCode(
    value: string,
  ) {
    setProductCode(value);
    setSuggestionsVisible(true);
    setSuggestionsLoading(true);
  }

  function changePartyNumber(
    value: string,
  ) {
    setPartyNumber(value);
    setSuggestionsVisible(true);
    setSuggestionsLoading(true);
  }

  function selectSuggestion(
    suggestion: ProductSuggestion,
  ) {
    setProductCode(
      suggestion.productCode,
    );

    setPartyNumber(
      suggestion.partyNumber,
    );

    setProductType(
      suggestion.productType,
    );

    setSuggestionsVisible(false);

    setTimeout(() => {
      partyNumberInputRef.current?.focus();
    }, 50);
  }

  function changeQuantity(
    nextQuantity: number,
  ) {
    setQuantity(
      Math.min(
        Math.max(nextQuantity, 1),
        100000,
      ),
    );
  }

  function validateDraftItem(
    localId: string,
  ): DraftValidationResult {
    const normalizedProductCode =
      productCode.trim();

    const normalizedPartyNumber =
      partyNumber.trim();

    if (!normalizedProductCode) {
      return {
        item: null,
        error: 'Məhsul kodunu yazın.',
      };
    }

    if (!normalizedPartyNumber) {
      return {
        item: null,
        error: 'Partiya nömrəsini yazın.',
      };
    }

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return {
        item: null,
        error:
          'Məhsul sayı sıfırdan böyük olmalıdır.',
      };
    }

    const duplicateExists =
      items.some(item => {
        if (
          editingItemId &&
          item.localId === editingItemId
        ) {
          return false;
        }

        return (
          normalizeComparisonValue(
            item.productCode,
          ) ===
            normalizeComparisonValue(
              normalizedProductCode,
            ) &&
          normalizeComparisonValue(
            item.partyNumber,
          ) ===
            normalizeComparisonValue(
              normalizedPartyNumber,
            ) &&
          item.productType === productType
        );
      });

    if (duplicateExists) {
      return {
        item: null,
        error:
          'Bu kod, partiya və məhsul növü artıq siyahıda var.',
      };
    }

    return {
      item: {
        localId,
        productCode:
          normalizedProductCode,
        partyNumber:
          normalizedPartyNumber,
        productType,
        quantity,
      },
      error: null,
    };
  }

  function resetDraftItem() {
    setEditingItemId(null);
    setProductCode('');
    setPartyNumber('');
    setProductType(
      ProductType.Product,
    );
    setQuantity(1);
    setSuggestions([]);
    setSuggestionsVisible(false);

    setTimeout(() => {
      productCodeInputRef.current?.focus();
    }, 80);
  }

  function saveDraftItem() {
    const localId =
      editingItemId ??
      createLocalId();

    const result =
      validateDraftItem(localId);

    if (result.error || !result.item) {
      Alert.alert(
        'Məhsulu yoxlayın',
        result.error ??
          'Məhsul məlumatları düzgün deyil.',
      );

      return;
    }

    if (editingItemId) {
      setItems(currentItems =>
        currentItems.map(item =>
          item.localId ===
          editingItemId
            ? result.item!
            : item,
        ),
      );
    } else {
      setItems(currentItems => [
        ...currentItems,
        result.item!,
      ]);
    }

    resetDraftItem();
  }

  function editItem(
    item: DraftOrderItem,
  ) {
    setEditingItemId(item.localId);
    setProductCode(item.productCode);
    setPartyNumber(item.partyNumber);
    setProductType(item.productType);
    setQuantity(item.quantity);
    setSuggestionsVisible(false);

    setTimeout(() => {
      productCodeInputRef.current?.focus();
    }, 80);
  }

  function removeItem(
    localId: string,
  ) {
    setItems(currentItems =>
      currentItems.filter(
        item =>
          item.localId !== localId,
      ),
    );

    if (editingItemId === localId) {
      resetDraftItem();
    }
  }

  async function submitOrder() {
    if (
      !accessToken ||
      !canManageOperations(session?.role) ||
      isSaving
    ) {
      return;
    }

    const normalizedOrderNumber =
      orderNumber.trim();

    if (!normalizedOrderNumber) {
      Alert.alert(
        'Qaimə nömrəsi yoxdur',
        'Qaimə nömrəsini yazın.',
      );

      return;
    }

    if (!selectedCustomer) {
      Alert.alert(
        'Müştəri seçilməyib',
        'Qaimə üçün müştəri seçin.',
      );

      return;
    }

    if (!selectedWarehouseId) {
      Alert.alert(
        'Anbar seçilməyib',
        'Məhsulların çıxdığı anbarı seçin.',
      );

      return;
    }

    let submissionItems = [...items];

    const hasUnfinishedDraft =
      productCode.trim().length > 0 ||
      partyNumber.trim().length > 0;

    if (hasUnfinishedDraft) {
      const localId =
        editingItemId ??
        createLocalId();

      const result =
        validateDraftItem(localId);

      if (result.error || !result.item) {
        Alert.alert(
          'Son məhsulu yoxlayın',
          result.error ??
            'Məhsul məlumatları düzgün deyil.',
        );

        return;
      }

      if (editingItemId) {
        submissionItems =
          submissionItems.map(item =>
            item.localId ===
            editingItemId
              ? result.item!
              : item,
          );
      } else {
        submissionItems.push(
          result.item,
        );
      }
    }

    if (submissionItems.length === 0) {
      Alert.alert(
        'Məhsul yoxdur',
        'Qaiməyə ən azı bir məhsul əlavə edin.',
      );

      return;
    }

    setIsSaving(true);

    try {
      const createdOrder =
        await createOrder(
          accessToken,
          {
            orderNumber:
              normalizedOrderNumber,

            orderDate:
              new Date().toISOString(),

            customerId:
              selectedCustomer.id,

            warehouseId:
              selectedWarehouseId,

            note:
              note.trim().length > 0
                ? note.trim()
                : null,

            items:
              submissionItems.map(item => ({
                productCode:
                  item.productCode,

                partyNumber:
                  item.partyNumber,

                productType:
                  item.productType,

                quantity:
                  item.quantity,
              })),
          },
        );

      router.replace({
        pathname:
          '/order-detail/[id]',
        params: {
          id: createdOrder.id,
        },
      });
    } catch (error) {
      Alert.alert(
        'Qaimə yaradılmadı',
        getErrorMessage(error),
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (
    !canManageOperations(session?.role)
  ) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.accessDenied}>
          <Ionicons
            name="lock-closed-outline"
            size={42}
            color={colors.danger}
          />

          <Text
            style={styles.accessDeniedTitle}
          >
            İcazəniz yoxdur
          </Text>

          <Text
            style={
              styles.accessDeniedDescription
            }
          >
            Yeni qaiməni yalnız menecer
            yarada bilər.
          </Text>

          <Pressable
            onPress={() => router.back()}
            style={styles.primaryButton}
          >
            <Text
              style={styles.primaryButtonText}
            >
              Geri qayıt
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <View style={styles.header}>
          <Pressable
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

          <View style={styles.headerText}>
            <Text style={styles.headerCaption}>
              RAM COLLECTION
            </Text>

            <Text style={styles.headerTitle}>
              Yeni qaimə
            </Text>
          </View>

          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.scrollContent
          }
        >
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionNumber}>
                <Text
                  style={styles.sectionNumberText}
                >
                  1
                </Text>
              </View>

              <Text style={styles.sectionTitle}>
                Qaimə məlumatları
              </Text>
            </View>

            <Text style={styles.inputLabel}>
              Qaimə nömrəsi
            </Text>

            <TextInput
              value={orderNumber}
              onChangeText={setOrderNumber}
              placeholder="Məsələn: 10524"
              placeholderTextColor={
                colors.textLight
              }
              autoFocus
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => {
                setIsCustomerPickerVisible(
                  true,
                );
              }}
              style={styles.textInput}
            />

            <View style={styles.dateCard}>
              <View style={styles.dateIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>

              <View style={styles.dateInformation}>
                <Text style={styles.dateLabel}>
                  Qaimə tarixi
                </Text>

                <Text style={styles.dateValue}>
                  Bu gün · {todayLabel}
                </Text>
              </View>

              <Ionicons
                name="checkmark-circle"
                size={21}
                color={colors.success}
              />
            </View>

            <Text style={styles.inputLabel}>
              Müştəri
            </Text>

            <Pressable
              onPress={() => {
                setIsCustomerPickerVisible(
                  true,
                );
              }}
              style={({ pressed }) => [
                styles.selectionCard,
                selectedCustomer &&
                  styles.selectionCardSelected,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.selectionIcon}>
                <Ionicons
                  name="storefront-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>

              <View
                style={styles.selectionInformation}
              >
                <Text
                  style={
                    selectedCustomer
                      ? styles.selectionValue
                      : styles.selectionPlaceholder
                  }
                >
                  {selectedCustomer
                    ? selectedCustomer.name
                    : 'Müştəri seç'}
                </Text>

                {selectedCustomer ? (
                  <Text style={styles.selectionMeta}>
                    {selectedCustomer.phoneNumber ??
                      selectedCustomer.note ??
                      'Aktiv müştəri'}
                  </Text>
                ) : null}
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textLight}
              />
            </Pressable>

            <Text style={styles.inputLabel}>
              Anbar
            </Text>

            {isWarehousesLoading ? (
              <View style={styles.inlineLoading}>
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                />

                <Text
                  style={styles.inlineLoadingText}
                >
                  Anbarlar alınır...
                </Text>
              </View>
            ) : warehouseError ? (
              <Pressable
                onPress={() => {
                  setIsWarehousesLoading(
                    true,
                  );

                  setWarehouseReloadNumber(
                    value => value + 1,
                  );
                }}
                style={styles.errorCard}
              >
                <Ionicons
                  name="warning-outline"
                  size={20}
                  color={colors.danger}
                />

                <Text style={styles.errorText}>
                  {warehouseError}
                </Text>

                <Ionicons
                  name="refresh"
                  size={19}
                  color={colors.danger}
                />
              </Pressable>
            ) : (
              <View style={styles.warehouseList}>
                {warehouses.map(warehouse => {
                  const isSelected =
                    warehouse.id ===
                    selectedWarehouseId;

                  return (
                    <Pressable
                      key={warehouse.id}
                      onPress={() => {
                        setSelectedWarehouseId(
                          warehouse.id,
                        );
                      }}
                      style={({ pressed }) => [
                        styles.warehouseChip,
                        isSelected &&
                          styles.warehouseChipSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons
                        name={
                          isSelected
                            ? 'checkmark-circle'
                            : 'cube-outline'
                        }
                        size={18}
                        color={
                          isSelected
                            ? colors.white
                            : colors.primary
                        }
                      />

                      <Text
                        style={[
                          styles.warehouseText,
                          isSelected &&
                            styles.warehouseTextSelected,
                        ]}
                      >
                        {warehouse.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionNumber}>
                <Text
                  style={styles.sectionNumberText}
                >
                  2
                </Text>
              </View>

              <View style={styles.sectionTitleArea}>
                <Text style={styles.sectionTitle}>
                  Məhsullar
                </Text>

                <Text style={styles.sectionSubtitle}>
                  {items.length > 0
                    ? `${items.length} məhsul sətri əlavə edilib`
                    : 'Kod və partiyanı yazın'}
                </Text>
              </View>
            </View>

            {items.map((item, index) => (
              <Pressable
                key={item.localId}
                onPress={() => editItem(item)}
                style={({ pressed }) => [
                  styles.addedItem,
                  item.localId ===
                    editingItemId &&
                    styles.addedItemEditing,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.itemNumber}>
                  <Text
                    style={styles.itemNumberText}
                  >
                    {index + 1}
                  </Text>
                </View>

                <View style={styles.itemInformation}>
                  <Text style={styles.itemCode}>
                    {item.productCode}
                  </Text>

                  <Text style={styles.itemMeta}>
                    Partiya: {item.partyNumber}
                    {'  •  '}
                    {getProductTypeLabel(
                      item.productType,
                    )}
                  </Text>
                </View>

                <View style={styles.itemQuantity}>
                  <Text
                    style={styles.itemQuantityValue}
                  >
                    {item.quantity}
                  </Text>

                  <Text
                    style={styles.itemQuantityLabel}
                  >
                    ədəd
                  </Text>
                </View>

                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    removeItem(
                      item.localId,
                    );
                  }}
                  style={styles.deleteItemButton}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={colors.danger}
                  />
                </Pressable>
              </Pressable>
            ))}

            {editingItemId ? (
              <View style={styles.editingBanner}>
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={colors.warning}
                />

                <Text style={styles.editingText}>
                  Məhsulu redaktə edirsiniz
                </Text>

                <Pressable
                  onPress={resetDraftItem}
                >
                  <Text
                    style={styles.cancelEditingText}
                  >
                    Ləğv et
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>
              Məhsul kodu
            </Text>

            <TextInput
              ref={productCodeInputRef}
              value={productCode}
              onChangeText={changeProductCode}
              onFocus={() => {
                setSuggestionsVisible(true);
                setSuggestionsLoading(true);
              }}
              onSubmitEditing={() => {
                partyNumberInputRef.current?.focus();
              }}
              placeholder="Məsələn: 5004"
              placeholderTextColor={
                colors.textLight
              }
              autoCorrect={false}
              returnKeyType="next"
              style={styles.textInput}
            />

            {suggestionsVisible ? (
              <View style={styles.suggestionsBox}>
                <View
                  style={styles.suggestionsHeader}
                >
                  <Text
                    style={styles.suggestionsTitle}
                  >
                    {productCode.trim() ||
                    partyNumber.trim()
                      ? 'Uyğun əvvəlki məhsullar'
                      : 'Son istifadə olunanlar'}
                  </Text>

                  <Pressable
                    onPress={() => {
                      setSuggestionsVisible(
                        false,
                      );
                    }}
                  >
                    <Ionicons
                      name="close"
                      size={19}
                      color={colors.textLight}
                    />
                  </Pressable>
                </View>

                {suggestionsLoading ? (
                  <View
                    style={
                      styles.suggestionsLoading
                    }
                  >
                    <ActivityIndicator
                      size="small"
                      color={colors.primary}
                    />
                  </View>
                ) : suggestions.length > 0 ? (
                  suggestions.map(suggestion => (
                    <Pressable
                      key={
                        `${suggestion.productCode}-` +
                        `${suggestion.partyNumber}-` +
                        `${suggestion.productType}`
                      }
                      onPress={() => {
                        selectSuggestion(
                          suggestion,
                        );
                      }}
                      style={({ pressed }) => [
                        styles.suggestionRow,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View
                        style={
                          styles.suggestionCodeBox
                        }
                      >
                        <Text
                          style={
                            styles.suggestionCode
                          }
                        >
                          {suggestion.productCode}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.suggestionInformation
                        }
                      >
                        <Text
                          style={
                            styles.suggestionParty
                          }
                        >
                          Partiya{' '}
                          {suggestion.partyNumber}
                        </Text>

                        <Text
                          style={
                            styles.suggestionMeta
                          }
                        >
                          {getProductTypeLabel(
                            suggestion.productType,
                          )}
                          {'  •  '}
                          {suggestion.usageCount}
                          dəfə istifadə olunub
                        </Text>
                      </View>

                      <Ionicons
                        name="add-circle"
                        size={21}
                        color={colors.primary}
                      />
                    </Pressable>
                  ))
                ) : (
                  <Text
                    style={styles.noSuggestionText}
                  >
                    Əvvəl istifadə olunmuş uyğun
                    məhsul tapılmadı.
                  </Text>
                )}
              </View>
            ) : null}

            <Text style={styles.inputLabel}>
              Partiya nömrəsi
            </Text>

            <TextInput
              ref={partyNumberInputRef}
              value={partyNumber}
              onChangeText={changePartyNumber}
              onFocus={() => {
                setSuggestionsVisible(true);
                setSuggestionsLoading(true);
              }}
              placeholder="Məsələn: 814"
              placeholderTextColor={
                colors.textLight
              }
              autoCorrect={false}
              returnKeyType="done"
              style={styles.textInput}
            />

            <Text style={styles.inputLabel}>
              Məhsul növü
            </Text>

            <View style={styles.typeSelector}>
              <Pressable
                onPress={() => {
                  setProductType(
                    ProductType.Product,
                  );
                }}
                style={[
                  styles.typeButton,
                  productType ===
                    ProductType.Product &&
                    styles.typeButtonSelected,
                ]}
              >
                <Ionicons
                  name="albums-outline"
                  size={18}
                  color={
                    productType ===
                    ProductType.Product
                      ? colors.white
                      : colors.primary
                  }
                />

                <Text
                  style={[
                    styles.typeText,
                    productType ===
                      ProductType.Product &&
                      styles.typeTextSelected,
                  ]}
                >
                  Aboy
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setProductType(
                    ProductType.Showcase,
                  );
                }}
                style={[
                  styles.typeButton,
                  productType ===
                    ProductType.Showcase &&
                    styles.typeButtonSelected,
                ]}
              >
                <Ionicons
                  name="easel-outline"
                  size={18}
                  color={
                    productType ===
                    ProductType.Showcase
                      ? colors.white
                      : colors.primary
                  }
                />

                <Text
                  style={[
                    styles.typeText,
                    productType ===
                      ProductType.Showcase &&
                      styles.typeTextSelected,
                  ]}
                >
                  Vitrin
                </Text>
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>
              Say
            </Text>

            <View style={styles.quantityContainer}>
              <Pressable
                onPress={() => {
                  changeQuantity(
                    quantity - 1,
                  );
                }}
                style={styles.quantityButton}
              >
                <Ionicons
                  name="remove"
                  size={22}
                  color={colors.primary}
                />
              </Pressable>

              <TextInput
                value={String(quantity)}
                onChangeText={value => {
                  const parsed =
                    Number.parseInt(
                      value.replace(
                        /[^0-9]/g,
                        '',
                      ),
                      10,
                    );

                  changeQuantity(
                    Number.isNaN(parsed)
                      ? 1
                      : parsed,
                  );
                }}
                keyboardType="number-pad"
                selectTextOnFocus
                style={styles.quantityInput}
              />

              <Pressable
                onPress={() => {
                  changeQuantity(
                    quantity + 1,
                  );
                }}
                style={styles.quantityButton}
              >
                <Ionicons
                  name="add"
                  size={22}
                  color={colors.primary}
                />
              </Pressable>
            </View>

            <Pressable
              onPress={saveDraftItem}
              style={({ pressed }) => [
                styles.addItemButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={
                  editingItemId
                    ? 'checkmark'
                    : 'add'
                }
                size={20}
                color={colors.primary}
              />

              <Text
                style={styles.addItemButtonText}
              >
                {editingItemId
                  ? 'Dəyişikliyi yadda saxla'
                  : 'Məhsulu qaiməyə əlavə et'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Pressable
              onPress={() => {
                setIsNoteVisible(
                  currentValue =>
                    !currentValue,
                );
              }}
              style={styles.optionalHeader}
            >
              <View style={styles.optionalTitle}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={colors.primary}
                />

                <Text
                  style={styles.optionalTitleText}
                >
                  Əlavə qeyd
                </Text>

                <View style={styles.optionalBadge}>
                  <Text
                    style={
                      styles.optionalBadgeText
                    }
                  >
                    İstəyə bağlı
                  </Text>
                </View>
              </View>

              <Ionicons
                name={
                  isNoteVisible
                    ? 'chevron-up'
                    : 'chevron-down'
                }
                size={20}
                color={colors.textLight}
              />
            </Pressable>

            {isNoteVisible ? (
              <>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  multiline
                  maxLength={1000}
                  textAlignVertical="top"
                  placeholder="Müştərinin əlavə qeydini yazın..."
                  placeholderTextColor={
                    colors.textLight
                  }
                  style={styles.noteInput}
                />

                <Text
                  style={styles.characterCount}
                >
                  {note.length}/1000
                </Text>
              </>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerSummary}>
            <Text style={styles.footerLabel}>
              Məhsul sayı
            </Text>

            <Text style={styles.footerValue}>
              {items.reduce(
                (total, item) =>
                  total + item.quantity,
                0,
              )}
            </Text>
          </View>

          <Pressable
            disabled={isSaving}
            onPress={() => {
              void submitOrder();
            }}
            style={({ pressed }) => [
              styles.createButton,
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
                name="receipt"
                size={20}
                color={colors.white}
              />
            )}

            <Text
              style={styles.createButtonText}
            >
              {isSaving
                ? 'Qaimə yaradılır...'
                : 'Qaiməni yarat'}
            </Text>
          </Pressable>
        </View>

        {accessToken ? (
          <CustomerPickerModal
            visible={
              isCustomerPickerVisible
            }
            accessToken={accessToken}
            selectedCustomerId={
              selectedCustomer?.id
            }
            onClose={() => {
              setIsCustomerPickerVisible(
                false,
              );
            }}
            onSelect={customer => {
              setSelectedCustomer(
                customer,
              );
            }}
          />
        ) : null}
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

  header: {
    minHeight: 62,
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

  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },

  section: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },

  sectionNumber: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.primary,
  },

  sectionNumberText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  sectionTitleArea: {
    flex: 1,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  sectionSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },

  inputLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  textInput: {
    minHeight: 52,
    color: colors.text,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    backgroundColor:
      colors.surfaceSecondary,
  },

  dateCard: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    marginTop: spacing.md,
  },

  dateIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },

  dateInformation: {
    flex: 1,
  },

  dateLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },

  dateValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginTop: 2,
  },

  selectionCard: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    backgroundColor:
      colors.surfaceSecondary,
  },

  selectionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },

  selectionIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },

  selectionInformation: {
    flex: 1,
  },

  selectionPlaceholder: {
    color: colors.textLight,
    fontSize: fontSize.sm,
  },

  selectionValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },

  selectionMeta: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },

  warehouseList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  warehouseChip: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.round,
    backgroundColor: colors.surface,
  },

  warehouseChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },

  warehouseText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  warehouseTextSelected: {
    color: colors.white,
  },

  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },

  inlineLoadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },

  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: fontSize.sm,
  },

  addedItem: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor:
      colors.surfaceSecondary,
    marginBottom: spacing.sm,
  },

  addedItemEditing: {
    borderColor: colors.warning,
    backgroundColor: colors.warningSoft,
  },

  itemNumber: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.primarySoft,
  },

  itemNumberText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },

  itemInformation: {
    flex: 1,
  },

  itemCode: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  itemMeta: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 3,
  },

  itemQuantity: {
    alignItems: 'center',
  },

  itemQuantityValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  itemQuantityLabel: {
    color: colors.textSecondary,
    fontSize: 10,
  },

  deleteItemButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },

  editingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
    marginBottom: spacing.sm,
  },

  editingText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  cancelEditingText: {
    color: colors.warning,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },

  suggestionsBox: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
  },

  suggestionsHeader: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor:
      colors.surfaceSecondary,
  },

  suggestionsTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },

  suggestionsLoading: {
    alignItems: 'center',
    padding: spacing.lg,
  },

  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  suggestionCodeBox: {
    minWidth: 58,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },

  suggestionCode: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  suggestionInformation: {
    flex: 1,
  },

  suggestionParty: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  suggestionMeta: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },

  noSuggestionText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    padding: spacing.lg,
  },

  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  typeButton: {
    minHeight: 46,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },

  typeButtonSelected: {
    backgroundColor: colors.primary,
  },

  typeText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  typeTextSelected: {
    color: colors.white,
  },

  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
  },

  quantityButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },

  quantityInput: {
    width: 72,
    height: 48,
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
    textAlign: 'center',
    backgroundColor: colors.surface,
  },

  addItemButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    marginTop: spacing.lg,
  },

  addItemButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  optionalHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  optionalTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  optionalTitleText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  optionalBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.round,
    backgroundColor:
      colors.surfaceSecondary,
  },

  optionalBadgeText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },

  noteInput: {
    minHeight: 100,
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    backgroundColor:
      colors.surfaceSecondary,
    marginTop: spacing.md,
  },

  characterCount: {
    color: colors.textLight,
    fontSize: fontSize.xs,
    textAlign: 'right',
    marginTop: spacing.xs,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },

  footerSummary: {
    minWidth: 58,
    alignItems: 'center',
  },

  footerLabel: {
    color: colors.textSecondary,
    fontSize: 10,
  },

  footerValue: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },

  createButton: {
    minHeight: 52,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },

  createButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  primaryButton: {
    minHeight: 48,
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

  accessDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },

  accessDeniedTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
    marginTop: spacing.lg,
  },

  accessDeniedDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  pressed: {
    opacity: 0.68,
  },

  disabled: {
    opacity: 0.5,
  },
});