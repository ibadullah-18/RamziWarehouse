import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import {
  ReactNode,
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  OrderWorkflowActions,
} from '../../../components/order-workflow-actions';


import {
  getOrderById,
} from '../../../api/order-detail-api';
import { useAuth } from '../../../auth/auth-context';
import {
  canManageOperations,
} from '../../../auth/permissions';
import {
  AuthenticatedOrderPhoto,
} from '../../../components/authenticated-order-photo';
import {
  OrderDeliveryActions,
} from '../../../components/order-delivery-actions';
import {
  OrderReceiptAction,
} from '../../../components/order-receipt-action';
import {
  OrderDetail,
} from '../../../features/orders/order-detail-types';
import {
  OrderStatus,
} from '../../../features/orders/order-types';
import {
  colors,
  fontSize,
  radius,
  spacing,
} from '../../../theme';



type StatusAppearance = {
  label: string;
  color: string;
  backgroundColor: string;
};

type SectionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: ReactNode;
};

type InformationRowProps = {
  label: string;
  value: string;
  last?: boolean;
};

function getStatusAppearance(
  status: OrderStatus,
): StatusAppearance {
  switch (status) {
    case OrderStatus.Created:
      return {
        label: 'Yeni',
        color: colors.primary,
        backgroundColor: colors.primarySoft,
      };

    case OrderStatus.InPreparation:
      return {
        label: 'Hazırlanır',
        color: colors.warning,
        backgroundColor: colors.warningSoft,
      };

    case OrderStatus.ReadyForDelivery:
      return {
        label: 'Təhvilə hazır',
        color: colors.success,
        backgroundColor: colors.successSoft,
      };

    case OrderStatus.Delivered:
      return {
        label: 'Təhvil verilib',
        color: colors.success,
        backgroundColor: colors.successSoft,
      };

    case OrderStatus.Cancelled:
      return {
        label: 'Ləğv edilib',
        color: colors.danger,
        backgroundColor: colors.dangerSoft,
      };

    default:
      return {
        label: 'Naməlum',
        color: colors.textSecondary,
        backgroundColor: colors.surfaceSecondary,
      };
  }
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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('az-AZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getProductTypeLabel(
  productType: number,
) {
  return productType === 2
    ? 'Vitrin'
    : 'Aboy';
}

function Section({
  icon,
  title,
  children,
}: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons
            name={icon}
            size={18}
            color={colors.primary}
          />
        </View>

        <Text style={styles.sectionTitle}>
          {title}
        </Text>
      </View>

      {children}
    </View>
  );
}

function InformationRow({
  label,
  value,
  last = false,
}: InformationRowProps) {
  return (
    <View
      style={[
        styles.informationRow,
        last && styles.informationRowLast,
      ]}
    >
      <Text style={styles.informationLabel}>
        {label}
      </Text>

      <Text style={styles.informationValue}>
        {value}
      </Text>
    </View>
  );
}

