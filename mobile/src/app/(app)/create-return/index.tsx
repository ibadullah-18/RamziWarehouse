import { Ionicons } from '@expo/vector-icons';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Image, Platform, Pressable, Switch, Text, TextInput, View } from 'react-native';

import { getActiveWarehouses } from '../../../api/create-order-api';
import { createProductReturn } from '../../../api/product-return-api';
import { getPriceRules } from '../../../api/customer-account-api';
import type { PriceRule } from '../../../features/customer-accounts/customer-account-types';
import { priceReturn } from '../../../features/customer-accounts/return-pricing';
import { useAuth } from '../../../auth/auth-context';
import { CustomerPickerModal } from '../../../components/customer-picker-modal';
import { dismissKeyboard } from '../../../components/keyboard-form';
import { CodeInput, MoneyInput, TextField } from '../../../components/form-inputs';
import {
  AccountPageShell,
  Btn,
  Card,
  Chip,
  Notice,
  SectionTitle,
} from '../../../features/customer-accounts/account-ui';
import { parseMoney } from '../../../features/customer-accounts/settlement-math';
import type { Customer, Warehouse } from '../../../features/orders/create-order-types';
import {
  CameraPermissionError,
  CapturedPhoto,
  captureReturnPhoto,
} from '../../../features/product-returns/photo-capture';
import { enqueuePhoto } from '../../../features/product-returns/photo-upload-queue';
import { codeRuleProblem, useReturnCodeRule } from '../../../features/product-returns/code-rule';
import { DraftProductReturnItem, ProductType } from '../../../features/product-returns/product-return-types';
import { colors } from '../../../theme';
import { clearDraft, dropDraftPhotos, keepDraftPhoto, loadDraft, restoreDraftPhoto, saveDraft as storeDraft } from '../../../lib/draft-storage';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Vazvrad yaradılmadı.');
const localId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
/** A half-written return kept on the device (phone call, switching apps, app closed). */
type SavedReturn = {
  v: 1;
  userId: string;
  savedAt: number;
  customer: Customer | null;
  warehouseId: string;
  items: DraftProductReturnItem[];
  editingId: string | null;
  code: string;
  batch: string;
  productType: ProductType;
  quantityText: string;
  amount: string;
  amountTyped: boolean;
  note: string;
  keepDebt: boolean;
  photos: CapturedPhoto[];
};
const DRAFT_NAME = 'return';
const DRAFT_DAYS = 7;
const hasContent = (d: Pick<SavedReturn, 'customer' | 'items' | 'code' | 'batch' | 'photos' | 'note' | 'amount'>) =>
  !!d.customer || d.items.length > 0 || !!d.code.trim() || !!d.batch.trim() || d.photos.length > 0 || !!d.note.trim() || !!d.amount.trim();

const same = (a: string, b: string) => a.trim().toLocaleUpperCase('az-AZ') === b.trim().toLocaleUpperCase('az-AZ');

/**
 * New return / showcase. Order of the form follows the work: who is creating it, which
 * customer, the codes (digits and "-" only, e.g. 340-1), an optional amount, proof photos
 * (sent in the background after saving) and a note.
 */
