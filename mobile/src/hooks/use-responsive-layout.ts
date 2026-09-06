import { useWindowDimensions } from 'react-native';

export type ResponsiveLayout = {
  width: number;
  height: number;
  isPhone: boolean;
  isTablet: boolean;
  isLandscape: boolean;
  columnCount: 1 | 2 | 3;
  horizontalPadding: number;
  contentMaxWidth: number;
};

export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } =
    useWindowDimensions();

  const shortestSide =
    Math.min(width, height);

  const isTablet =
    shortestSide >= 600;

  const isLandscape =
    width > height;

  let columnCount: 1 | 2 | 3 = 1;

  if (isTablet && width >= 1100) {
    columnCount = 3;
  } else if (isTablet) {
    columnCount = 2;
  }

  return {
    width,
    height,
    isPhone: !isTablet,
    isTablet,
    isLandscape,
    columnCount,
    horizontalPadding:
      isTablet ? 28 : 16,
    contentMaxWidth:
      isTablet ? 1280 : 640,
  };
}