export default function OrderDetailScreen() {
  const parameters =
    useLocalSearchParams<{
      id?: string | string[];
    }>();

  const orderId = Array.isArray(parameters.id)
    ? parameters.id[0]
    : parameters.id;

  const { session } = useAuth();

  const accessToken =
    session?.accessToken;

  const [order, setOrder] =
    useState<OrderDetail | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  useEffect(() => {
    if (!orderId || !accessToken) {
      return;
    }

    let isActive = true;

    const currentOrderId = orderId;
    const currentAccessToken = accessToken;

    async function loadOrder() {
      try {
        const result = await getOrderById(
          currentAccessToken,
          currentOrderId,
        );

        if (isActive) {
          setOrder(result);
          setErrorMessage(null);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Sifariş məlumatları alınmadı.',
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadOrder();

    return () => {
      isActive = false;
    };
  }, [accessToken, orderId]);

  async function refreshOrder() {
    if (!orderId || !accessToken) {
      return;
    }

    setIsRefreshing(true);

    try {
      const result = await getOrderById(
        accessToken,
        orderId,
      );

      setOrder(result);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Sifariş məlumatları yenilənmədi.',
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  if (!orderId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Ionicons
            name="alert-circle-outline"
            size={42}
            color={colors.danger}
          />

          <Text style={styles.errorTitle}>
            Qaimə seçilməyib
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>
              Geri qayıt
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading && !order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text style={styles.loadingText}>
            Qaimə məlumatları açılır...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Ionicons
            name="cloud-offline-outline"
            size={44}
            color={colors.danger}
          />

          <Text style={styles.errorTitle}>
            Məlumat alınmadı
          </Text>

          <Text style={styles.errorDescription}>
            {errorMessage ??
              'Qaimə məlumatları tapılmadı.'}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => {
              void refreshOrder();
            }}
          >
            <Text style={styles.retryButtonText}>
              Yenidən yoxla
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const statusAppearance =
    getStatusAppearance(order.status);

  const totalQuantity = order.items.reduce(
    (total, item) =>
      total + item.quantity,
    0,
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geri qayıt"
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

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerCaption}>
            QAİMƏ
          </Text>

          <Text
            style={styles.headerTitle}
            numberOfLines={1}
          >
            {order.orderNumber}
          </Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={
          styles.contentContainer
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void refreshOrder();
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {errorMessage ? (
          <View style={styles.warningBanner}>
            <Ionicons
              name="warning-outline"
              size={18}
              color={colors.danger}
            />

            <Text style={styles.warningText}>
              {errorMessage}
            </Text>
          </View>
        ) : null}

        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={styles.summaryCustomer}>
              <Text style={styles.summaryLabel}>
                Müştəri
              </Text>

              <Text style={styles.customerName}>
                {order.customerName}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    statusAppearance.backgroundColor,
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      statusAppearance.color,
                  },
                ]}
              />

              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      statusAppearance.color,
                  },
                ]}
              >
                {statusAppearance.label}
              </Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryMetrics}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>
                {order.items.length}
              </Text>
              <Text style={styles.metricLabel}>
                Məhsul sətri
              </Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metric}>
              <Text style={styles.metricValue}>
                {totalQuantity}
              </Text>
              <Text style={styles.metricLabel}>
                Ümumi ədəd
              </Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metric}>
              <Text style={styles.metricValue}>
                {order.preparationPhotos.length}
              </Text>
              <Text style={styles.metricLabel}>
                Sübut şəkli
              </Text>
            </View>
          </View>
        </View>

        {accessToken ? (
            <OrderWorkflowActions
                order={order}
                accessToken={accessToken}
                onOrderChanged={setOrder}
                />
            ) : null}

            {accessToken ? (
                <OrderDeliveryActions
                    order={order}
                    accessToken={accessToken}
                    onOrderChanged={setOrder}
                />
                ) : null}

            {canManageOperations(
              session?.role,
            ) &&
              order.status === OrderStatus.Delivered ? (
                <OrderReceiptAction
                  orderId={order.id}
                />
              ) : null}

        <Section
          icon="information-circle-outline"
          title="Qaimə məlumatları"
        >
          <InformationRow
            label="Qaimə nömrəsi"
            value={order.orderNumber}
          />

          <InformationRow
            label="Qaimə tarixi"
            value={formatDate(order.orderDate)}
          />

          <InformationRow
            label="Müştəri"
            value={order.customerName}
          />

          <InformationRow
            label="Anbar"
            value={order.warehouseName}
            last
          />
        </Section>

        {order.note ? (
          <Section
            icon="document-text-outline"
            title="Əlavə qeyd"
          >
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>
                {order.note}
              </Text>
            </View>
          </Section>
        ) : null}

        <Section
          icon="cube-outline"
          title={`Məhsullar · ${order.items.length}`}
        >
          {order.items.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.productRow,
                index === order.items.length - 1 &&
                  styles.productRowLast,
              ]}
            >
              <View style={styles.productNumber}>
                <Text style={styles.productNumberText}>
                  {index + 1}
                </Text>
              </View>

              <View style={styles.productInformation}>
                <Text style={styles.productCode}>
                  {item.productCode}
                </Text>

                <Text style={styles.productMeta}>
                  Partiya: {item.partyNumber}
                  {'  •  '}
                  {getProductTypeLabel(
                    item.productType,
                  )}
                </Text>
              </View>

              <View style={styles.quantityBadge}>
                <Text style={styles.quantityValue}>
                  {item.quantity}
                </Text>

                <Text style={styles.quantityLabel}>
                  ədəd
                </Text>
              </View>
            </View>
          ))}
        </Section>

        <Section
          icon="people-outline"
          title="İcra məlumatları"
        >
          <InformationRow
            label="Qaiməni yaratdı"
            value={order.createdByFullName}
          />

          <InformationRow
            label="Yaradılma vaxtı"
            value={formatDateTime(
              order.createdAtUtc,
            )}
          />

          <InformationRow
            label="Hazırlayan işçi"
            value={
              order.preparedByFullName ??
              'Hələ təyin edilməyib'
            }
          />

          <InformationRow
            label="Hazırlama başladı"
            value={formatDateTime(
              order.preparationStartedAtUtc,
            )}
          />

          <InformationRow
            label="Hazırlama tamamlandı"
            value={formatDateTime(
              order.preparedAtUtc,
            )}
            last
          />
        </Section>

        {order.preparationPhotos.length > 0 ? (
          <Section
            icon="images-outline"
            title={`Sübut şəkilləri · ${order.preparationPhotos.length}`}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={
                styles.photoList
              }
            >
              {order.preparationPhotos.map(
                (photo) => (
                  <View
                    key={photo.id}
                    style={styles.photoCard}
                  >
                    <AuthenticatedOrderPhoto
                    accessToken={accessToken ?? ''}
                    orderId={order.id}
                    photoId={photo.id}
                    contentType={photo.contentType}
                    />

                    <View
                      style={styles.photoInformation}
                    >
                      <Text
                        style={styles.photoUser}
                        numberOfLines={1}
                      >
                        {photo.uploadedByFullName}
                      </Text>

                      <Text style={styles.photoDate}>
                        {formatDateTime(
                          photo.uploadedAtUtc,
                        )}
                      </Text>
                    </View>
                  </View>
                ),
              )}
            </ScrollView>
          </Section>
        ) : null}

        <Section
          icon="time-outline"
          title="Status tarixçəsi"
        >
          {order.statusHistory.map(
            (history, index) => {
              const newStatus =
                getStatusAppearance(
                  history.newStatus,
                );

              const previousStatus =
                history.previousStatus
                  ? getStatusAppearance(
                      history.previousStatus,
                    ).label
                  : 'Başlanğıc';

              return (
                <View
                  key={history.id}
                  style={[
                    styles.historyRow,
                    index ===
                      order.statusHistory.length -
                        1 &&
                      styles.historyRowLast,
                  ]}
                >
                  <View
                    style={[
                      styles.historyDot,
                      {
                        backgroundColor:
                          newStatus.color,
                      },
                    ]}
                  />

                  <View style={styles.historyContent}>
                    <Text style={styles.historyTitle}>
                      {previousStatus}
                      {' → '}
                      {newStatus.label}
                    </Text>

                    <Text style={styles.historyUser}>
                      {history.changedByFullName}
                    </Text>

                    {history.note ? (
                      <Text style={styles.historyNote}>
                        {history.note}
                      </Text>
                    ) : null}

                    <Text style={styles.historyDate}>
                      {formatDateTime(
                        history.changedAtUtc,
                      )}
                    </Text>
                  </View>
                </View>
              );
            },
          )}
        </Section>

        {order.deleteAfterUtc ? (
          <View style={styles.retentionCard}>
            <Ionicons
              name="hourglass-outline"
              size={20}
              color={colors.warning}
            />

            <Text style={styles.retentionText}>
              Bu məlumatlar{' '}
              {formatDateTime(
                order.deleteAfterUtc,
              )}{' '}
              tarixində avtomatik silinəcək.
            </Text>
          </View>
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
    backgroundColor: colors.surfaceSecondary,
  },

  pressed: {
    opacity: 0.65,
  },

  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },

  headerCaption: {
    color: colors.textLight,
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

  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },

  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.lg,
  },

  errorTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
    marginTop: spacing.lg,
  },

  errorDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  retryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    marginTop: spacing.xl,
  },

  retryButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },

  warningText: {
    flex: 1,
    color: colors.danger,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },

  summaryCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
  },

  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },

  summaryCustomer: {
    flex: 1,
  },

  summaryLabel: {
    color: colors.primarySoft,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },

  customerName: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: '800',
    marginTop: spacing.xs,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.round,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: radius.round,
  },

  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '800',
  },

  summaryDivider: {
    height: 1,
    backgroundColor:
      'rgba(255,255,255,0.18)',
    marginVertical: spacing.lg,
  },

  summaryMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  metric: {
    flex: 1,
    alignItems: 'center',
  },

  metricValue: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },

  metricLabel: {
    color: colors.primarySoft,
    fontSize: 11,
    marginTop: spacing.xs,
  },

  metricDivider: {
    width: 1,
    height: 35,
    backgroundColor:
      'rgba(255,255,255,0.18)',
  },

  section: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  sectionIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },

  sectionTitle: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  informationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  informationRowLast: {
    borderBottomWidth: 0,
  },

  informationLabel: {
    width: 130,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },

  informationValue: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textAlign: 'right',
  },

  noteBox: {
    padding: spacing.lg,
  },

  noteText: {
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: 22,
  },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  productRowLast: {
    borderBottomWidth: 0,
  },

  productNumber: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.primarySoft,
  },

  productNumberText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },

  productInformation: {
    flex: 1,
  },

  productCode: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  productMeta: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },

  quantityBadge: {
    minWidth: 54,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },

  quantityValue: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },

  quantityLabel: {
    color: colors.textSecondary,
    fontSize: 10,
  },

  photoList: {
    padding: spacing.lg,
    gap: spacing.md,
  },

  photoCard: {
    width: 210,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary,
  },

  photo: {
    width: 210,
    height: 155,
    backgroundColor: colors.surfaceSecondary,
  },

  photoInformation: {
    padding: spacing.md,
  },

  photoUser: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  photoDate: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },

  historyRow: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  historyRowLast: {
    borderBottomWidth: 0,
  },

  historyDot: {
    width: 11,
    height: 11,
    borderRadius: radius.round,
    marginTop: 5,
  },

  historyContent: {
    flex: 1,
  },

  historyTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  historyUser: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginTop: spacing.xs,
  },

  historyNote: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacing.sm,
  },

  historyDate: {
    color: colors.textLight,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },

  retentionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.warningSoft,
  },

  retentionText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});