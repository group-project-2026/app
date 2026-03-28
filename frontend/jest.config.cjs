module.exports = {
  testEnvironment: "jsdom",
  testMatch: ["**/?(*.)+(test|spec).[tj]s?(x)"],
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.test.json" }]
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|sass|scss)$": "identity-obj-proxy",
    "\\.(gif|ttf|eot|svg|png|jpe?g|webp)$":
      "<rootDir>/src/__mocks__/fileMock.js"
  }
};
