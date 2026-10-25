import { randomUUID } from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export type CapturedPhoto = {
  uri: string;
  fileName: string;
  contentType: 'image/jpeg';
  operationId: string;
};

/** Long side of the stored proof photo; enough to read a wallpaper code and batch. */
const maxSide = 1280;

export class CameraPermissionError extends Error {
  constructor() {
    super('Sübut şəklini çəkmək üçün kamera icazəsi verin.');
  }
}

/**
 * Opens the camera and returns a small JPEG (about 150-300 KB). The camera is asked for a
 * moderate quality up front and the picture is scaled down once before it is uploaded, so
 * the upload no longer sends a multi-megabyte original over the mobile network.
 */
export async function captureReturnPhoto(): Promise<CapturedPhoto | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new CameraPermissionError();

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    cameraType: ImagePicker.CameraType.back,
    allowsEditing: false,
    quality: 0.6,
    exif: false,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) throw new Error('Kamera nəticəsində şəkil alınmadı.');

  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > maxSide) {
    context.resize(asset.width >= asset.height ? { width: maxSide } : { height: maxSide });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });

  return {
    uri: saved.uri,
    fileName: `return-${Date.now()}.jpg`,
    contentType: 'image/jpeg',
    operationId: randomUUID(),
  };
}
