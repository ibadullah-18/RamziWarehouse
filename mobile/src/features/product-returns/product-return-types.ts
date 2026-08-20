export enum ProductType {
  Product = 1,
  Showcase = 2,
}

export enum ReturnStatus {
  Pending = 1,
  Completed = 2,
  Cancelled = 3,
  Submitted = 4,
}

export type ProductReturnItem = {
  id: string;
  productCode: string;
  batchNumber: string;
  quantity: number;
  productType: ProductType;
};

export type ProductReturnPhoto = {
  id: string;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedByUserId: string;
  uploadedByFullName: string;
  createdAtUtc: string;
};

export type ProductReturnStatusHistory = {
  id: string;
  previousStatus: ReturnStatus | null;
  newStatus: ReturnStatus;
  changedByUserId: string;
  changedByFullName: string;
  note: string | null;
  changedAtUtc: string;
};

export type ProductReturn = {
  id: string;
  returnDateUtc: string;

  customerId: string;
  customerName: string;

  warehouseId: string;
  warehouseName: string;

  additionalNote: string | null;
  status: ReturnStatus;

  createdByUserId: string;
  createdByFullName: string;

  processedByUserId: string | null;
  processedByFullName: string | null;
  processedAtUtc: string | null;

  createdAtUtc: string;
  completedAtUtc: string | null;
  deleteAfterUtc: string | null;

  items: ProductReturnItem[];
  photos: ProductReturnPhoto[];
  statusHistory: ProductReturnStatusHistory[];
};

export type ProductReturnList = {
  items: ProductReturn[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type ProductReturnQuery = {
  search?: string;
  status?: ReturnStatus;
  productType?: ProductType;

  fromDateUtc?: string;
  toDateUtc?: string;

  pageNumber?: number;
  pageSize?: number;
};

export type CreateProductReturnItemRequest = {
  productCode: string;
  batchNumber: string;
  quantity: number;
  productType: ProductType;
};

export type CreateProductReturnRequest = {
  customerId: string;
  warehouseId: string;
  additionalNote: string | null;
  items: CreateProductReturnItemRequest[];
};

export type DraftProductReturnItem = {
  localId: string;
  productCode: string;
  batchNumber: string;
  quantity: number;
  productType: ProductType;
};