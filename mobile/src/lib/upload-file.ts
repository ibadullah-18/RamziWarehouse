import { File } from 'expo-file-system';
import { Platform } from 'react-native';

const maxBytes = 10 * 1024 * 1024;

/**
 * Adds a local picture to a multipart form. On the phone app the picture is a file on the
 * device; in the web app (iPhone/Android home screen) it is a blob: or data: URL, which the
 * phone-only file API cannot open — that was why photos failed to send from the web app.
 */
export async function appendLocalFile(
  form: FormData,
  field: string,
  uri: string,
  fileName: string,
  contentType = 'image/jpeg',
): Promise<void> {
  if (Platform.OS === 'web') {
    let blob: Blob;
    try {
      blob = await (await fetch(uri)).blob();
    } catch {
      throw new Error('Çəkilmiş şəkil tapılmadı. Yenidən çəkin.');
    }
    if (blob.size <= 0) throw new Error('Çəkilmiş şəkil boş fayldır.');
    if (blob.size > maxBytes) throw new Error('Şəklin ölçüsü maksimum 10 MB ola bilər.');
    const typed = blob.type ? blob : new Blob([blob], { type: contentType });
    form.append(field, typed, fileName);
    return;
  }

  const file = new File(uri);
  if (!file.exists) throw new Error('Çəkilmiş şəkil telefonun yaddaşında tapılmadı.');
  if (file.size <= 0) throw new Error('Çəkilmiş şəkil boş fayldır.');
  if (file.size > maxBytes) throw new Error('Şəklin ölçüsü maksimum 10 MB ola bilər.');
  form.append(field, file, fileName);
}
