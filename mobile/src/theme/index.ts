export const colors = {
  primary: '#E5B66C',
  primaryDark: '#171A20',
  primarySoft: '#30271B',

  background: '#080A0D',
  surface: '#12161D',
  surfaceSecondary: '#1B2028',

  text: '#F3F4F6',
  textSecondary: '#A9B1BE',
  textLight: '#8893A3',

  border: '#2B333F',
  inputBorder: '#374354',

  success: '#51D6A0',
  successSoft: '#102C23',

  warning: '#F2C45C',
  warningSoft: '#332A16',

  danger: '#FF8791',
  dangerSoft: '#361B22',

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
  boxShadow:
    '0 8px 18px rgba(41, 37, 31, 0.08)',
} as const;
