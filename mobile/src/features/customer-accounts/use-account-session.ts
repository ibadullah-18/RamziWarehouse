import { useAuth } from '../../auth/auth-context';
import { UserRole } from '../../auth/auth-types';
import { can, Permission } from '../../auth/permissions';

/** Who may do what in the açot (mirrors the server rules). */
export function useAccountSession() {
  const { session } = useAuth();
  const role = session?.role;
  const isAdmin = role === UserRole.Admin;
  return {
    token: session?.accessToken ?? '',
    role,
    isAdmin,
    canUse: can(session, Permission.AccountsUse),
    canWriteOldDebt: can(session, Permission.AccountsOldDebt),
    canPriceRules: can(session, Permission.AccountsPriceRules),
    canResetToday: can(session, Permission.AccountsResetToday),
    canWipe: can(session, Permission.AccountsWipe),
    canFixPastDays: can(session, Permission.AccountsPastDays),
    canCreateCustomer: can(session, Permission.CustomersCreate),
    canCustomers: can(session, Permission.CustomersEdit),
    canCreateReturn: can(session, Permission.ReturnsCreate),
  };
}

export function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
