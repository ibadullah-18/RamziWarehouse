import { AuthSession, UserRole } from './auth-types';

/** Same codes as the server (GrandWall.Domain/Enums/Permission.cs). */
export const Permission = {
  AdminPanel: 'admin.panel',
  UsersManage: 'users.manage',
  SettingsManage: 'settings.manage',
  CustomersCreate: 'customers.create',
  CustomersEdit: 'customers.edit',
  CustomersDelete: 'customers.delete',
  ReturnsCreate: 'returns.create',
  ReturnsReview: 'returns.review',
  ReturnsNotify: 'returns.notify',
  ReturnsAdmin: 'returns.admin',
  AccountsUse: 'accounts.use',
  AccountsOldDebt: 'accounts.oldDebt',
  AccountsPriceRules: 'accounts.priceRules',
  AccountsResetToday: 'accounts.resetToday',
  AccountsWipe: 'accounts.wipe',
  AccountsPastDays: 'accounts.pastDays',
} as const;

export type PermissionCode = (typeof Permission)[keyof typeof Permission];

export type PermissionGroup = {
  title: string;
  items: { code: PermissionCode; label: string; hint: string }[];
};

/** The checklist the admin sees when creating or editing a user. */
export const permissionGroups: PermissionGroup[] = [
  {
    title: 'Vazvrad və vitrin',
    items: [
      { code: Permission.ReturnsCreate, label: 'Vazvrad / vitrin yaratmaq', hint: 'Yeni vazvrad yaradır, şəkil əlavə edir, menecerə göndərir.' },
      { code: Permission.ReturnsReview, label: '“Sistemə işlənildi” və rədd etmək', hint: 'Menecer təsdiqi: vazvradı qəbul edir və ya rədd edir.' },
      { code: Permission.ReturnsNotify, label: 'Yeni vazvrad bildirişləri', hint: 'Vazvrad menecerə göndəriləndə telefona bildiriş gəlir.' },
      { code: Permission.ReturnsAdmin, label: 'Təsdiqdən sonra dəyişmək və silmək', hint: 'İşlənmiş vazvradı dəyişir, silir, silinənləri görür.' },
    ],
  },
  {
    title: 'Açot',
    items: [
      { code: Permission.AccountsUse, label: 'Açota daxil olmaq', hint: 'Günlük borc, pul yığımı, müştəri ilə açotu və günü bitirmək.' },
      { code: Permission.AccountsOldDebt, label: 'Köhnə borcu yazmaq və düzəltmək', hint: 'Sədərək müştərisinin köhnə borcuna əlavə və düzəliş.' },
      { code: Permission.AccountsPriceRules, label: 'Vazvrad qiymətlərini dəyişmək', hint: 'Kod başlanğıcına görə 1 ədədin qiyməti.' },
      { code: Permission.AccountsResetToday, label: '“Bu günü sıfırla”', hint: 'Müştərinin bu günkü bütün yazılarını silir.' },
      { code: Permission.AccountsWipe, label: '“Bütün hesabı sıfırla”', hint: 'Müştərinin bütün borcunu və tarixçəsini silir.' },
      { code: Permission.AccountsPastDays, label: 'Bitmiş günü düzəltmək', hint: 'Keçmiş günlərin ödəniş və borcunu dəyişir.' },
    ],
  },
  {
    title: 'Müştərilər',
    items: [
      { code: Permission.CustomersCreate, label: 'Müştəri yaratmaq', hint: 'Yeni müştəri və Sədərək dükanı əlavə edir.' },
      { code: Permission.CustomersEdit, label: 'Müştəriləri görmək və dəyişmək', hint: 'Müştəri siyahısı, ad, telefon, Sədərək açarı.' },
      { code: Permission.CustomersDelete, label: 'Müştərini silmək', hint: 'Müştərini siyahıdan çıxarır.' },
    ],
  },
  {
    title: 'İdarəetmə',
    items: [
      { code: Permission.AdminPanel, label: 'İdarəetmə paneli', hint: 'İdarəetmə vərəqi və ümumi göstəricilər.' },
      { code: Permission.UsersManage, label: 'İstifadəçiləri idarə etmək', hint: 'İstifadəçi yaradır, icazə verir, şifrə dəyişir (admin yarada bilməz).' },
      { code: Permission.SettingsManage, label: 'Tətbiq ayarları', hint: 'Tətbiqin adı və loqosu, vazvrad kod qaydası.' },
    ],
  },
];

export const allPermissions: PermissionCode[] = permissionGroups.flatMap((group) =>
  group.items.map((item) => item.code),
);

/** Starting set of each role (the server uses the same table). */
export function rolePermissionDefaults(role: UserRole): PermissionCode[] {
  switch (role) {
    case UserRole.Admin:
      return allPermissions.filter((code) => code !== Permission.ReturnsNotify);
    case UserRole.Manager:
      return [Permission.CustomersCreate, Permission.CustomersEdit, Permission.ReturnsCreate, Permission.ReturnsReview, Permission.ReturnsNotify];
    case UserRole.Accountant:
      return [Permission.CustomersCreate, Permission.ReturnsCreate, Permission.AccountsUse, Permission.AccountsOldDebt, Permission.AccountsPriceRules, Permission.AccountsResetToday];
    case UserRole.Driver:
      return [Permission.CustomersCreate, Permission.ReturnsCreate, Permission.AccountsUse];
    case UserRole.WarehouseWorker:
      return [Permission.CustomersCreate, Permission.ReturnsCreate];
    default:
      return [];
  }
}

/**
 * Whether the signed-in user may do something. Uses the list the server sent at sign-in /
 * token refresh; an older stored session without it falls back to the role's defaults.
 */
export function can(
  session: Pick<AuthSession, 'role' | 'permissions'> | null | undefined,
  permission: PermissionCode,
): boolean {
  if (!session) return false;
  if (session.role === UserRole.Admin && permission !== Permission.ReturnsNotify) return true;
  const list = session.permissions ?? rolePermissionDefaults(session.role);
  return list.includes(permission);
}

/** Legacy order screens (switched off) still use the role. */
export function canManageOperations(role?: UserRole | null): boolean {
  return role === UserRole.Manager || role === UserRole.Admin;
}
