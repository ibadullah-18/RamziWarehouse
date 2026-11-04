// Light theme: white surfaces, blue for actions, green for paid/done, red for debt and errors.
export const colors = {
  primary: '#1D4ED8',
  primaryDark: '#1E3A8A',
  primarySoft: '#DBEAFE',

  background: '#F3F6FB',
  surface: '#FFFFFF',
  surfaceSecondary: '#EEF2F8',

  text: '#0F172A',
  textSecondary: '#475569',
  textLight: '#64748B',

  border: '#DCE3EE',
  inputBorder: '#C3CEDD',

  success: '#15803D',
  successSoft: '#DCFCE7',

  warning: '#C2410C',
  warningSoft: '#FFEDD5',

  danger: '#DC2626',
  dangerSoft: '#FEE2E2',

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
    '0 6px 16px rgba(15, 23, 42, 0.08)',
} as const;
