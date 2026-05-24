// eslint.config.ts
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import boundaries from 'eslint-plugin-boundaries'

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '*.config.ts', '*.config.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
      boundaries,
    },
    settings: {
      'boundaries/elements': [
        { type: 'shared',   pattern: ['src/shared/**'] },
        { type: 'entities', pattern: ['src/entities/**'] },
        { type: 'features', pattern: ['src/features/**'] },
        { type: 'widgets',  pattern: ['src/widgets/**'] },
        { type: 'pages',    pattern: ['src/pages/**'] },
        { type: 'app',      pattern: ['src/app/**'] },
        { type: 'mocks',    pattern: ['src/mocks/**'] },
      ],
      'boundaries/ignore': ['src/main.tsx', 'src/test-setup.ts'],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'boundaries/element-types': ['error', {
        default: 'disallow',
        rules: [
          { from: 'shared',   allow: [] },
          { from: 'entities', allow: ['shared'] },
          { from: 'features', allow: ['entities', 'shared'] },
          { from: 'widgets',  allow: ['features', 'entities', 'shared'] },
          { from: 'pages',    allow: ['widgets', 'features', 'entities', 'shared'] },
          { from: 'app',      allow: ['pages', 'widgets', 'features', 'entities', 'shared'] },
          { from: 'mocks',    allow: ['shared', 'entities', 'features'] },
        ],
      }],
    },
  },
)
