import { OrderStatus } from './order-types';

export type OrderItem = {
  id: string;
  productCode: string;
  partyNumber: string;
  productType: number;
  quantity: number;
};

export type OrderStatusHistory = {
  id: string;
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus;
  changedByUserId: string;
  changedByFullName: string;
  note: string | null;
  changedAtUtc: string;
};

export type OrderPreparationPhoto = {
  id: string;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedByUserId: string;
  uploadedByFullName: string;
  uploadedAtUtc: string;
};

export type OrderDetail = {
  id: string;
  orderNumber: string;
  orderDate: string;

  customerId: string;
  customerName: string;

  warehouseId: string;
  warehouseName: string;

  note: string | null;
  status: OrderStatus;

  createdByUserId: string;
  createdByFullName: string;

  preparedByUserId: string | null;
  preparedByFullName: string | null;

  preparationStartedAtUtc: string | null;
  preparedAtUtc: string | null;

  completedAtUtc: string | null;
  deleteAfterUtc: string | null;

  createdAtUtc: string;
  updatedAtUtc: string | null;

  items: OrderItem[];
  statusHistory: OrderStatusHistory[];
  preparationPhotos: OrderPreparationPhoto[];
};