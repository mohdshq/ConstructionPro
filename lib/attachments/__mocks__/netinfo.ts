module.exports = {
  addEventListener: jest.fn(() => () => {}),
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  useNetInfo: jest.fn(() => ({ isConnected: true, isInternetReachable: true })),
  default: {
    addEventListener: jest.fn(() => () => {}),
    fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
    useNetInfo: jest.fn(() => ({ isConnected: true, isInternetReachable: true })),
  },
};
