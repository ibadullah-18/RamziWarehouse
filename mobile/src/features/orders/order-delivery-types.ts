export type DeliveryPhoto = {
  id: string;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedByUserId: string;
  uploadedByFullName: string;
  uploadedAtUtc: string;
};

export type OrderDelivery = {
  id: string;
  orderId: string;
  deliveredByUserId: string;
  deliveredByFullName: string;
  startedAtUtc: string;
  deliveredAtUtc: string | null;
  note: string | null;
  photos: DeliveryPhoto[];
};

export type DeliveryPhotoUpload = {
  uri: string;
  fileName: string;
  contentType: string;
};