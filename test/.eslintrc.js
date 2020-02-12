module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 10,
    sourceType: 'module',
  },
  env: {},
  extends: ['plugin:mocha/recommended'],
  plugins: ['mocha'],
  globals: {},
  settings: {},
  rules: {
    'mocha/no-hooks-for-single-case': 'off',
  }
};
