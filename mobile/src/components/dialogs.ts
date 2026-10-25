import { Alert, Platform } from 'react-native';

/** Alert.alert does nothing on the web build, so use the browser dialogs there. */
export function showMessage(title: string, message?: string) {
  if (Platform.OS === 'web') {
    globalThis.alert?.(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function confirmAction(options: {
  title: string;
  message: string;
  confirmText: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${options.title}\n\n${options.message}`)) options.onConfirm();
    return;
  }
  Alert.alert(options.title, options.message, [
    { text: 'Xeyr', style: 'cancel' },
    {
      text: options.confirmText,
      style: options.destructive ? 'destructive' : 'default',
      onPress: options.onConfirm,
    },
  ]);
}
