export type Customer = {
  id: string;
  name: string;
  phoneNumber: string | null;
  note: string | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
};

export type CustomerQuery = {
  search?: string;
  isActive?: boolean;
};

export type CreateCustomerRequest = {
  name: string;
  phoneNumber: string | null;
  note: string | null;
};

export type UpdateCustomerRequest = {
  name: string;
  phoneNumber: string | null;
  note: string | null;
  isActive: boolean;
};