export default function CreateReturnScreen() {
  const { session } = useAuth();
  const token = session?.accessToken;
  const params = useLocalSearchParams<{ customerId?: string; customerName?: string }>();

  const [keepDebt, setKeepDebt] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(
    params.customerId
      ? {
          id: params.customerId,
          name: params.customerName ?? '',
          phoneNumber: null,
          note: null,
          isActive: true,
          createdAtUtc: '',
          updatedAtUtc: null,
        }
      : null,
  );
  const [picker, setPicker] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouseError, setWarehouseError] = useState('');

  const [items, setItems] = useState<DraftProductReturnItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [batch, setBatch] = useState('');
  const [productType, setProductType] = useState<ProductType>(ProductType.Product);
  const [quantityText, setQuantityText] = useState('1');
  const [amount, setAmount] = useState('');
  // Once the user types an amount by hand, the automatic price no longer overwrites it.
  const [amountTyped, setAmountTyped] = useState(false);
  const [rules, setRules] = useState<PriceRule[]>([]);
  const codeRule = useReturnCodeRule(token);
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const codeRef = useRef<TextInput>(null);
  // Draft on the device: nothing is saved until the earlier draft has been read back.
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  const [otherDraft, setOtherDraft] = useState<SavedReturn | null>(null);
  const latestDraft = useRef<SavedReturn | null>(null);
  const userId = session?.userId ?? '';
  const presetCustomerId = params.customerId;

  function applyDraft(saved: SavedReturn) {
    setCustomer(saved.customer);
    if (saved.warehouseId) setWarehouseId(saved.warehouseId);
    setItems(saved.items);
    setEditingId(saved.editingId);
    setCode(saved.code);
    setBatch(saved.batch);
    setProductType(saved.productType);
    setQuantityText(saved.quantityText || '1');
    setAmount(saved.amount);
    setAmountTyped(saved.amountTyped);
    setNote(saved.note);
    setKeepDebt(saved.keepDebt);
    setPhotos(saved.photos);
    setOtherDraft(null);
    setRestoredAt(saved.savedAt);
  }

  // Read back a return that was being written when the app was left (call, message...).
  useEffect(() => {
    let active = true;
    const restore = async () => {
      const saved = await loadDraft<SavedReturn>(DRAFT_NAME);
      if (
        saved?.v === 1 &&
        saved.userId === userId &&
        Date.now() - saved.savedAt < DRAFT_DAYS * 86400000 &&
        hasContent(saved)
      ) {
        const photosBack = (
          await Promise.all(
            saved.photos.map(async (photo) => {
              const uri = await restoreDraftPhoto(photo.operationId, photo.uri);
              return uri ? { ...photo, uri } : null;
            }),
          )
        ).filter((photo): photo is CapturedPhoto => photo !== null);
        if (!active) return;
        const draft = { ...saved, photos: photosBack };
        // Opened for another customer (from the açot): offer the old draft instead of replacing.
        if (presetCustomerId && draft.customer && draft.customer.id !== presetCustomerId) setOtherDraft(draft);
        else applyDraft(draft);
      }
      if (active) setDraftLoaded(true);
    };
    void restore();
    return () => {
      active = false;
    };
    // Runs once when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save while typing, and at once when the phone leaves the app.
  useEffect(() => {
    if (!draftLoaded || !userId) return;
    const draft: SavedReturn = {
      v: 1, userId, savedAt: Date.now(), customer, warehouseId, items, editingId, code, batch, productType,
      quantityText, amount, amountTyped, note, keepDebt, photos,
    };
    latestDraft.current = draft;
    const timer = setTimeout(() => {
      if (hasContent(draft)) void storeDraft(DRAFT_NAME, draft);
      else if (!otherDraft) void clearDraft(DRAFT_NAME);
    }, 400);
    return () => clearTimeout(timer);
  }, [draftLoaded, userId, customer, warehouseId, items, editingId, code, batch, productType, quantityText, amount, amountTyped, note, keepDebt, photos, otherDraft]);

  useEffect(() => {
    const flush = () => {
      const draft = latestDraft.current;
      if (draft && hasContent(draft)) void storeDraft(DRAFT_NAME, { ...draft, savedAt: Date.now() });
    };
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') flush();
    });
    const web = Platform.OS === 'web' && typeof window !== 'undefined';
    if (web) {
      window.addEventListener('pagehide', flush);
      document.addEventListener('visibilitychange', flush);
    }
    return () => {
      sub.remove();
      if (web) {
        window.removeEventListener('pagehide', flush);
        document.removeEventListener('visibilitychange', flush);
      }
    };
  }, []);

  function clearForm() {
    void dropDraftPhotos(photos.map((photo) => photo.operationId));
    void clearDraft(DRAFT_NAME);
    latestDraft.current = null;
    setCustomer(null);
    setItems([]);
    setEditingId(null);
    setCode('');
    setBatch('');
    setProductType(ProductType.Product);
    setQuantityText('1');
    setAmount('');
    setAmountTyped(false);
    setNote('');
    setKeepDebt(false);
    setPhotos([]);
    setRestoredAt(null);
  }

  useEffect(() => {
    if (!token) return;
    let active = true;
    getActiveWarehouses(token)
      .then((result) => {
        if (!active) return;
        setWarehouses(result);
        const main = result.find((w) => w.name.trim().toLocaleLowerCase('az-AZ').includes('əsas')) ?? result[0];
        if (main) setWarehouseId((current) => current || main.id);
      })
      .catch((e) => active && setWarehouseError(errorMessage(e)));
    return () => {
      active = false;
    };
  }, [token]);


  const customerId = customer?.id;
  useEffect(() => {
    if (!token || !customerId) return;
    let active = true;
    getPriceRules(token, customerId)
      .then((result) => active && setRules(result))
      .catch(() => active && setRules([]));
    return () => {
      active = false;
    };
  }, [token, customerId]);

  // The return is priced from the customer's list: wallpaper lines by quantity, showcase free.
  const pricing = priceReturn(
    items.map((item) => ({
      productCode: item.productCode,
      quantity: item.quantity,
      isShowcase: item.productType === ProductType.Showcase,
    })),
    customerId ? rules : [],
  );
  const autoPriced = rules.length > 0 && !amountTyped;
  const shownAmount = autoPriced ? (pricing.total > 0 ? String(pricing.total) : '') : amount;

  const quantity = Number(quantityText);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  function resetDraft() {
    setEditingId(null);
    setCode('');
    setBatch('');
    setProductType(ProductType.Product);
    setQuantityText('1');
    setTimeout(() => codeRef.current?.focus(), 80);
  }

  function validateDraft(id: string): DraftProductReturnItem | string {
    if (!/^[0-9][0-9-]*$/.test(code.trim())) return 'Məhsul kodunu yazın (yalnız rəqəm və -).';
    const rule = codeRuleProblem(code, codeRule);
    if (rule) return rule;
    if (!/^[0-9][0-9-]*$/.test(batch.trim())) return 'Partiyanı yazın (yalnız rəqəm və -, məsələn 340-1).';
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100000) return 'Say sıfırdan böyük olmalıdır.';
    const duplicate = items.some(
      (item) =>
        item.localId !== editingId && same(item.productCode, code) && same(item.batchNumber, batch) && item.productType === productType,
    );
    if (duplicate) return 'Bu kod, partiya və növ artıq siyahıdadır.';
    return { localId: id, productCode: code.trim(), batchNumber: batch.trim(), quantity, productType };
  }

  function saveDraft() {
    const result = validateDraft(editingId ?? localId());
    if (typeof result === 'string') {
      Alert.alert('Məhsulu yoxlayın', result);
      return;
    }
    setItems((current) =>
      editingId ? current.map((item) => (item.localId === editingId ? result : item)) : [...current, result],
    );
    resetDraft();
  }

  function editItem(item: DraftProductReturnItem) {
    setEditingId(item.localId);
    setCode(item.productCode);
    setBatch(item.batchNumber);
    setProductType(item.productType);
    setQuantityText(String(item.quantity));
    setTimeout(() => codeRef.current?.focus(), 80);
  }

  async function takePhoto() {
    if (capturing) return;
    setCapturing(true);
    try {
      const photo = await captureReturnPhoto();
      if (photo) {
        setPhotos((current) => [...current, photo]);
        void keepDraftPhoto(photo.operationId, photo.uri);
      }
    } catch (e) {
      Alert.alert(e instanceof CameraPermissionError ? 'Kamera icazəsi lazımdır' : 'Şəkil çəkilmədi', errorMessage(e));
    } finally {
      setCapturing(false);
    }
  }

  async function submit() {
    if (!token || saving || saveLock.current) return;
    if (!customer) {
      Alert.alert('Müştəri seçilməyib', 'Vazvrad üçün müştəri seçin.');
      return;
    }
    if (!warehouseId) {
      Alert.alert('Anbar seçilməyib', 'Məhsulların qaytarıldığı anbarı seçin.');
      return;
    }
    let finalItems = [...items];
    if (code.trim() || batch.trim()) {
      const draft = validateDraft(editingId ?? localId());
      if (typeof draft === 'string') {
        Alert.alert('Məhsulu yoxlayın', draft);
        return;
      }
      finalItems = editingId ? finalItems.map((item) => (item.localId === editingId ? draft : item)) : [...finalItems, draft];
    }
    const badCode = finalItems.map((item) => codeRuleProblem(item.productCode, codeRule)).find(Boolean);
    if (badCode) {
      Alert.alert('Kodu düzəldin', badCode);
      return;
    }
    if (finalItems.length === 0) {
      Alert.alert('Məhsul yoxdur', 'Ən azı bir məhsul əlavə edin.');
      return;
    }
    const value = autoPriced ? pricing.total : parseMoney(amount);
    if (value === null) {
      Alert.alert('Məbləği yoxlayın', 'Məbləği düzgün yazın (məsələn 150,50) və ya boş buraxın.');
      return;
    }

    saveLock.current = true;
    setSaving(true);
    try {
      const created = await createProductReturn(token, {
        customerId: customer.id,
        amount: value,
        doNotDeductFromDebt: !!customer.isAccountCustomer && keepDebt,
        warehouseId,
        additionalNote: note.trim() || null,
        items: finalItems.map(({ productCode, batchNumber, quantity: count, productType: type }) => ({
          productCode,
          batchNumber,
          quantity: count,
          productType: type,
        })),
      });
      // The photos go up in the background: nobody waits for the network here.
      photos.forEach((photo) => enqueuePhoto(created.id, photo));
      // Saved on the server: the device copy of the form is no longer needed.
      latestDraft.current = null;
      void clearDraft(DRAFT_NAME);
      void dropDraftPhotos(photos.map((photo) => photo.operationId));
      router.replace(`/return-detail/${created.id}` as Href);
    } catch (e) {
      Alert.alert('Vazvrad yaradılmadı', errorMessage(e));
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  return (
    <AccountPageShell
      title="Yeni vazvrad / vitrin"
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/returns' as Href))}
      footer={
        <Btn
          icon="checkmark-circle-outline"
          title={photos.length > 0 ? `Yarat və ${photos.length} şəkli göndər` : 'Vazvradı yarat'}
          onPress={() => void submit()}
          busy={saving}
        />
      }
    >
      {restoredAt ? (
        <Card>
          <Text style={{ color: colors.success, fontSize: 15, fontWeight: '700' }}>
            Yarımçıq qalan vazvrad bərpa olundu
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            Tətbiqdən çıxanda yazılanlar telefonda saxlanılır. Davam edə və ya formu təmizləyə bilərsiniz.
          </Text>
          <Btn icon="trash-outline" variant="secondary" compact title="Formu təmizlə, yenidən başla" onPress={clearForm} />
        </Card>
      ) : null}
      {otherDraft ? (
        <Card>
          <Text style={{ color: colors.warning, fontSize: 15, fontWeight: '700' }}>
            Yarımçıq vazvrad var: {otherDraft.customer?.name ?? 'müştəri seçilməyib'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            {otherDraft.items.length} məhsul, {otherDraft.photos.length} şəkil. Onu bərpa edib davam etmək istəyirsiniz?
          </Text>
          <Btn icon="refresh-outline" compact title="Yarımçıq vazvradı bərpa et" onPress={() => applyDraft(otherDraft)} />
          <Btn
            icon="trash-outline"
            variant="secondary"
            compact
            title="Onu sil"
            onPress={() => {
              void dropDraftPhotos(otherDraft.photos.map((photo) => photo.operationId));
              void clearDraft(DRAFT_NAME);
              setOtherDraft(null);
            }}
          />
        </Card>
      ) : null}

      <Card>
        <SectionTitle>Vazvratı yaradan</SectionTitle>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{session?.fullName}</Text>
      </Card>

      <Card>
        <SectionTitle>1. Müştəri</SectionTitle>
        <Pressable
          accessibilityRole="button"
          onPress={() => setPicker(true)}
          style={{
            minHeight: 56,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: customer ? colors.primary : colors.inputBorder,
            backgroundColor: colors.surfaceSecondary,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <Text style={{ color: customer ? colors.text : colors.textSecondary, fontSize: 17, flex: 1 }} numberOfLines={2}>
            {customer?.name || 'Müştəri seçin'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
        </Pressable>
        {warehouses.length > 1 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {warehouses.map((warehouse) => (
              <Chip
                key={warehouse.id}
                label={warehouse.name}
                selected={warehouseId === warehouse.id}
                onPress={() => setWarehouseId(warehouse.id)}
              />
            ))}
          </View>
        ) : null}
        {warehouseError ? <Notice tone="error">{warehouseError}</Notice> : null}
      </Card>

      <Card>
        <SectionTitle>{editingId ? '2. Məhsulu düzəlt' : '2. Məhsullar'}</SectionTitle>
        <CodeInput
          ref={codeRef}
          label="Məhsul kodu"
          hint={codeRule.requiredLength ? `${codeRule.requiredLength} rəqəmli kod (məsələn 1019)` : 'Yalnız rəqəm və - (məsələn 1019)'}
          error={code.trim().length >= 2 ? codeRuleProblem(code, codeRule) : null}
          value={code}
          onChangeText={setCode}
          maxLength={50}
        />
        <CodeInput
          label="Partiya"
          hint="Yalnız rəqəm və - (məsələn 340-1)"
          value={batch}
          onChangeText={setBatch}
          maxLength={50}
        />
        <View style={{ gap: 6 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>Say</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'stretch' }}>
            <Chip label="−" onPress={() => setQuantityText(String(Math.max(1, (quantity || 1) - 1)))} />
            <TextInput
              value={quantityText}
              onChangeText={(text) => setQuantityText(text.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              inputMode="numeric"
              returnKeyType="done"
              submitBehavior="blurAndSubmit"
              onSubmitEditing={dismissKeyboard}
              selectTextOnFocus
              style={{
                flex: 1,
                minHeight: 46,
                color: colors.text,
                backgroundColor: colors.surface,
                borderColor: colors.inputBorder,
                borderWidth: 1,
                borderRadius: 12,
                textAlign: 'center',
                fontSize: 18,
              }}
            />
            <Chip label="+" onPress={() => setQuantityText(String(Math.min(100000, (quantity || 0) + 1)))} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Chip label="Vazvrad" selected={productType === ProductType.Product} onPress={() => setProductType(ProductType.Product)} />
          <Chip label="Vitrin" selected={productType === ProductType.Showcase} onPress={() => setProductType(ProductType.Showcase)} />
        </View>
        <Btn
          icon={editingId ? 'checkmark' : 'add'}
          variant="secondary"
          title={editingId ? 'Dəyişikliyi saxla' : 'Siyahıya əlavə et'}
          onPress={saveDraft}
        />
        {items.map((item, index) => (
          <View
            key={item.localId}
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Text style={{ flex: 1, color: colors.text, fontSize: 16 }}>
              {index + 1}. Kod {item.productCode} · Partiya {item.batchNumber} · {item.quantity} ədəd ·{' '}
              {item.productType === ProductType.Showcase ? 'Vitrin' : 'Vazvrad'}
            </Text>
            <Pressable accessibilityLabel="Düzəlt" hitSlop={8} onPress={() => editItem(item)}>
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </Pressable>
            <Pressable
              accessibilityLabel="Çıxar"
              hitSlop={8}
              onPress={() => {
                setItems((current) => current.filter((i) => i.localId !== item.localId));
                if (editingId === item.localId) resetDraft();
              }}
            >
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </Pressable>
          </View>
        ))}
        {items.length > 0 ? (
          <Text style={{ color: colors.textSecondary }}>
            {items.length} sətir · {totalQuantity} ədəd
          </Text>
        ) : null}
      </Card>

      <Card>
        <SectionTitle>3. Vazvrad məbləği</SectionTitle>
        {rules.length > 0 ? (
          <View style={{ gap: 4 }}>
            {pricing.lines.map((line, index) => (
              <Text key={`${line.productCode}-${index}`} style={{ color: line.unit === null ? colors.danger : colors.textSecondary, fontSize: 14 }}>
                {line.unit === null
                  ? `${line.productCode}: bu kod üçün qiymət yoxdur`
                  : `${line.productCode} × ${line.quantity} = ${line.total} ₼`}
              </Text>
            ))}
            {items.some((item) => item.productType === ProductType.Showcase) ? (
              <Text style={{ color: colors.textLight, fontSize: 13 }}>Vitrin hesablanmır.</Text>
            ) : null}
          </View>
        ) : null}
        <MoneyInput
          value={shownAmount}
          onChangeText={(value) => {
            setAmountTyped(true);
            setAmount(value);
          }}
          hint={
            customer?.isAccountCustomer && keepDebt
              ? 'Məbləğ yalnız qeyd olunur, müştərinin borcundan çıxılmır.'
              : autoPriced
              ? 'Müştərinin qiymət siyahısından avtomatik hesablandı. Menecerə göndərəndə borcdan çıxılır.'
              : rules.length > 0
                ? 'Əl ilə yazılıb.'
                : 'Bu müştəri üçün qiymət siyahısı yoxdur; məbləği əl ilə yazın.'
          }
        />
        {amountTyped && rules.length > 0 ? (
          <Pressable accessibilityRole="button" onPress={() => setAmountTyped(false)}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Avtomatik hesablamaya qayıt</Text>
          </Pressable>
        ) : null}
        {customer?.isAccountCustomer ? (
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: keepDebt }}
            onPress={() => setKeepDebt((v) => !v)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: keepDebt ? colors.warning : colors.border,
              backgroundColor: keepDebt ? colors.warningSoft : colors.surface,
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Məbləğ borcdan çıxılmasın</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
                Açıq olanda bu vazvradın pulu Sədərək müştərisinin borcundan çıxılmır və açotda da təklif olunmur.
              </Text>
            </View>
            <Switch
              value={keepDebt}
              onValueChange={setKeepDebt}
              trackColor={{ true: colors.warning, false: colors.border }}
              thumbColor={colors.white}
            />
          </Pressable>
        ) : null}
      </Card>

      <Card>
        <SectionTitle>4. Şəkillər (istəyə görə)</SectionTitle>
        <Btn
          icon="camera"
          variant="secondary"
          title={capturing ? 'Kamera açılır…' : 'Kamera ilə şəkil çək'}
          onPress={() => void takePhoto()}
          disabled={capturing}
        />
        {photos.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {photos.map((photo) => (
              <View key={photo.operationId}>
                <Image source={{ uri: photo.uri }} style={{ width: 96, height: 96, borderRadius: 10 }} />
                <Pressable
                  accessibilityLabel="Şəkli çıxar"
                  onPress={() => setPhotos((current) => current.filter((p) => p.operationId !== photo.operationId))}
                  style={{ position: 'absolute', top: 4, right: 4, backgroundColor: colors.black, borderRadius: 12, padding: 2 }}
                >
                  <Ionicons name="close" size={18} color={colors.white} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
          Şəkillər yaratdıqdan sonra arxa planda göndərilir, gözləmək lazım deyil.
        </Text>
      </Card>

      <TextField label="Əlavə qeyd (istəyə görə)" value={note} onChangeText={setNote} maxLength={1000} />

      <CustomerPickerModal
        visible={picker}
        accessToken={token ?? ''}
        selectedCustomerId={customer?.id}
        onClose={() => setPicker(false)}
        onSelect={(selected) => {
          setCustomer(selected);
          setPicker(false);
        }}
      />
    </AccountPageShell>
  );
}
