export const colors = {
  primary: '#8A632B',
  primaryDark: '#29251F',
  primarySoft: '#F2E8D9',

  background: '#F6F2EC',
  surface: '#FFFFFF',
  surfaceSecondary: '#FBF8F3',

  text: '#24211D',
  textSecondary: '#6F675E',
  textLight: '#9B9185',

  border: '#E4DDD3',
  inputBorder: '#D8CEC1',

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
  boxShadow:
    '0 8px 18px rgba(41, 37, 31, 0.08)',
} as const;
