export default {
  extensionsToTreatAsEsm: [".ts"],
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/"],
  moduleNameMapper: {
    "(.+)\\.js": "$1",
  },
};
