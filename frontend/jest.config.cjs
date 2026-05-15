module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@react-three/fiber$": "<rootDir>/__mocks__/react-three-fiber.js",
    "^@react-three/drei$": "<rootDir>/__mocks__/drei.js",
    "^three$": "<rootDir>/__mocks__/three.js",
    "^react-router-dom$": "<rootDir>/__mocks__/react-router-dom.js"
  },
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  }
};
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
