import { UserRole } from '../../auth/auth-types';

export type UserRoleOption = {
  value: UserRole;
  label: string;
  description: string;
};

export const userRoleOptions: readonly UserRoleOption[] = [
  {
    value: UserRole.Admin,
    label: 'Admin',
    description: 'Bütün əməliyyatları və istifadəçiləri idarə edir.',
  },
  {
    value: UserRole.Manager,
    label: 'Menecer',
    description: 'Qaimə və vazvrad əməliyyatlarını idarə edir.',
  },
  {
    value: UserRole.WarehouseWorker,
    label: 'Anbar işçisi',
    description: 'Sifarişləri hazırlayır və şəkil əlavə edir.',
  },
  {
    value: UserRole.Driver,
    label: 'Sürücü',
    description: 'Sifarişləri müştəriyə təhvil verir.',
  },
];

export function getUserRoleLabel(
  role: UserRole,
): string {
  const option = userRoleOptions.find(
    (currentOption) =>
      currentOption.value === role,
  );

  return option?.label ?? 'Naməlum rol';
}