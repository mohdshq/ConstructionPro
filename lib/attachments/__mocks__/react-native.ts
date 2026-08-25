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

const ActionSheetIOS = {
  showActionSheetWithOptions: jest.fn(),
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
const TextInput = mockComponent('TextInput');
const Modal = mockComponent('Modal');

const FlatList = React.forwardRef(({ data, renderItem, ListEmptyComponent, ListHeaderComponent, ListFooterComponent, ...props }: any, ref: any) => {
  return React.createElement(
    'FlatList',
    { ...props, ref },
    ListHeaderComponent ? (typeof ListHeaderComponent === 'function' ? React.createElement(ListHeaderComponent) : ListHeaderComponent) : null,
    data && data.length > 0
      ? data.map((item: any, index: number) =>
          renderItem ? React.createElement(React.Fragment, { key: item.id || index }, renderItem({ item, index })) : null
        )
      : (ListEmptyComponent ? (typeof ListEmptyComponent === 'function' ? React.createElement(ListEmptyComponent) : ListEmptyComponent) : null),
    ListFooterComponent ? (typeof ListFooterComponent === 'function' ? React.createElement(ListFooterComponent) : ListFooterComponent) : null
  );
});
FlatList.displayName = 'FlatList';
const RefreshControl = mockComponent('RefreshControl');
const KeyboardAvoidingView = mockComponent('KeyboardAvoidingView');
const useColorScheme = jest.fn(() => 'dark');

const Touchable = {
  Mixin: {},
};

module.exports = {
  Platform,
  Alert,
  ActionSheetIOS,
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
  TextInput,
  Modal,
  FlatList,
  RefreshControl,
  KeyboardAvoidingView,
  useColorScheme,
  default: {
    Platform,
    Alert,
    ActionSheetIOS,
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
    TextInput,
    Modal,
    FlatList,
    RefreshControl,
    KeyboardAvoidingView,
    useColorScheme,
  },
};
