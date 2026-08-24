module.exports = {
  printToFileAsync: jest.fn().mockResolvedValue({ uri: 'file:///tmp/generated-report.pdf' }),
  printAsync: jest.fn().mockResolvedValue(undefined),
};
