import { createContext } from 'react';
import type { View } from 'react-native';

/**
 * A page that scrolls provides this so a field can bring a panel it opened (the code keypad)
 * fully into view; without a provider it does nothing.
 */
export const ScrollIntoViewContext = createContext<(node: View | null) => void>(() => {});
