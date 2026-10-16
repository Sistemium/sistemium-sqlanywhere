import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import mocha from 'eslint-plugin-mocha';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([

  globalIgnores(['lib/', '.nyc_output/', 'coverage/', '.claude/']),

  {
    files: ['src/**/*.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      stylistic.configs.customize({
        indent: 2,
        quotes: 'single',
        semi: true,
        braceStyle: '1tbs',
        commaDangle: 'always-multiline',
      }),
    ],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // results and bind values of the driver are untyped
      '@typescript-eslint/no-explicit-any': 'off',
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': ['error', { functions: false, classes: true }],
      'no-param-reassign': ['error', { props: true }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'object-shorthand': 'error',
      '@stylistic/arrow-parens': ['error', 'as-needed'],
      '@stylistic/padded-blocks': 'off',
      '@stylistic/no-mixed-operators': 'off',
      '@stylistic/member-delimiter-style': ['error', {
        multiline: { delimiter: 'none' },
        singleline: { delimiter: 'comma', requireLast: false },
      }],
      '@stylistic/max-len': ['error', {
        code: 100,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      }],
    },
  },

  {
    files: ['test/**/*.js'],
    extends: [
      js.configs.recommended,
      mocha.configs.recommended,
    ],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
    },
  },

]);
