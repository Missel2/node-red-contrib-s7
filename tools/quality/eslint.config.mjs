import globals from "globals";

export default [
  {
    ignores: ["**/node_modules/**", "**/test-reports/**", "**/coverage/**"],
  },
  {
    files: [
      "red/**/*.js",
      "src/**/*.js",
      "test/**/*.js",
      "scripts/**/*.js",
      "tools/quality/**/*.js",
      "tools/quality/**/*.cjs",
      "tools/quality/**/*.mjs",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: { ...globals.node, ...globals.es2022 },
    },
    rules: {
      "no-undef": "error",
      "no-dupe-args": "error",
      "no-unreachable": "error",
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-async-promise-executor": "error",
      "no-unsafe-optional-chaining": "error",
      "no-compare-neg-zero": "error",
      "no-constant-binary-expression": "error",
      "no-func-assign": "error",
      "no-sparse-arrays": "error",
      "no-unexpected-multiline": "error",
    },
  },
  {
    files: ["tools/quality/**/*.mjs"],
    languageOptions: { sourceType: "module" },
  },
];
