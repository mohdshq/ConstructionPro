const React = require('react');

const Component = ({ children }: any) => children ?? null;
Component.displayName = 'MockComponent';

module.exports = new Proxy({}, {
  get: (target: any, prop: string | symbol) => {
    if (prop === '$$typeof') return undefined;
    if (prop === '__esModule') return true;
    if (prop === 'default') return Component;
    return Component;
  },
});
