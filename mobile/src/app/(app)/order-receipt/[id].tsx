import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
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
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Share, {
    Social,
    type ShareSingleOptions,
} from 'react-native-share';

import {
    getOrderReceipt,
} from '../../../api/order-receipt-api';
import { useAuth } from '../../../auth/auth-context';
import {
    createOrderReceiptHtml,
    createReceiptMessage,
    getReceiptPdfHeight,
} from '../../../features/orders/order-receipt-html';
import type {
    OrderReceipt,
} from '../../../features/orders/order-receipt-types';
import {
    colors,
    fontSize,
    radius,
    spacing,
} from '../../../theme';

type WhatsAppShareOptions =
  ShareSingleOptions & {
    whatsAppNumber: string;
  };

function parseUtcDate(
  value: string,
): Date {
  const hasTimeZone =
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(
      value,
    );

  return new Date(
    hasTimeZone
      ? value
      : `${value}Z`,
  );
}

function formatDate(
  value: string,
): string {
  const date = parseUtcDate(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'az-AZ',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Baku',
    },
  ).format(date);
}

function getErrorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : 'Əməliyyat zamanı xəta baş verdi.';
}

function isShareCancellation(
  error: unknown,
): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message =
    error.message.toLowerCase();

  return (
    message.includes('cancel') ||
    message.includes('dismiss') ||
    message.includes('did not share')
  );
}

