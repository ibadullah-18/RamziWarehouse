export enum OrderStatus {
  Created = 1,
  InPreparation = 2,
  ReadyForDelivery = 3,
  Delivered = 4,
  Cancelled = 5,
}

export interface OrderListItem {
  id: string;
  orderNumber: string;
  orderDate: string;

  customerId: string;
  customerName: string;

  warehouseId: string;
  warehouseName: string;

  status: OrderStatus;

  itemLineCount: number;
  totalQuantity: number;

  createdByUserId: string;
  createdByFullName: string;

  preparedByUserId?: string | null;
  preparedByFullName?: string | null;

  createdAtUtc: string;
  completedAtUtc?: string | null;
  deleteAfterUtc?: string | null;
}

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface OrderQuery {
  search?: string;
  status?: OrderStatus | null;

  fromDate?: string;
  toDate?: string;

  pageNumber?: number;
  pageSize?: number;
}