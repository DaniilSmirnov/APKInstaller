module.exports = {
  testEnvironment: 'jsdom',
  transform: { '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  moduleNameMapper: { '\\\\.(css)$': '<rootDir>/src/styleMock.js' },
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/release/'],
};
