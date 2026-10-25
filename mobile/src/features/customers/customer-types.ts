export type Customer = {
  id: string;
  name: string;
  phoneNumber: string | null;
  note: string | null;
  isActive: boolean;
  isAccountCustomer: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
};

export type CustomerQuery = {
  search?: string;
  isActive?: boolean;
  /** Sədərək dükanları: only these appear in the açot. */
  isAccountCustomer?: boolean;
};

export type CreateCustomerRequest = {
  name: string;
  phoneNumber: string | null;
  note: string | null;
  isAccountCustomer: boolean;
};

export type UpdateCustomerRequest = {
  name: string;
  phoneNumber: string | null;
  note: string | null;
  isActive: boolean;
  isAccountCustomer: boolean;
};