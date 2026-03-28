export default {
  extends: ["@commitlint/config-conventional"],
  ignores: [
    (commit) => commit.includes("chore(release):"),
    (commit) => commit.includes("Merge "),
    (commit) => commit.includes("(#") && commit.includes(")")
  ],
  plugins: [
    {
      rules: {
        "custom-type-enum": (parsed) => {
          const expectedTypes = [
            "feat",
            "fix",
            "test",
            "build",
            "refactor",
            "perf",
            "docs",
            "ci",
            "chore",
            "style",
            "revert"
          ];

          if (!expectedTypes.includes(parsed.type)) {
            return [
              false,
              `Invalid commit type. Must be one of: ${expectedTypes.join(", ")}.`
            ];
          }

          return [true];
        }
      }
    }
  ],
  rules: {
    "custom-type-enum": [2, "always"]
  }
};
