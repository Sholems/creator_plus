/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@creatorplus/database$': '<rootDir>/../../packages/database/src',
  },
  testEnvironment: 'node',
  // Integration specs open real DB connections; give them room and run serially
  // so they don't fight over the same test rows.
  testTimeout: 30000,
  maxWorkers: 1,
};
