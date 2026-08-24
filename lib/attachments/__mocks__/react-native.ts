const React = require('react');

const mockComponent = (name: string) => {
  const Component = React.forwardRef((props: any, ref: any) => {
    return React.createElement(name, { ...props, ref }, props.children);
  });
  Component.displayName = name;
  return Component;
};

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
  flatten: (styles: any) => styles,
};

const View = mockComponent('View');
const Text = mockComponent('Text');
const Image = mockComponent('Image');
const TouchableOpacity = mockComponent('TouchableOpacity');
const ActivityIndicator = mockComponent('ActivityIndicator');
const ScrollView = mockComponent('ScrollView');
const SafeAreaView = mockComponent('SafeAreaView');
const FlatList = mockComponent('FlatList');
const RefreshControl = mockComponent('RefreshControl');

const Touchable = {
  Mixin: {},
};

module.exports = {
  Platform,
  Alert,
  AppState,
  Dimensions,
  StyleSheet,
  Touchable,
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  FlatList,
  RefreshControl,
  default: {
    Platform,
    Alert,
    AppState,
    Dimensions,
    StyleSheet,
    Touchable,
    View,
    Text,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    SafeAreaView,
    FlatList,
    RefreshControl,
  },
};
