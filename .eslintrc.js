module.exports = {
  env: {
    es2020: true,
    node: true
  },
  extends: "eslint:recommended",
  parserOptions: {
    sourceType: "module"
  },
  rules: {
    indent: ["error", 2],
    "linebreak-style": ["error", "unix"],
    "no-unused-vars": ["error", { "vars": "all", "args": "none" }],
    semi: ["error", "always"]
  }
};