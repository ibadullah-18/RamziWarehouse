import { OrderDetail } from './order-detail-types';

export enum ProductType {
  Product = 1,
  Showcase = 2,
}

export type Customer = {
  id: string;
  name: string;
  phoneNumber: string | null;
  note: string | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
};

export type Warehouse = {
  id: string;
  name: string;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
};

export type ProductSuggestion = {
  productCode: string;
  partyNumber: string;
  productType: ProductType;
  usageCount: number;
  lastUsedAtUtc: string;
};

export type DraftOrderItem = {
  localId: string;
  productCode: string;
  partyNumber: string;
  productType: ProductType;
  quantity: number;
};

export type CreateOrderItemRequest = {
  productCode: string;
  partyNumber: string;
  productType: ProductType;
  quantity: number;
};

export type CreateOrderRequest = {
  orderNumber: string;
  orderDate: string;
  customerId: string;
  warehouseId: string;
  note: string | null;
  items: CreateOrderItemRequest[];
};

export type CreateOrderResult = OrderDetail;