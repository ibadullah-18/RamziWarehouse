import { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
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
  getActiveWarehouses,
  getProductSuggestions,
} from '../../../api/create-order-api';
import {
  createProductReturn,
} from '../../../api/product-return-api';
import { useAuth } from '../../../auth/auth-context';
import {
  CustomerPickerModal,
} from '../../../components/customer-picker-modal';
import type {
  Customer,
  ProductSuggestion,
  Warehouse,
} from '../../../features/orders/create-order-types';
import {
  DraftProductReturnItem,
  ProductType,
} from '../../../features/product-returns/product-return-types';
import {
  colors,
  fontSize,
  radius,
  spacing,
} from '../../../theme';

type DraftValidationResult = {
  item: DraftProductReturnItem | null;
  error: string | null;
};

function createLocalId() {
  return (
    `${Date.now()}-` +
    Math.random().toString(36).slice(2)
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Vazvrad yaradılmadı.';
}

function getProductTypeLabel(
  productType: ProductType,
) {
  return productType ===
    ProductType.Showcase
    ? 'Vitrin'
    : 'Vazvrad';
}

function normalizeValue(value: string) {
  return value
    .trim()
    .toLocaleUpperCase('az-AZ');
}

export default function CreateReturnScreen() {
  const { session } = useAuth();

  const accessToken =
    session?.accessToken;

  const productCodeInputRef =
    useRef<TextInput>(null);

  const batchNumberInputRef =
    useRef<TextInput>(null);

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

  const [items, setItems] =
    useState<DraftProductReturnItem[]>([]);

  const [
    editingItemId,
    setEditingItemId,
  ] = useState<string | null>(null);

  const [
    productCode,
    setProductCode,
  ] = useState('');

  const [
    batchNumber,
    setBatchNumber,
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

  const [
    additionalNote,
    setAdditionalNote,
  ] = useState('');

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

  const totalQuantity =
    items.reduce(
      (total, item) =>
        total + item.quantity,
      0,
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
            currentValue =>
              currentValue ||
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
      batchNumber.trim();

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
    batchNumber,
    productCode,
    suggestionsVisible,
  ]);

  function openSuggestions() {
    setSuggestionsVisible(true);
    setSuggestionsLoading(true);
  }

  function changeProductCode(value: string) {
    setProductCode(value);
    setSuggestionsVisible(true);
    setSuggestionsLoading(true);
  }

  function changeBatchNumber(value: string) {
    setBatchNumber(value);
    setSuggestionsVisible(true);
    setSuggestionsLoading(true);
  }

  function selectSuggestion(
    suggestion: ProductSuggestion,
  ) {
    setProductCode(
      suggestion.productCode,
    );

    setBatchNumber(
      suggestion.partyNumber,
    );

    setProductType(
      suggestion.productType === 2
        ? ProductType.Showcase
        : ProductType.Product,
    );

    setSuggestionsVisible(false);

    setTimeout(() => {
      batchNumberInputRef.current?.focus();
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

    const normalizedBatchNumber =
      batchNumber.trim();

    if (!normalizedProductCode) {
      return {
        item: null,
        error: 'Məhsul kodunu yazın.',
      };
    }

    if (!normalizedBatchNumber) {
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
          normalizeValue(
            item.productCode,
          ) ===
            normalizeValue(
              normalizedProductCode,
            ) &&
          normalizeValue(
            item.batchNumber,
          ) ===
            normalizeValue(
              normalizedBatchNumber,
            ) &&
          item.productType === productType
        );
      });

    if (duplicateExists) {
      return {
        item: null,
        error:
          'Bu kod, partiya və növ artıq siyahıda mövcuddur.',
      };
    }

    return {
      item: {
        localId,
        productCode:
          normalizedProductCode,
        batchNumber:
          normalizedBatchNumber,
        quantity,
        productType,
      },
      error: null,
    };
  }

  function resetDraftItem() {
    setEditingItemId(null);
    setProductCode('');
    setBatchNumber('');

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

    if (!result.item) {
      Alert.alert(
        'Məhsulu yoxlayın',
        result.error ??
          'Məhsul məlumatları düzgün deyil.',
      );

      return;
    }

    const validatedItem =
      result.item;

    if (editingItemId) {
      setItems(currentItems =>
        currentItems.map(item =>
          item.localId === editingItemId
            ? validatedItem
            : item,
        ),
      );
    } else {
      setItems(currentItems => [
        ...currentItems,
        validatedItem,
      ]);
    }

    resetDraftItem();
  }

  function editItem(
    item: DraftProductReturnItem,
  ) {
    setEditingItemId(item.localId);
    setProductCode(item.productCode);
    setBatchNumber(item.batchNumber);
    setProductType(item.productType);
    setQuantity(item.quantity);
    setSuggestionsVisible(false);

    setTimeout(() => {
      productCodeInputRef.current?.focus();
    }, 80);
  }

  function removeItem(localId: string) {
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

  async function submitReturn() {
    if (
      !accessToken ||
      isSaving
    ) {
      return;
    }

    if (!selectedCustomer) {
      Alert.alert(
        'Müştəri seçilməyib',
        'Vazvrad üçün müştəri seçin.',
      );

      return;
    }

    if (!selectedWarehouseId) {
      Alert.alert(
        'Anbar seçilməyib',
        'Məhsulların qaytarıldığı anbarı seçin.',
      );

      return;
    }

    let finalItems = [...items];

    const hasDraftInformation =
      Boolean(productCode.trim()) ||
      Boolean(batchNumber.trim());

    if (hasDraftInformation) {
      const draftLocalId =
        editingItemId ??
        createLocalId();

      const result =
        validateDraftItem(
          draftLocalId,
        );

      if (!result.item) {
        Alert.alert(
          'Məhsulu yoxlayın',
          result.error ??
            'Məhsul məlumatları düzgün deyil.',
        );

        return;
      }

      const validatedItem =
        result.item;

      if (editingItemId) {
        finalItems =
          finalItems.map(item =>
            item.localId ===
            editingItemId
              ? validatedItem
              : item,
          );
      } else {
        finalItems.push(
          validatedItem,
        );
      }
    }

    if (finalItems.length === 0) {
      Alert.alert(
        'Məhsul yoxdur',
        'Ən azı bir məhsul əlavə edin.',
      );

      return;
    }

    try {
      setIsSaving(true);

      const createdReturn =
        await createProductReturn(
          accessToken,
          {
            customerId:
              selectedCustomer.id,

            warehouseId:
              selectedWarehouseId,

            additionalNote:
              additionalNote.trim() ||
              null,

            items:
              finalItems.map(item => ({
                productCode:
                  item.productCode,

                batchNumber:
                  item.batchNumber,

                quantity:
                  item.quantity,

                productType:
                  item.productType,
              })),
          },
        );

      router.replace(
        `/return-detail/${createdReturn.id}` as Href,
      );
    } catch (error) {
      Alert.alert(
        'Vazvrad yaradılmadı',
        getErrorMessage(error),
      );
    } finally {
      setIsSaving(false);
    }
  }

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
        <View style={styles.header}>
          <Pressable
            disabled={isSaving}
            onPress={() => {
              router.back();
            }}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={colors.text}
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.headerCaption}>
              VAZVRAD / VİTRİN
            </Text>

            <Text style={styles.headerTitle}>
              Yeni geri qaytarma
            </Text>
          </View>

          <View
            style={
              styles.headerPlaceholder
            }
          />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.scrollContent
          }
        >
          <View style={styles.dateCard}>
            <View style={styles.dateIcon}>
              <Ionicons
                name="calendar-outline"
                size={21}
                color={colors.primary}
              />
            </View>

            <View>
              <Text style={styles.dateLabel}>
                Geri qaytarma tarixi
              </Text>

              <Text style={styles.dateValue}>
                {todayLabel}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionCaption}>
            1. MÜŞTƏRİ VƏ ANBAR
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
                size={22}
                color={colors.primary}
              />
            </View>

            <View
              style={
                styles.selectionInformation
              }
            >
              <Text
                style={styles.selectionLabel}
              >
                Müştəri
              </Text>

              <Text
                style={[
                  styles.selectionValue,

                  !selectedCustomer &&
                    styles.selectionPlaceholder,
                ]}
                numberOfLines={1}
              >
                {selectedCustomer
                  ? selectedCustomer.name
                  : 'Müştəri seçin'}
              </Text>

              {selectedCustomer ? (
                <Text
                  style={styles.selectionMeta}
                  numberOfLines={1}
                >
                  {selectedCustomer.phoneNumber ??
                    selectedCustomer.note ??
                    'Əlavə məlumat yoxdur'}
                </Text>
              ) : null}
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textLight}
            />
          </Pressable>

          <Text style={styles.fieldLabel}>
            Qaytarıldığı anbar
          </Text>

          {isWarehousesLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator
                size="small"
                color={colors.primary}
              />

              <Text style={styles.loadingText}>
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
                  currentValue =>
                    currentValue + 1,
                );
              }}
              style={styles.errorCard}
            >
              <Ionicons
                name="warning-outline"
                size={21}
                color={colors.danger}
              />

              <View style={styles.errorContent}>
                <Text style={styles.errorTitle}>
                  Anbarlar açılmadı
                </Text>

                <Text style={styles.errorText}>
                  {warehouseError}
                </Text>
              </View>

              <Ionicons
                name="refresh"
                size={20}
                color={colors.danger}
              />
            </Pressable>
          ) : (
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.warehouseList
              }
            >
              {warehouses.map(warehouse => {
                const isSelected =
                  selectedWarehouseId ===
                  warehouse.id;

                return (
                  <Pressable
                    key={warehouse.id}
                    onPress={() => {
                      setSelectedWarehouseId(
                        warehouse.id,
                      );
                    }}
                    style={[
                      styles.warehouseChip,

                      isSelected &&
                        styles.warehouseChipSelected,
                    ]}
                  >
                    <Ionicons
                      name={
                        isSelected
                          ? 'checkmark-circle'
                          : 'business-outline'
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
            </ScrollView>
          )}

          <Text style={styles.sectionCaption}>
            2. MƏHSULLAR
          </Text>

          <View style={styles.editorCard}>
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
                  name="arrow-undo-outline"
                  size={19}
                  color={
                    productType ===
                    ProductType.Product
                      ? colors.white
                      : colors.primary
                  }
                />

                <Text
                  style={[
                    styles.typeButtonText,

                    productType ===
                      ProductType.Product &&
                      styles.typeButtonTextSelected,
                  ]}
                >
                  Vazvrad
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
                  name="albums-outline"
                  size={19}
                  color={
                    productType ===
                    ProductType.Showcase
                      ? colors.white
                      : colors.primary
                  }
                />

                <Text
                  style={[
                    styles.typeButtonText,

                    productType ===
                      ProductType.Showcase &&
                      styles.typeButtonTextSelected,
                  ]}
                >
                  Vitrin
                </Text>
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>
              Məhsul kodu
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="barcode-outline"
                size={20}
                color={colors.textLight}
              />

              <TextInput
                ref={productCodeInputRef}
                value={productCode}
                onChangeText={
                  changeProductCode
                }
                onFocus={openSuggestions}
                placeholder="Məsələn, 1017"
                placeholderTextColor={
                  colors.textLight
                }
                maxLength={50}
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => {
                  batchNumberInputRef.current?.focus();
                }}
                style={styles.input}
              />
            </View>

            <Text style={styles.fieldLabel}>
              Partiya nömrəsi
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="layers-outline"
                size={20}
                color={colors.textLight}
              />

              <TextInput
                ref={batchNumberInputRef}
                value={batchNumber}
                onChangeText={
                  changeBatchNumber
                }
                onFocus={openSuggestions}
                placeholder="Məsələn, 130"
                placeholderTextColor={
                  colors.textLight
                }
                maxLength={50}
                autoCorrect={false}
                style={styles.input}
              />
            </View>

            {suggestionsVisible ? (
              <View
                style={styles.suggestionsCard}
              >
                <View
                  style={
                    styles.suggestionHeader
                  }
                >
                  <Text
                    style={
                      styles.suggestionTitle
                    }
                  >
                    Əvvəlki məhsullar
                  </Text>

                  <Pressable
                    hitSlop={10}
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
                      styles.suggestionLoading
                    }
                  >
                    <ActivityIndicator
                      size="small"
                      color={colors.primary}
                    />
                  </View>
                ) : suggestions.length > 0 ? (
                  suggestions.map(
                    suggestion => (
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
                        style={({
                          pressed,
                        }) => [
                          styles.suggestionItem,

                          pressed &&
                            styles.pressed,
                        ]}
                      >
                        <View>
                          <Text
                            style={
                              styles.suggestionCode
                            }
                          >
                            {
                              suggestion.productCode
                            }
                          </Text>

                          <Text
                            style={
                              styles.suggestionMeta
                            }
                          >
                            Partiya{' '}
                            {
                              suggestion.partyNumber
                            }
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.suggestionType
                          }
                        >
                          {suggestion.productType ===
                          2
                            ? 'Vitrin'
                            : 'Aboy'}
                        </Text>
                      </Pressable>
                    ),
                  )
                ) : (
                  <Text
                    style={
                      styles.noSuggestionText
                    }
                  >
                    Uyğun məhsul tapılmadı.
                  </Text>
                )}
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>
              Ədəd
            </Text>

            <View
              style={
                styles.quantityContainer
              }
            >
              <Pressable
                onPress={() => {
                  changeQuantity(
                    quantity - 1,
                  );
                }}
                style={({ pressed }) => [
                  styles.quantityButton,
                  pressed && styles.pressed,
                ]}
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
                  const parsedValue =
                    Number.parseInt(
                      value,
                      10,
                    );

                  changeQuantity(
                    Number.isNaN(
                      parsedValue,
                    )
                      ? 1
                      : parsedValue,
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
                style={({ pressed }) => [
                  styles.quantityButton,
                  pressed && styles.pressed,
                ]}
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
                size={21}
                color={colors.white}
              />

              <Text
                style={
                  styles.addItemButtonText
                }
              >
                {editingItemId
                  ? 'Dəyişikliyi yadda saxla'
                  : 'Məhsulu siyahıya əlavə et'}
              </Text>
            </Pressable>
          </View>

          {items.length > 0 ? (
            <View style={styles.itemsSection}>
              <View style={styles.itemsHeader}>
                <Text style={styles.itemsTitle}>
                  Əlavə edilən məhsullar
                </Text>

                <Text style={styles.itemsCount}>
                  {items.length} sətir
                </Text>
              </View>

              {items.map(item => (
                <View
                  key={item.localId}
                  style={[
                    styles.itemCard,

                    editingItemId ===
                      item.localId &&
                      styles.itemCardEditing,
                  ]}
                >
                  <View
                    style={styles.itemTypeIcon}
                  >
                    <Ionicons
                      name={
                        item.productType ===
                        ProductType.Showcase
                          ? 'albums-outline'
                          : 'arrow-undo-outline'
                      }
                      size={20}
                      color={colors.primary}
                    />
                  </View>

                  <View
                    style={
                      styles.itemInformation
                    }
                  >
                    <Text
                      style={styles.itemCode}
                    >
                      {item.productCode}
                    </Text>

                    <Text
                      style={styles.itemMeta}
                    >
                      Partiya{' '}
                      {item.batchNumber} ·{' '}
                      {getProductTypeLabel(
                        item.productType,
                      )}
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.itemQuantity
                    }
                  >
                    {item.quantity}
                  </Text>

                  <Pressable
                    onPress={() => {
                      editItem(item);
                    }}
                    style={styles.itemAction}
                  >
                    <Ionicons
                      name="create-outline"
                      size={19}
                      color={colors.primary}
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      removeItem(
                        item.localId,
                      );
                    }}
                    style={styles.itemAction}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={19}
                      color={colors.danger}
                    />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={styles.sectionCaption}>
            3. ƏLAVƏ QEYD
          </Text>

          <View style={styles.noteContainer}>
            <TextInput
              value={additionalNote}
              onChangeText={setAdditionalNote}
              placeholder="Geri qaytarma haqqında əlavə məlumat..."
              placeholderTextColor={
                colors.textLight
              }
              multiline
              maxLength={1000}
              textAlignVertical="top"
              style={styles.noteInput}
            />

            <Text style={styles.noteCounter}>
              {additionalNote.length}/1000
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View>
            <Text style={styles.footerLabel}>
              Ümumi məhsul
            </Text>

            <Text style={styles.footerValue}>
              {totalQuantity} ədəd
            </Text>
          </View>

          <Pressable
            disabled={isSaving}
            onPress={() => {
              void submitReturn();
            }}
            style={({ pressed }) => [
              styles.submitButton,

              pressed && styles.pressed,

              isSaving &&
                styles.disabled,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator
                size="small"
                color={colors.white}
              />
            ) : (
              <Ionicons
                name="camera-outline"
                size={21}
                color={colors.white}
              />
            )}

            <Text
              style={
                styles.submitButtonText
              }
            >
              {isSaving
                ? 'Yaradılır...'
                : 'Yarat və şəkil çək'}
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
    letterSpacing: 0.8,
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

  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },

  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.xl,
  },

  dateIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },

  dateLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },

  dateValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
    marginTop: 3,
  },

  sectionCaption: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },

  selectionCard: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },

  selectionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },

  selectionIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },

  selectionInformation: {
    flex: 1,
  },

  selectionLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },

  selectionValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
    marginTop: 3,
  },

  selectionPlaceholder: {
    color: colors.textLight,
    fontWeight: '600',
  },

  selectionMeta: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 3,
  },

  fieldLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },

  loadingCard: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.xl,
  },

  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },

  warehouseList: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },

  warehouseChip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },

  warehouseChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },

  warehouseText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  warehouseTextSelected: {
    color: colors.white,
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#F4C5C9',
    borderRadius: radius.lg,
    backgroundColor: colors.dangerSoft,
    marginBottom: spacing.xl,
  },

  errorContent: {
    flex: 1,
  },

  errorTitle: {
    color: colors.danger,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  errorText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 3,
  },

  editorCard: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  typeButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },

  typeButtonSelected: {
    backgroundColor: colors.primary,
  },

  typeButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  typeButtonTextSelected: {
    color: colors.white,
  },

  inputContainer: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
  },

  input: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    paddingVertical: spacing.md,
  },

  suggestionsCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },

  suggestionHeader: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor:
      colors.surfaceSecondary,
  },

  suggestionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },

  suggestionLoading: {
    padding: spacing.md,
  },

  suggestionItem: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  suggestionCode: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  suggestionMeta: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },

  suggestionType: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },

  noSuggestionText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    textAlign: 'center',
    padding: spacing.md,
  },

  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  quantityButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },

  quantityInput: {
    flex: 1,
    height: 48,
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },

  addItemButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },

  addItemButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  itemsSection: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },

  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  itemsTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  itemsCount: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },

  itemCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },

  itemCardEditing: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },

  itemTypeIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
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
    minWidth: 28,
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '800',
    textAlign: 'center',
  },

  itemAction: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  noteContainer: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  noteInput: {
    minHeight: 100,
    color: colors.text,
    fontSize: fontSize.sm,
  },

  noteCounter: {
    color: colors.textLight,
    fontSize: fontSize.xs,
    textAlign: 'right',
  },

  footer: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },

  footerLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },

  footerValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
    marginTop: 2,
  },

  submitButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },

  submitButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  disabled: {
    opacity: 0.55,
  },

  pressed: {
    opacity: 0.65,
  },
});