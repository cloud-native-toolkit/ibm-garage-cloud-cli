module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    "node_modules/",
    "logs/.*",
    "dist/.*",
    "pacts/.*",
    "coverage/",
  ],
  watchPathIgnorePatterns: [
    "node_modules/",
    "logs/",
    "dist/",
    "pacts/",
    "coverage/"
  ],
  testResultsProcessor: "jest-sonar-reporter",
  testMatch: [ "**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[t]s?(x)" ],
  setupFiles: [
    "jest-plugin-context/setup"
  ],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
};
