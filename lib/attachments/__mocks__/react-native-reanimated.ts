const React = require('react');

const mockAnimation = {
  delay: () => mockAnimation,
  duration: () => mockAnimation,
  springify: () => mockAnimation,
  damping: () => mockAnimation,
  stiffness: () => mockAnimation,
  mass: () => mockAnimation,
  withInitialValues: () => mockAnimation,
};

const AnimatedComponent = ({ children, ...props }: any) => React.createElement('View', props, children);

module.exports = {
  __esModule: true,
  default: {
    View: AnimatedComponent,
    Text: ({ children, ...props }: any) => React.createElement('Text', props, children),
    ScrollView: ({ children, ...props }: any) => React.createElement('ScrollView', props, children),
    createAnimatedComponent: (comp: any) => comp,
  },
  FadeIn: mockAnimation,
  FadeInDown: mockAnimation,
  FadeInUp: mockAnimation,
  FadeInLeft: mockAnimation,
  FadeInRight: mockAnimation,
  FadeOut: mockAnimation,
  FadeOutDown: mockAnimation,
  FadeOutUp: mockAnimation,
  FadeOutLeft: mockAnimation,
  FadeOutRight: mockAnimation,
  SlideInDown: mockAnimation,
  SlideInUp: mockAnimation,
  SlideOutDown: mockAnimation,
  SlideOutUp: mockAnimation,
  useSharedValue: (init: any) => ({ value: init }),
  useAnimatedStyle: (fn: any) => fn() || {},
  withTiming: (toValue: any) => toValue,
  withSpring: (toValue: any) => toValue,
  withDelay: (_: any, anim: any) => anim,
  runOnJS: (fn: any) => fn,
};
