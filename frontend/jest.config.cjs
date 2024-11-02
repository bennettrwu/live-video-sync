/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  collectCoverage: true,
  testEnvironment: 'jsdom',
  transform: {
    '^.+.tsx?$': ['ts-jest', {tsconfig: 'tsconfig.app.json'}],
  },
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|css|scss)$':
      'jest-transform-stub',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup/setupTests.ts'],
};
