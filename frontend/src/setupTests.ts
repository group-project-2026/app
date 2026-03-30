import "@testing-library/jest-dom";

declare const require: (id: string) => {
  TextEncoder: typeof globalThis.TextEncoder;
  TextDecoder: typeof globalThis.TextDecoder;
};

const { TextDecoder, TextEncoder } = require("node:util");

globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
