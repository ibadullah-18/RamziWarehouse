import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
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
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  cancelProductReturn,
  completeProductReturn,
  deleteProductReturnPhoto,
  getProductReturnById,
  submitProductReturn,
  uploadProductReturnPhoto,
} from '../../../api/product-return-api';
import { useAuth } from '../../../auth/auth-context';
import {
  canManageOperations,
} from '../../../auth/permissions';
import {
  AuthenticatedProductReturnPhoto,
} from '../../../components/authenticated-product-return-photo';
import {
  getProductTypeLabel,
  getReturnStatusLabel,
  getReturnTypeSummary,
} from '../../../features/product-returns/product-return-status';
import {
  ProductReturn,
  ProductType,
  ReturnStatus,
} from '../../../features/product-returns/product-return-types';
import {
  colors,
  fontSize,
  radius,
  spacing,
} from '../../../theme';

type WorkingAction =
  | 'photo'
  | 'submit'
  | 'complete'
  | 'cancel'
  | `delete-${string}`
  | null;

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Əməliyyat yerinə yetirilmədi.';
}

function formatDateTime(
  value: string | null | undefined,
) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('az-AZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReturnDetailScreen() {
  const { session } = useAuth();

  const parameters =
    useLocalSearchParams<{
      id?: string | string[];
    }>();

  const productReturnId =
    Array.isArray(parameters.id)
      ? parameters.id[0]
      : parameters.id;

  const accessToken =
    session?.accessToken;

  const [
    productReturn,
    setProductReturn,
  ] = useState<ProductReturn | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [reloadNumber, setReloadNumber] =
    useState(0);

  const [
    workingAction,
    setWorkingAction,
  ] = useState<WorkingAction>(null);

  const [managerNote, setManagerNote] =
    useState('');

useEffect(() => {
  if (
    !accessToken ||
    !productReturnId
  ) {
    return;
  }

  let isActive = true;

  const currentAccessToken =
    accessToken;

  const currentProductReturnId =
    productReturnId;

  async function loadProductReturn() {
    try {
      const result =
        await getProductReturnById(
          currentAccessToken,
          currentProductReturnId,
        );

      if (isActive) {
        setProductReturn(result);
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

  void loadProductReturn();

  return () => {
    isActive = false;
  };
}, [
  accessToken,
  productReturnId,
  reloadNumber,
]);

  async function takePhoto() {
    if (
      !accessToken ||
      !productReturn ||
      workingAction
    ) {
      return;
    }

    const permission =
      await ImagePicker
        .requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Kamera icazəsi lazımdır',
        'Sübut şəklini çəkmək üçün kamera icazəsi verin.',
      );

      return;
    }

    const result =
      await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        cameraType:
          ImagePicker.CameraType.back,
        allowsEditing: false,
        quality: 0.75,
      });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset) {
      Alert.alert(
        'Şəkil tapılmadı',
        'Kamera nəticəsində şəkil alınmadı.',
      );

      return;
    }

    if (
      asset.fileSize &&
      asset.fileSize >
        10 * 1024 * 1024
    ) {
      Alert.alert(
        'Şəkil çox böyükdür',
        'Şəklin ölçüsü maksimum 10 MB ola bilər.',
      );

      return;
    }

    setWorkingAction('photo');

    try {
      const uploadedPhoto =
        await uploadProductReturnPhoto(
          accessToken,
          productReturn.id,
          {
            uri: asset.uri,

            fileName:
              asset.fileName ??
              `return-${productReturn.id}` +
                `-${Date.now()}.jpg`,

            contentType:
              asset.mimeType ??
              'image/jpeg',
          },
        );

      setProductReturn(currentValue =>
        currentValue
          ? {
              ...currentValue,

              photos: [
                ...currentValue.photos,
                uploadedPhoto,
              ],
            }
          : currentValue,
      );

      Alert.alert(
        'Şəkil əlavə edildi',
        'Sübut şəkli uğurla yadda saxlanıldı.',
      );
    } catch (error) {
      Alert.alert(
        'Şəkil göndərilmədi',
        getErrorMessage(error),
      );
    } finally {
      setWorkingAction(null);
    }
  }

  async function deletePhoto(
    photoId: string,
  ) {
    if (
      !accessToken ||
      !productReturn ||
      workingAction
    ) {
      return;
    }

    setWorkingAction(
      `delete-${photoId}`,
    );

    try {
      await deleteProductReturnPhoto(
        accessToken,
        productReturn.id,
        photoId,
      );

      setProductReturn(currentValue =>
        currentValue
          ? {
              ...currentValue,

              photos:
                currentValue.photos.filter(
                  photo =>
                    photo.id !== photoId,
                ),
            }
          : currentValue,
      );
    } catch (error) {
      Alert.alert(
        'Şəkil silinmədi',
        getErrorMessage(error),
      );
    } finally {
      setWorkingAction(null);
    }
  }

  function confirmDeletePhoto(
    photoId: string,
  ) {
    Alert.alert(
      'Şəkil silinsin?',
      'Bu sübut şəklini silmək istədiyinizə əminsiniz?',
      [
        {
          text: 'Xeyr',
          style: 'cancel',
        },
        {
          text: 'Bəli, sil',
          style: 'destructive',

          onPress: () => {
            void deletePhoto(photoId);
          },
        },
      ],
    );
  }

  async function submitToManager() {
    if (
      !accessToken ||
      !productReturn ||
      workingAction
    ) {
      return;
    }

    if (productReturn.photos.length === 0) {
      Alert.alert(
        'Sübut şəkli yoxdur',
        'Menecerə göndərmək üçün ən azı bir şəkil çəkin.',
      );

      return;
    }

    setWorkingAction('submit');

    try {
      const updatedReturn =
        await submitProductReturn(
          accessToken,
          productReturn.id,
        );

      setProductReturn(updatedReturn);

      Alert.alert(
        'Menecerə göndərildi',
        'Geri qaytarma menecerin təsdiqinə təqdim edildi.',
      );
    } catch (error) {
      Alert.alert(
        'Göndərilmədi',
        getErrorMessage(error),
      );
    } finally {
      setWorkingAction(null);
    }
  }

  function confirmSubmit() {
    if (!productReturn?.photos.length) {
      Alert.alert(
        'Sübut şəkli yoxdur',
        'Ən azı bir məhsul şəkli çəkin.',
      );

      return;
    }

    Alert.alert(
      'Menecerə göndərilsin?',
      'Məhsul kodlarını, partiyaları və şəkilləri yoxlayın.',
      [
        {
          text: 'Xeyr',
          style: 'cancel',
        },
        {
          text: 'Bəli, göndər',

          onPress: () => {
            void submitToManager();
          },
        },
      ],
    );
  }

  async function completeReturn() {
    if (
      !accessToken ||
      !productReturn ||
      workingAction
    ) {
      return;
    }

    setWorkingAction('complete');

    try {
      const updatedReturn =
        await completeProductReturn(
          accessToken,
          productReturn.id,
          managerNote,
        );

      setProductReturn(updatedReturn);

      Alert.alert(
        'Sistemə işlənildi',
        'Geri qaytarma uğurla tamamlandı.',
      );
    } catch (error) {
      Alert.alert(
        'Tamamlanmadı',
        getErrorMessage(error),
      );
    } finally {
      setWorkingAction(null);
    }
  }

  async function cancelReturn() {
    if (
      !accessToken ||
      !productReturn ||
      workingAction
    ) {
      return;
    }

    setWorkingAction('cancel');

    try {
      const updatedReturn =
        await cancelProductReturn(
          accessToken,
          productReturn.id,
          managerNote,
        );

      setProductReturn(updatedReturn);

      Alert.alert(
        'Vazvrad ləğv edildi',
        'Əməliyyat ləğv edilmiş kimi yadda saxlanıldı.',
      );
    } catch (error) {
      Alert.alert(
        'Ləğv edilmədi',
        getErrorMessage(error),
      );
    } finally {
      setWorkingAction(null);
    }
  }

  function confirmComplete() {
    Alert.alert(
      'Sistemə işlənilib?',
      'Bu Vazvrad/Vitrinin anbar sisteminə düzgün yazıldığını təsdiqləyirsiniz?',
      [
        {
          text: 'Xeyr',
          style: 'cancel',
        },
        {
          text: 'Bəli, işlənilib',

          onPress: () => {
            void completeReturn();
          },
        },
      ],
    );
  }

  if (
    isLoading ||
    !accessToken
  ) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingState}>
          <ActivityIndicator
            size="small"
            color={colors.primary}
          />

          <Text style={styles.loadingText}>
            Vazvrad məlumatları alınır...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (
    errorMessage ||
    !productReturn
  ) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              router.back();
            }}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={colors.text}
            />
          </Pressable>

          <Text style={styles.headerTitle}>
            Vazvrad
          </Text>

          <View style={styles.placeholder} />
        </View>

        <View style={styles.loadingState}>
          <Ionicons
            name="cloud-offline-outline"
            size={34}
            color={colors.danger}
          />

          <Text style={styles.errorStateText}>
            {errorMessage ??
              'Vazvrad tapılmadı.'}
          </Text>

          <Pressable
            onPress={() => {
              setIsLoading(true);

              setReloadNumber(
                currentValue =>
                  currentValue + 1,
              );
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>
              Yenidən yoxla
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isCreator =
    productReturn.createdByUserId ===
    session?.userId;

  const canManageReturn =
    canManageOperations(
      session?.role,
    );

  const canEdit =
    productReturn.status ===
      ReturnStatus.Pending &&
    isCreator;

  const canProcess =
    productReturn.status ===
      ReturnStatus.Submitted &&
    canManageReturn;

  const totalQuantity =
    productReturn.items.reduce(
      (total, item) =>
        total + item.quantity,
      0,
    );

  const returnType =
    getReturnTypeSummary(
      productReturn.items.map(
        item => item.productType,
      ),
    );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
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
            {returnType.toLocaleUpperCase(
              'az-AZ',
            )}
          </Text>

          <Text style={styles.headerTitle}>
            {productReturn.customerName}
          </Text>
        </View>

        <View style={styles.placeholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryLabel}>
                Müştəri
              </Text>

              <Text style={styles.summaryCustomer}>
                {productReturn.customerName}
              </Text>
            </View>

            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {getReturnStatusLabel(
                  productReturn.status,
                )}
              </Text>
            </View>
          </View>

          <Text style={styles.summaryWarehouse}>
            {productReturn.warehouseName}
          </Text>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryNumbers}>
            <View style={styles.summaryNumber}>
              <Text style={styles.numberValue}>
                {productReturn.items.length}
              </Text>

              <Text style={styles.numberLabel}>
                Məhsul sətri
              </Text>
            </View>

            <View style={styles.summaryNumber}>
              <Text style={styles.numberValue}>
                {totalQuantity}
              </Text>

              <Text style={styles.numberLabel}>
                Ümumi ədəd
              </Text>
            </View>

            <View style={styles.summaryNumber}>
              <Text style={styles.numberValue}>
                {productReturn.photos.length}
              </Text>

              <Text style={styles.numberLabel}>
                Sübut şəkli
              </Text>
            </View>
          </View>
        </View>

        {canEdit ? (
          <View style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <View style={styles.actionIcon}>
                <Ionicons
                  name="camera-outline"
                  size={22}
                  color={colors.primary}
                />
              </View>

              <View style={styles.actionHeaderText}>
                <Text style={styles.actionTitle}>
                  Məhsulların şəklini çəkin
                </Text>

                <Text
                  style={styles.actionDescription}
                >
                  Kod və partiyalar şəkildə
                  aydın görünməlidir.
                </Text>
              </View>
            </View>

            <Pressable
              disabled={Boolean(workingAction)}
              onPress={() => {
                void takePhoto();
              }}
              style={({ pressed }) => [
                styles.photoButton,
                pressed && styles.pressed,
              ]}
            >
              {workingAction === 'photo' ? (
                <ActivityIndicator
                  size="small"
                  color={colors.white}
                />
              ) : (
                <Ionicons
                  name="camera"
                  size={21}
                  color={colors.white}
                />
              )}

              <Text style={styles.photoButtonText}>
                Kamera ilə şəkil çək
              </Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>
          Sübut şəkilləri
        </Text>

        {productReturn.photos.length > 0 ? (
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={
              styles.photosContent
            }
          >
            {productReturn.photos.map(photo => (
              <View
                key={photo.id}
                style={styles.photoCard}
              >
                <AuthenticatedProductReturnPhoto
                  accessToken={accessToken}
                  productReturnId={
                    productReturn.id
                  }
                  photoId={photo.id}
                  contentType={
                    photo.contentType
                  }
                />

                <View style={styles.photoFooter}>
                  <View style={styles.photoInformation}>
                    <Text
                      style={styles.photoOwner}
                      numberOfLines={1}
                    >
                      {photo.uploadedByFullName}
                    </Text>

                    <Text style={styles.photoDate}>
                      {formatDateTime(
                        photo.createdAtUtc,
                      )}
                    </Text>
                  </View>

                  {canEdit ? (
                    <Pressable
                      disabled={Boolean(
                        workingAction,
                      )}
                      onPress={() => {
                        confirmDeletePhoto(
                          photo.id,
                        );
                      }}
                      style={styles.deleteButton}
                    >
                      {workingAction ===
                      `delete-${photo.id}` ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.danger}
                        />
                      ) : (
                        <Ionicons
                          name="trash-outline"
                          size={19}
                          color={colors.danger}
                        />
                      )}
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyPhotoCard}>
            <Ionicons
              name="images-outline"
              size={30}
              color={colors.textLight}
            />

            <Text style={styles.emptyPhotoTitle}>
              Hələ şəkil yoxdur
            </Text>

            <Text
              style={styles.emptyPhotoDescription}
            >
              Məhsulların ən azı bir sübut
              şəklini çəkin.
            </Text>
          </View>
        )}

        {canEdit ? (
          <Pressable
            disabled={Boolean(workingAction)}
            onPress={confirmSubmit}
            style={({ pressed }) => [
              styles.submitButton,
              productReturn.photos.length ===
                0 &&
                styles.disabledButton,
              pressed && styles.pressed,
            ]}
          >
            {workingAction === 'submit' ? (
              <ActivityIndicator
                size="small"
                color={colors.white}
              />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={colors.white}
              />
            )}

            <Text style={styles.submitButtonText}>
              Menecerə göndər
            </Text>
          </Pressable>
        ) : null}

        {productReturn.status ===
          ReturnStatus.Submitted &&
        !canManageReturn ? (
          <View style={styles.informationCard}>
            <Ionicons
              name="time-outline"
              size={23}
              color={colors.primary}
            />

            <Text
              style={
                styles.informationText
              }
            >
              Vazvrad menecerin təsdiqini
              gözləyir.
            </Text>
          </View>
        ) : null}

        {canProcess ? (
          <View style={styles.managerCard}>
            <Text style={styles.managerTitle}>
              Menecer təsdiqi
            </Text>

            <Text
              style={styles.managerDescription}
            >
              Anbar sistemində əməliyyatı
              etdikdən sonra təsdiqləyin.
            </Text>

            <TextInput
              value={managerNote}
              onChangeText={setManagerNote}
              placeholder="Əməliyyat qeydi (məcburi deyil)"
              placeholderTextColor={
                colors.textLight
              }
              maxLength={500}
              multiline
              textAlignVertical="top"
              style={styles.managerNote}
            />

            <Pressable
              disabled={Boolean(workingAction)}
              onPress={confirmComplete}
              style={({ pressed }) => [
                styles.completeButton,
                pressed && styles.pressed,
              ]}
            >
              {workingAction === 'complete' ? (
                <ActivityIndicator
                  size="small"
                  color={colors.white}
                />
              ) : (
                <Ionicons
                  name="checkmark-circle"
                  size={21}
                  color={colors.white}
                />
              )}

              <Text
                style={
                  styles.completeButtonText
                }
              >
                Sistemə işlənildi
              </Text>
            </Pressable>

            <Pressable
              disabled={Boolean(workingAction)}
              onPress={() => {
                Alert.alert(
                  'Vazvrad ləğv edilsin?',
                  'Ləğv səbəbini qeyddə yazmaq məsləhətdir.',
                  [
                    {
                      text: 'Xeyr',
                      style: 'cancel',
                    },
                    {
                      text: 'Bəli, ləğv et',
                      style: 'destructive',

                      onPress: () => {
                        void cancelReturn();
                      },
                    },
                  ],
                );
              }}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>
                Vazvradı ləğv et
              </Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>
          Məhsullar
        </Text>

        {productReturn.items.map(item => (
          <View
            key={item.id}
            style={styles.itemCard}
          >
            <View style={styles.itemIcon}>
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

            <View style={styles.itemInformation}>
              <Text style={styles.itemCode}>
                {item.productCode}
              </Text>

              <Text style={styles.itemMeta}>
                Partiya {item.batchNumber} ·{' '}
                {getProductTypeLabel(
                  item.productType,
                )}
              </Text>
            </View>

            <Text style={styles.itemQuantity}>
              {item.quantity} ədəd
            </Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>
          Əməliyyat məlumatları
        </Text>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Yaradıb
            </Text>

            <Text style={styles.detailValue}>
              {productReturn.createdByFullName}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Yaradılma tarixi
            </Text>

            <Text style={styles.detailValue}>
              {formatDateTime(
                productReturn.createdAtUtc,
              )}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Sistemə işləyib
            </Text>

            <Text style={styles.detailValue}>
              {productReturn.processedByFullName ??
                '—'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              İşlənilmə tarixi
            </Text>

            <Text style={styles.detailValue}>
              {formatDateTime(
                productReturn.processedAtUtc,
              )}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Silinmə tarixi
            </Text>

            <Text style={styles.detailValue}>
              {formatDateTime(
                productReturn.deleteAfterUtc,
              )}
            </Text>
          </View>
        </View>

        {productReturn.additionalNote ? (
          <>
            <Text style={styles.sectionTitle}>
              Əlavə qeyd
            </Text>

            <View style={styles.noteCard}>
              <Text style={styles.noteText}>
                {productReturn.additionalNote}
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
  },

  headerTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
    marginTop: 2,
  },

  placeholder: {
    width: 42,
  },

  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 60,
  },

  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },

  errorStateText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    marginTop: spacing.lg,
  },

  retryText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  summaryCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: '#003C61',
  },

  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  summaryLabel: {
    color: '#A9C7D8',
    fontSize: fontSize.xs,
  },

  summaryCustomer: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: '800',
    marginTop: 4,
  },

  summaryWarehouse: {
    color: '#C8DAE4',
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.xl,
    backgroundColor: '#E8F4FF',
  },

  statusText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },

  summaryDivider: {
    height: 1,
    backgroundColor: '#356580',
    marginVertical: spacing.lg,
  },

  summaryNumbers: {
    flexDirection: 'row',
  },

  summaryNumber: {
    flex: 1,
    alignItems: 'center',
  },

  numberValue: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },

  numberLabel: {
    color: '#A9C7D8',
    fontSize: fontSize.xs,
    marginTop: 3,
  },

  actionCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginTop: spacing.lg,
  },

  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  actionIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },

  actionHeaderText: {
    flex: 1,
  },

  actionTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  actionDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginTop: 3,
  },

  photoButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    marginTop: spacing.lg,
  },

  photoButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  photosContent: {
    gap: spacing.md,
  },

  photoCard: {
    overflow: 'hidden',
    width: 220,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  photoFooter: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },

  photoInformation: {
    flex: 1,
  },

  photoOwner: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },

  photoDate: {
    color: colors.textLight,
    fontSize: 10,
    marginTop: 2,
  },

  deleteButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyPhotoCard: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  emptyPhotoTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
    marginTop: spacing.sm,
  },

  emptyPhotoDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  submitButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    marginTop: spacing.lg,
  },

  submitButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.45,
  },

  informationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    marginTop: spacing.lg,
  },

  informationText: {
    flex: 1,
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  managerCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    marginTop: spacing.lg,
  },

  managerTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },

  managerDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacing.sm,
  },

  managerNote: {
    minHeight: 90,
    color: colors.text,
    fontSize: fontSize.sm,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginTop: spacing.lg,
  },

  completeButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#218653',
    marginTop: spacing.md,
  },

  completeButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  cancelButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },

  cancelButtonText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  itemCard: {
    minHeight: 70,
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

  itemIcon: {
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
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  detailsCard: {
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  detailRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  detailLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },

  detailValue: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textAlign: 'right',
  },

  noteCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  noteText: {
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: 21,
  },

  pressed: {
    opacity: 0.65,
  },
});