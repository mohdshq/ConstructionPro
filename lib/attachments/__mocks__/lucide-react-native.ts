const React = require('react');

const mockIcon = (name: string) => {
  const Icon = (props: any) => React.createElement('Icon', { name, ...props });
  Icon.displayName = name;
  return Icon;
};

module.exports = new Proxy({}, {
  get: (target: any, prop: string | symbol) => {
    if (typeof prop === 'string') {
      return mockIcon(prop);
    }
    return undefined;
  },
});
