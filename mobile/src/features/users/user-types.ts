import { UserRole } from '../../auth/auth-types';

export type WarehouseUser = {
  id: string;
  fullName: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAtUtc: string | null;
  createdAtUtc: string;
  /** Effective permissions. */
  permissions?: string[];
  hasCustomPermissions?: boolean;
};

export type CreateUserRequest = {
  fullName: string;
  username: string;
  password: string;
  role: UserRole;
  permissions?: string[];
};

export type UpdateUserRequest = {
  fullName: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  permissions?: string[];
};

export type ChangeUserPasswordRequest = {
  newPassword: string;
};