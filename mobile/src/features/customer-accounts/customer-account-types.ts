import { UserRole } from '../../auth/auth-types';

export enum CustomerAccountEntryType {
  OpeningBalance = 1,
  Debt = 2,
  Payment = 3,
  AdjustmentIncrease = 4,
  AdjustmentDecrease = 5,
}

export type CustomerAccountQuery = {
  search?: string;
  date?: string;
  pageNumber?: number;
  pageSize?: number;
};

export type CreateCustomerAccountRequest = {
  customerId: string;
  initialPreviousDebt: number | null;
  todayDebt: number;
  note: string | null;
};

export type RecordCustomerPaymentRequest = {
  customerId: string;
  amount: number;
  note: string | null;
};

export type CorrectPreviousDebtRequest = {
  customerId: string;
  correctedPreviousDebt: number;
  reason: string;
};

export type CustomerAccountEntry = {
  id: string;
  customerId: string;
  entryType: CustomerAccountEntryType;
  amount: number;
  businessDate: string;
  note: string | null;
  recordedByUserId: string;
  recordedByFullName: string;
  recordedByRole: UserRole;
  createdAtUtc: string;
};

export type CustomerAccountSummary = {
  customerId: string;
  customerName: string;
  phoneNumber: string | null;
  isActive: boolean;
  businessDate: string;
  previousDebt: number;
  todayDebt: number;
  todayPayment: number;
  paidFromPreviousDebt: number;
  paidFromTodayDebt: number;
  previousDebtRemaining: number;
  todayDebtRemaining: number;
  remainingDebt: number;
};

export type CustomerAccountList = {
  items: CustomerAccountSummary[];
  businessDate: string;
  pageNumber: number;
  pageSize: number;
  totalCount: number;
};

export type CustomerAccountDay = {
  businessDate: string;
  openingDebt: number;
  adjustmentAmount: number;
  addedDebt: number;
  paidAmount: number;
  closingDebt: number;
  entries: CustomerAccountEntry[];
};

export type CustomerDeferredDebt = {
  businessDate: string;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  isOpeningBalance: boolean;
};
export type CustomerAccountDetails = {
  customerId: string;
  customerName: string;
  phoneNumber: string | null;
  isActive: boolean;
  previousDebt: number;
  totalNewDebt: number;
  totalDebt: number;
  totalPaid: number;
  remainingDebt: number;
  deferredDebts: CustomerDeferredDebt[];
  days: CustomerAccountDay[];
};
