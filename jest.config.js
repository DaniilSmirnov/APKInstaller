module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/src/testSetup.ts'],
  transform: { '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  moduleNameMapper: { '\\\\.(css)$': '<rootDir>/src/styleMock.js' },
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/release/'],
};
