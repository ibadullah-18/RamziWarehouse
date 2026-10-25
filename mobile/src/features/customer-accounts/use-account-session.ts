import { useAuth } from '../../auth/auth-context';
import { UserRole } from '../../auth/auth-types';

/** Who may do what in the açot (mirrors the server rules). */
export function useAccountSession() {
  const { session } = useAuth();
  const role = session?.role;
  const isAdmin = role === UserRole.Admin;
  return {
    token: session?.accessToken ?? '',
    role,
    isAdmin,
    /** Admin, açot operator and driver. */
    canUse: isAdmin || role === UserRole.Accountant || role === UserRole.Driver,
    /** The first (old) debt of a customer is written by an admin or the açot operator. */
    canWriteOldDebt: isAdmin || role === UserRole.Accountant,
  };
}

export function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
