import { Ionicons } from '@expo/vector-icons';
import { type Href, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, Text, TextInput, View } from 'react-native';

import { getActiveWarehouses } from '../../../api/create-order-api';
import { createProductReturn } from '../../../api/product-return-api';
import { ReturnPerson, returnPersonRequest } from '../../../api/return-person-api';
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
import { DraftProductReturnItem, ProductType } from '../../../features/product-returns/product-return-types';
import { colors } from '../../../theme';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Vazvrad yaradılmadı.');
const localId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
  const [people, setPeople] = useState<ReturnPerson[]>([]);
  const [personId, setPersonId] = useState<string | null>(null);
  const [peopleError, setPeopleError] = useState('');

  const [items, setItems] = useState<DraftProductReturnItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [batch, setBatch] = useState('');
  const [productType, setProductType] = useState<ProductType>(ProductType.Product);
  const [quantityText, setQuantityText] = useState('1');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const codeRef = useRef<TextInput>(null);

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

  const loadPeople = useCallback(async () => {
    if (!token) return;
    try {
      const all = await returnPersonRequest<ReturnPerson[]>(token);
      const active = all.filter((person) => person.isActive);
      setPeople(active);
      setPeopleError('');
      setPersonId((current) => (active.some((p) => p.id === current) ? current : null));
    } catch (e) {
      setPeopleError(errorMessage(e));
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadPeople();
    }, [loadPeople]),
  );

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
      if (photo) setPhotos((current) => [...current, photo]);
    } catch (e) {
      Alert.alert(e instanceof CameraPermissionError ? 'Kamera icazəsi lazımdır' : 'Şəkil çəkilmədi', errorMessage(e));
    } finally {
      setCapturing(false);
    }
  }

  async function submit() {
    if (!token || saving || saveLock.current) return;
    if (people.length > 0 && !personId) {
      Alert.alert('İşçi seçilməyib', 'Vazvratı yaradan işçinin adını seçin.');
      return;
    }
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
    if (finalItems.length === 0) {
      Alert.alert('Məhsul yoxdur', 'Ən azı bir məhsul əlavə edin.');
      return;
    }
    const value = parseMoney(amount);
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
        returnPersonId: personId,
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
      <Card>
        <SectionTitle>1. Vazvratı kim yaradır?</SectionTitle>
        {peopleError ? (
          <Pressable onPress={() => void loadPeople()}>
            <Text style={{ color: colors.danger }}>{peopleError} · Yenidən sına</Text>
          </Pressable>
        ) : null}
        {people.length === 0 && !peopleError ? (
          <Text style={{ color: colors.textSecondary }}>
            Admin “Vazvrat yaradanlar” bölməsində işçi adlarını əlavə edə bilər. Ad olmadan da davam etmək olar.
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {people.map((person) => (
              <Chip
                key={person.id}
                label={`${personId === person.id ? '✓ ' : ''}${person.name}`}
                selected={personId === person.id}
                onPress={() => setPersonId(person.id)}
              />
            ))}
          </View>
        )}
      </Card>

      <Card>
        <SectionTitle>2. Müştəri</SectionTitle>
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
        <SectionTitle>{editingId ? '3. Məhsulu düzəlt' : '3. Məhsullar'}</SectionTitle>
        <CodeInput
          ref={codeRef}
          label="Məhsul kodu"
          hint="Yalnız rəqəm və - (məsələn 1019)"
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
        <SectionTitle>4. Məbləğ (istəyə görə)</SectionTitle>
        <MoneyInput
          value={amount}
          onChangeText={setAmount}
          hint="Açotda müştəri ilə hesablaşanda da yazıla bilər."
        />
      </Card>

      <Card>
        <SectionTitle>5. Şəkillər (istəyə görə)</SectionTitle>
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
