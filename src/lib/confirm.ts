import { Alert, Platform } from 'react-native';

/** Cross-platform confirm: window.confirm on web, Alert on native. */
export function crossConfirm(message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert('', message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}
