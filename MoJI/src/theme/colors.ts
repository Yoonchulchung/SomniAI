/**
 * Color Palettes for Light and Dark Themes
 */

export const colorPalettes = {
  // Primary
  primary: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2196F3',
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0',
    900: '#0D47A1',
  },

  // Success
  success: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50',
    600: '#43A047',
    700: '#388E3C',
    800: '#2E7D32',
    900: '#1B5E20',
  },

  // Error
  error: {
    50: '#FFEBEE',
    100: '#FFCDD2',
    200: '#EF9A9A',
    300: '#E57373',
    400: '#EF5350',
    500: '#F44336',
    600: '#E53935',
    700: '#D32F2F',
    800: '#C62828',
    900: '#B71C1C',
  },

  // Warning
  warning: {
    50: '#FFF3E0',
    100: '#FFE0B2',
    200: '#FFCC80',
    300: '#FFB74D',
    400: '#FFA726',
    500: '#FF9800',
    600: '#FB8C00',
    700: '#F57C00',
    800: '#EF6C00',
    900: '#E65100',
  },

  // Info
  info: {
    50: '#E1F5FE',
    100: '#B3E5FC',
    200: '#81D4FA',
    300: '#4FC3F7',
    400: '#29B6F6',
    500: '#03A9F4',
    600: '#039BE5',
    700: '#0288D1',
    800: '#0277BD',
    900: '#01579B',
  },

  // Grayscale
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
};

export const lightThemeColors = {
  ...colorPalettes,

  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5F5',
    tertiary: '#EEEEEE',
    elevated: '#FFFFFF',
    modal: '#FFFFFF',
  },

  text: {
    primary: '#212121',
    secondary: '#757575',
    tertiary: '#9E9E9E',
    inverse: '#FFFFFF',
    disabled: '#BDBDBD',
  },

  border: {
    light: '#EEEEEE',
    main: '#E0E0E0',
    dark: '#BDBDBD',
  },

  surface: {
    base: '#FFFFFF',
    elevated: '#FAFAFA',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  status: {
    online: '#4CAF50',
    offline: '#F44336',
    away: '#FF9800',
    busy: '#E53935',
  },
};

export const darkThemeColors = {
  ...colorPalettes,

  background: {
    primary: '#121212',
    secondary: '#1E1E1E',
    tertiary: '#2C2C2C',
    elevated: '#1F1F1F',
    modal: '#2C2C2C',
  },

  text: {
    primary: '#FFFFFF',
    secondary: '#B3B3B3',
    tertiary: '#808080',
    inverse: '#212121',
    disabled: '#4D4D4D',
  },

  border: {
    light: '#2C2C2C',
    main: '#404040',
    dark: '#595959',
  },

  surface: {
    base: '#1E1E1E',
    elevated: '#2C2C2C',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },

  status: {
    online: '#66BB6A',
    offline: '#EF5350',
    away: '#FFA726',
    busy: '#E57373',
  },
};

export type ThemeColors = typeof lightThemeColors;
