/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  moduleNameMapper: {
    '^@creatorplus/database$': '<rootDir>/../../packages/database/src',
    '^@creatorplus/email$': '<rootDir>/../../packages/email/src',
  },
  testEnvironment: 'node',
  maxWorkers: 1,
};
