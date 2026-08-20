const Platform = {
  OS: 'ios',
  select: (obj: any) => obj.ios ?? obj.default,
};

const Alert = {
  alert: jest.fn(),
};

const AppState = {
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  currentState: 'active',
};

const Dimensions = {
  get: jest.fn(() => ({ width: 375, height: 812 })),
};

const StyleSheet = {
  create: (styles: any) => styles,
};

module.exports = {
  Platform,
  Alert,
  AppState,
  Dimensions,
  StyleSheet,
  default: {
    Platform,
    Alert,
    AppState,
    Dimensions,
    StyleSheet,
  },
};
