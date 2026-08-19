import { UserRole } from '../../auth/auth-types';

export type WarehouseUser = {
  id: string;
  fullName: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAtUtc: string | null;
  createdAtUtc: string;
};

export type CreateUserRequest = {
  fullName: string;
  username: string;
  password: string;
  role: UserRole;
};

export type UpdateUserRequest = {
  fullName: string;
  username: string;
  role: UserRole;
  isActive: boolean;
};

export type ChangeUserPasswordRequest = {
  newPassword: string;
};