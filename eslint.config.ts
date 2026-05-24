// eslint.config.ts
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import boundaries from 'eslint-plugin-boundaries'

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'vite.config.ts',
      'vitest.config.ts',
      'playwright.config.ts',
      'postcss.config.ts',
      'tailwind.config.ts',
      'eslint.config.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
      boundaries,
    },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.app.json' },
        node: { extensions: ['.ts', '.tsx', '.js', '.jsx'] },
      },
      'boundaries/elements': [
        { type: 'shared',   pattern: 'src/shared/**' },
        { type: 'entities', pattern: 'src/entities/**' },
        { type: 'features', pattern: 'src/features/**' },
        { type: 'widgets',  pattern: 'src/widgets/**' },
        { type: 'pages',    pattern: 'src/pages/**' },
        { type: 'app',      pattern: 'src/app/**' },
        { type: 'mocks',    pattern: 'src/mocks/**' },
      ],
      'boundaries/ignore': ['src/main.tsx', 'src/test-setup.ts'],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'boundaries/dependencies': ['error', {
        default: 'disallow',
        rules: [
          { from: { type: 'shared' },   disallow: { to: { type: '*' } } },
          { from: { type: 'entities' }, allow: { to: { type: ['shared'] } } },
          { from: { type: 'features' }, allow: { to: { type: ['entities', 'shared'] } } },
          { from: { type: 'widgets' },  allow: { to: { type: ['features', 'entities', 'shared'] } } },
          { from: { type: 'pages' },    allow: { to: { type: ['widgets', 'features', 'entities', 'shared'] } } },
          { from: { type: 'app' },      allow: { to: { type: ['pages', 'widgets', 'features', 'entities', 'shared'] } } },
          { from: { type: 'mocks' },    allow: { to: { type: ['shared', 'entities', 'features'] } } },
        ],
      }],
    },
  },
)
