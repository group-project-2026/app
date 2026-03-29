/** @param {string} commit */
const isReleaseCommit = (commit) => commit.includes("chore(release):");

/** @param {string} commit */
const isMergeCommit = (commit) => commit.includes("Merge ");

/** @param {string} commit */
const isPrMergeCommit = (commit) =>
  commit.includes("(#") && commit.includes(")");

export default {
  extends: ["@commitlint/config-conventional"],
  ignores: [isReleaseCommit, isMergeCommit, isPrMergeCommit],
  plugins: [
    {
      rules: {
        /** @param {{ type?: string | null }} parsed */
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

          if (!parsed.type || !expectedTypes.includes(parsed.type)) {
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
