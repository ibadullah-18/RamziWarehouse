export enum UserRole {
  Manager = 1,
  WarehouseWorker = 2,
  Driver = 3,
  Admin = 4,
  Accountant = 5,
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtUtc: string;
  userId: string;
  fullName: string;
  username: string;
  role: UserRole;
}

export interface ApiProblemDetails {
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  traceId?: string;
}