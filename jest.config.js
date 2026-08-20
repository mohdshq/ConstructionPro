module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^react-native$': '<rootDir>/lib/attachments/__mocks__/react-native.ts',
    '^@react-native-async-storage/async-storage$': '<rootDir>/lib/attachments/__mocks__/async-storage.ts',
    '^react-native-url-polyfill/auto$': '<rootDir>/lib/attachments/__mocks__/empty.ts',
    '^expo-image-manipulator$': '<rootDir>/lib/attachments/__mocks__/empty.ts',
    '^@powersync/op-sqlite$': '<rootDir>/lib/attachments/__mocks__/powersync-op-sqlite.ts',
    '^@op-engineering/op-sqlite(.*)$': '<rootDir>/lib/attachments/__mocks__/empty.ts',
    '^expo-file-system/legacy$': '<rootDir>/lib/attachments/__mocks__/expo-file-system-legacy.ts',
    '^expo-file-system$': '<rootDir>/lib/attachments/__mocks__/expo-file-system.ts',
    '^@powersync/react-native$': '<rootDir>/lib/attachments/__mocks__/powersync-react-native.ts',
  },
};
