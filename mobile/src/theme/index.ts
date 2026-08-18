export const colors = {
  primary: '#244A86',
  primaryDark: '#17325E',
  primarySoft: '#EAF0FA',

  background: '#F4F6FA',
  surface: '#FFFFFF',
  surfaceSecondary: '#F9FAFC',

  text: '#182230',
  textSecondary: '#667085',
  textLight: '#98A2B3',

  border: '#E1E6ED',
  inputBorder: '#D7DEE8',

  success: '#16835D',
  successSoft: '#E8F6F0',

  warning: '#B7791F',
  warningSoft: '#FFF6E5',

  danger: '#C2414B',
  dangerSoft: '#FDECEF',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  round: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  title: 28,
  display: 34,
} as const;

export const cardShadow = {
  shadowColor: '#17325E',
  shadowOffset: {
    width: 0,
    height: 8,
  },
  shadowOpacity: 0.08,
  shadowRadius: 18,
  elevation: 4,
} as const;