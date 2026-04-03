// Root-level ESLint flat config.
// Defines global ignores for IDE support; each workspace has its own eslint.config.js.

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/generated/**",
    ],
  },
]
