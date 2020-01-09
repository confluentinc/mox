// @flow
// (Copyright) Confluent, Inc.

module.exports = {
  notify: true,
  notifyMode: 'failure-success',
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'cobertura', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 10,
      statements: 10,
    },
  },
  projects: [
    {
      testMatch: ['<rootDir>/**/__tests__/*-test.js?(x)'],
      displayName: 'mox src',
      rootDir: '<rootDir>/',
    },
  ],
};
