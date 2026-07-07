import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Build output, dependencies, and vendored/generated tooling are not linted.
  globalIgnores([
    'dist',
    'client/dist',
    '.agents',
    '.claude',
    'ds-bundle',
    '.design-sync',
    '.ds-sync',
  ]),
  // Frontend: browser globals + React rules.
  {
    files: ['client/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  // Backend + config: Node globals (process, __dirname, ...), no React rules.
  {
    files: ['server/**/*.js', 'api/**/*.js', '*.config.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      // Allow intentionally-unused args prefixed with _ (e.g. Express error-handler
      // `next`) and props destructured only to omit them from a rest object.
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
])
