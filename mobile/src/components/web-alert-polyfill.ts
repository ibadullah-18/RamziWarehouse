import { Alert, AlertButton, Platform } from 'react-native';

/**
 * react-native-web's Alert.alert is empty, so every confirmation ("Açotu bitir?", delete,
 * send to the manager...) silently did nothing in the browser. This maps it to the browser
 * dialogs: one button -> alert, several -> confirm (OK runs the first non-cancel button).
 */
if (Platform.OS === 'web') {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = message ? `${title}\n\n${message}` : title;
    const actions = buttons ?? [];
    const cancel = actions.find((button) => button.style === 'cancel');
    const confirmButtons = actions.filter((button) => button !== cancel);

    if (confirmButtons.length === 0) {
      globalThis.alert?.(text);
      cancel?.onPress?.();
      return;
    }
    if (actions.length === 1) {
      globalThis.alert?.(text);
      actions[0].onPress?.();
      return;
    }
    if (globalThis.confirm?.(text)) confirmButtons[0].onPress?.();
    else cancel?.onPress?.();
  };
}