export default function OrderReceiptScreen() {
  const parameters =
    useLocalSearchParams<{
      id?: string | string[];
    }>();

  const orderId =
    Array.isArray(parameters.id)
      ? parameters.id[0]
      : parameters.id;

  const { session } = useAuth();

  const accessToken =
    session?.accessToken;

  const [receipt, setReceipt] =
    useState<OrderReceipt | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSharing, setIsSharing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  useEffect(() => {
    if (!orderId || !accessToken) {
      return;
    }

    let isActive = true;

    const currentOrderId =
      orderId;

    const currentAccessToken =
      accessToken;

    async function loadReceipt() {
      try {
        const result =
          await getOrderReceipt(
            currentAccessToken,
            currentOrderId,
          );

        if (!isActive) {
          return;
        }

        setReceipt(result);
        setErrorMessage(null);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(
          getErrorMessage(error),
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadReceipt();

    return () => {
      isActive = false;
    };
  }, [
    accessToken,
    orderId,
  ]);

  async function handleWhatsAppShare() {
    if (
      !receipt ||
      isSharing
    ) {
      return;
    }

    setIsSharing(true);

    try {
      const html =
        createOrderReceiptHtml(receipt);

      const pdfResult =
        await Print.printToFileAsync({
          html,
          width: 320,
          height:
            getReceiptPdfHeight(receipt),
        });

const shareOptions:
  WhatsAppShareOptions = {
    social:
      Social.Whatsapp,

    whatsAppNumber:
      receipt.customerWhatsAppNumber,

    url: pdfResult.uri,

    type: 'application/pdf',

    filename:
      receipt.receiptFileName.replace(
        /\.pdf$/i,
        '',
      ),

    title:
      `Qaimə №${receipt.orderNumber}`,

    message:
      createReceiptMessage(receipt),
  };

await Share.shareSingle(
  shareOptions,
);
    } catch (error) {
      if (isShareCancellation(error)) {
        return;
      }

      Alert.alert(
        'Qaimə göndərilmədi',
        getErrorMessage(error) +
          '\n\nWhatsApp-ın telefonda quraşdırıldığını yoxlayın.',
      );
    } finally {
      setIsSharing(false);
    }
  }

  if (
    isLoading &&
    !receipt
  ) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text style={styles.stateText}>
            Qaimə çeki hazırlanır
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (
    !receipt ||
    errorMessage
  ) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Ionicons
            name="alert-circle-outline"
            size={44}
            color={colors.danger}
          />

          <Text style={styles.errorTitle}>
            Qaimə hazırlanmadı
          </Text>

          <Text style={styles.errorDescription}>
            {errorMessage ??
              'Qaimə məlumatı tapılmadı.'}
          </Text>

          <Pressable
            onPress={() => {
              router.back();
            }}
            style={styles.backStateButton}
          >
            <Text
              style={
                styles.backStateButtonText
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
          onPress={() => {
            router.back();
          }}
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
            QAİMƏ ÇEKİ
          </Text>

          <Text style={styles.headerTitle}>
            №{receipt.orderNumber}
          </Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.receiptPaper}>
          <Text style={styles.brand}>
            GRANDWALL
          </Text>

          <Text style={styles.receiptTitle}>
            TƏHVİL QAİMƏSİ
          </Text>

          <View style={styles.dashedDivider} />

          <ReceiptRow
            label="Qaimə"
            value={`№${receipt.orderNumber}`}
          />

          <ReceiptRow
            label="Tarix"
            value={formatDate(
              receipt.orderDateUtc,
            )}
          />

          <ReceiptRow
            label="Müştəri"
            value={receipt.customerName}
          />

          <ReceiptRow
            label="Telefon"
            value={
              receipt.customerPhoneNumber
            }
          />

          <ReceiptRow
            label="Anbar"
            value={receipt.warehouseName}
          />

          <View style={styles.dashedDivider} />

          <View style={styles.tableHeader}>
            <Text style={styles.numberColumn}>
              №
            </Text>

            <Text style={styles.productColumn}>
              Məhsul
            </Text>

            <Text style={styles.partyColumn}>
              Partiya
            </Text>

            <Text style={styles.quantityColumn}>
              Ədəd
            </Text>
          </View>

          {receipt.items.map(item => (
            <View
              key={item.lineNumber}
              style={styles.productRow}
            >
              <Text style={styles.numberColumn}>
                {item.lineNumber}
              </Text>

              <View style={styles.productColumn}>
                <Text style={styles.productCode}>
                  {item.productCode}
                </Text>

                <Text style={styles.productType}>
                  {item.productTypeName}
                </Text>
              </View>

              <Text style={styles.partyColumn}>
                {item.partyNumber}
              </Text>

              <Text style={styles.quantityColumn}>
                {item.quantity}
              </Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              ÜMUMİ
            </Text>

            <Text style={styles.totalValue}>
              {receipt.totalQuantity} ƏDƏD
            </Text>
          </View>

          {receipt.orderNote ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteTitle}>
                Qaimə qeydi
              </Text>

              <Text style={styles.noteText}>
                {receipt.orderNote}
              </Text>
            </View>
          ) : null}

          {receipt.deliveryNote ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteTitle}>
                Təhvil qeydi
              </Text>

              <Text style={styles.noteText}>
                {receipt.deliveryNote}
              </Text>
            </View>
          ) : null}

          <View style={styles.dashedDivider} />

          <ReceiptRow
            label="Yaratdı"
            value={
              receipt.createdByFullName
            }
          />

          <ReceiptRow
            label="Hazırladı"
            value={
              receipt.preparedByFullName ??
              '—'
            }
          />

          <ReceiptRow
            label="Təhvil verdi"
            value={
              receipt.deliveredByFullName
            }
          />

          <Text style={styles.footer}>
            GrandWall
          </Text>
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        <Pressable
          disabled={isSharing}
          onPress={() => {
            void handleWhatsAppShare();
          }}
          style={({ pressed }) => [
            styles.whatsAppButton,
            pressed && styles.pressed,
            isSharing &&
              styles.disabledButton,
          ]}
        >
          {isSharing ? (
            <ActivityIndicator
              size="small"
              color={colors.white}
            />
          ) : (
            <Ionicons
              name="logo-whatsapp"
              size={23}
              color={colors.white}
            />
          )}

          <Text style={styles.whatsAppText}>
            {isSharing
              ? 'PDF hazırlanır'
              : 'WhatsApp ilə göndər'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

type ReceiptRowProps = {
  label: string;
  value: string;
};

function ReceiptRow({
  label,
  value,
}: ReceiptRowProps) {
  return (
    <View style={styles.receiptRow}>
      <Text style={styles.receiptRowLabel}>
        {label}
      </Text>

      <Text style={styles.receiptRowValue}>
        {value}
      </Text>
    </View>
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
    opacity: 0.7,
  },

  headerText: {
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

  scrollView: {
    flex: 1,
  },

  content: {
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  receiptPaper: {
    width: '100%',
    maxWidth: 430,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },

  brand: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1.5,
  },

  receiptTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: spacing.xs,
  },

  dashedDivider: {
    height: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.textSecondary,
    marginVertical: spacing.lg,
  },

  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
  },

  receiptRowLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },

  receiptRowValue: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textAlign: 'right',
  },

  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.text,
  },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  numberColumn: {
    width: 25,
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },

  productColumn: {
    flex: 1.3,
  },

  partyColumn: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.xs,
  },

  quantityColumn: {
    width: 42,
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: '800',
    textAlign: 'right',
  },

  productCode: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  productType: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.text,
    marginTop: spacing.lg,
  },

  totalLabel: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
  },

  totalValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
  },

  noteBox: {
    padding: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.textSecondary,
    marginTop: spacing.md,
  },

  noteTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },

  noteText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
  },

  footer: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.xl,
  },

  actionBar: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },

  whatsAppButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#25D366',
  },

  whatsAppText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.65,
  },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },

  stateText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
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

  backStateButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    marginTop: spacing.xl,
  },

  backStateButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
