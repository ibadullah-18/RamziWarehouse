export type OrderReceiptItem = {
  lineNumber: number;
  productCode: string;
  partyNumber: string;
  productTypeName: string;
  quantity: number;
};

export type OrderReceipt = {
  orderId: string;
  orderNumber: string;
  orderDateUtc: string;
  receiptFileName: string;

  customerName: string;
  customerPhoneNumber: string;
  customerWhatsAppNumber: string;

  warehouseName: string;

  orderNote: string | null;
  deliveryNote: string | null;

  createdByFullName: string;
  preparedByFullName: string | null;
  deliveredByFullName: string;

  deliveredAtUtc: string;
  generatedAtUtc: string;

  totalQuantity: number;

  items: readonly OrderReceiptItem[];
};