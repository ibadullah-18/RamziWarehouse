import {
    UserRole,
} from './auth-types';

export function canManageOperations(
  role?: UserRole | null,
): boolean {
  return (
    role === UserRole.Manager ||
    role === UserRole.Admin
  );
}

export function canManageUsers(
  role?: UserRole | null,
): boolean {
  return role === UserRole.Admin;
}