import js from '@eslint/js';
import eslintConfigPrettierFlat from 'eslint-config-prettier/flat';
import checkFile from 'eslint-plugin-check-file';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * @see https://typescript-eslint.io/getting-started/#step-2-configuration
 * @see https://typescript-eslint.io/users/configs
 * @see https://eslint.org/docs/latest/use/configure/
 *
 * Root ESLint config. Workspaces that need extra rules (React) extend this
 * from their own eslint.config.js.
 */
export default defineConfig([
  {
    // Only lint Typescript files
    files: ['**/*.{ts,mts,cts,tsx}'],
    plugins: {
      'check-file': checkFile,
    },
    extends: [
      /**
       * @see https://eslint.org/docs/latest/use/configure/configuration-files#using-predefined-configurations
       * Recommended ESLint rules for Javascript
       */
      js.configs.recommended,

      /**
       * @see https://typescript-eslint.io/users/configs#strict-type-checked
       * Strict, type-aware rules to prevent bugs
       */
      tseslint.configs.strictTypeChecked,

      /**
       * @see https://typescript-eslint.io/users/configs#stylistic-type-checked
       * Typescript best practices
       */
      tseslint.configs.stylisticTypeChecked,

      /**
       * @see https://github.com/prettier/eslint-config-prettier
       * Disables ESLint rules that conflict with Prettier
       */
      eslintConfigPrettierFlat,
    ],
    languageOptions: {
      /**
       * @see https://typescript-eslint.io/getting-started/typed-linting
       * Typescript parsing is required for type checked ESLint rules
       */
      parserOptions: {
        projectService: true,
      },
      // Match tsconfig.json version target
      ecmaVersion: 2024,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      /**
       * @see https://eslint.org/docs/latest/rules/no-restricted-imports
       * Deeply nested relative imports are a smell; use `#src/...` subpath
       * imports (see each package.json `imports`) instead.
       */
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: ['../../../*'],
              message:
                'Avoid deeply nested relative imports. Use a #src/ subpath import instead.',
            },
          ],
        },
      ],
      /**
       * @see https://github.com/dukeluo/eslint-plugin-check-file
       * Consistent folder and file naming
       */
      'check-file/filename-naming-convention': [
        'error',
        {
          '**/*.{ts,mts,cts,tsx}': 'KEBAB_CASE',
        },
        {
          ignoreMiddleExtensions: true,
        },
      ],
      'check-file/folder-naming-convention': [
        'error',
        {
          '{src,tests}/**': 'KEBAB_CASE',
        },
      ],
      /**
       * @see https://typescript-eslint.io/rules/naming-convention/
       * Consistent identifier naming
       */
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: [
            'accessor',
            'parameter',
            'classProperty',
            'classMethod',
            'variable',
          ],
          // Prefer camelCase but allow PascalCase or UPPER_CASE for globals
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          // Allow underscore for unused variables
          leadingUnderscore: 'allow',
        },
        {
          selector: ['function'],
          // React components should be PascalCase, otherwise camelCase
          format: ['PascalCase', 'camelCase'],
        },
        {
          selector: ['class', 'interface'],
          format: ['PascalCase'],
        },
        {
          selector: ['enum'],
          format: ['PascalCase'],
        },
        {
          selector: ['enumMember'],
          format: ['UPPER_CASE'],
        },
        {
          // Private class members are identified by a leading underscore
          selector: ['accessor', 'classProperty', 'classMethod'],
          modifiers: ['private'],
          format: null,
          leadingUnderscore: 'require',
          trailingUnderscore: 'forbid',
        },
        {
          // Protected class members are identified by a leading underscore
          selector: ['accessor', 'classProperty', 'classMethod'],
          modifiers: ['protected'],
          format: null,
          leadingUnderscore: 'require',
          trailingUnderscore: 'forbid',
        },
        {
          // Public class members have no leading/trailing underscore
          selector: ['accessor', 'classProperty', 'classMethod'],
          modifiers: ['public'],
          format: null,
          leadingUnderscore: 'forbid',
          trailingUnderscore: 'forbid',
        },
        {
          // All other identifiers have no leading/trailing underscore
          selector: [
            'class',
            'enum',
            'enumMember',
            'function',
            'interface',
            'objectLiteralMethod',
            'objectLiteralProperty',
            'typeAlias',
            'typeMethod',
            'typeParameter',
            'typeProperty',
            'variable',
          ],
          format: null,
          leadingUnderscore: 'forbid',
          trailingUnderscore: 'forbid',
        },
      ],
    },
  },
  {
    // Relax unsafe-* rules in tests to avoid needing to do type gymnastics
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
]);
