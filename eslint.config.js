// @ts-check

import payloadEsLintConfig from '@payloadcms/eslint-config'

export const defaultESLintIgnores = [
  '**/.temp',
  '**/.*', // ignore all dotfiles
  '**/.git',
  '**/.hg',
  '**/.pnp.*',
  '**/.svn',
  '**/playwright.config.ts',
  '**/vitest.config.js',
  '**/tsconfig.tsbuildinfo',
  '**/README.md',
  '**/eslint.config.js',
  '**/payload-types.ts',
  '**/dist/**',
  'dist/**',
  'dist',
  '**/.yarn/',
  '**/build/**',
  'build/**',
  'build',
  '**/node_modules/',
  '**/temp/',
  'dev/test-plugin.js',
  '**/*.d.ts',
  'dev/next-env.d.ts',
  'dev/.next/**',
  'dev/**/importMap.js',
  '**/importMap.js',
]

export default [
  {
    ignores: defaultESLintIgnores,
  },
  ...payloadEsLintConfig,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.mjs'],
    rules: {
      'no-restricted-exports': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './dev/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]
