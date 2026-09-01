const reactTestRenderer = require('react-test-renderer');

function enhanceInstance(instance: any, rootInstance?: any) {
  if (!instance || typeof instance !== 'object') return instance;
  if (!instance.queryAll) {
    instance.queryAll = function (predicate: any) {
      try {
        return this.findAll(predicate);
      } catch (e) {
        return [];
      }
    };
  }
  if (!instance.query) {
    instance.query = function (predicate: any) {
      try {
        return this.find(predicate);
      } catch (e) {
        return null;
      }
    };
  }
  if (!instance.toJSON) {
    instance.toJSON = function () {
      try {
        return rootInstance ? rootInstance.toJSON() : null;
      } catch (e) {
        return null;
      }
    };
  }
  return instance;
}

module.exports = {
  ...reactTestRenderer,
  createRoot: (options?: any) => {
    let root: any = null;
    return {
      render(element: any) {
        if (!root) {
          root = reactTestRenderer.create(element, options);
        } else {
          root.update(element);
        }
      },
      unmount() {
        if (root) {
          root.unmount();
        }
      },
      get container() {
        if (!root) return null;
        try {
          return enhanceInstance(root.root, root);
        } catch (e) {
          return null;
        }
      },
    };
  },
};
