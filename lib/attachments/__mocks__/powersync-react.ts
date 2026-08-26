const React = require('react');

const PowerSyncContext = React.createContext(null);

module.exports = {
  PowerSyncContext,
  usePowerSync: jest.fn(() => ({})),
  useQuery: jest.fn(() => ({ data: [] })),
  useStatus: jest.fn(() => ({ hasSynced: true, connected: true })),
};
