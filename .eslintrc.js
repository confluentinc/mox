// @flow
// (Copyright) Confluent, Inc.

module.exports = {
  root: true,
  env: {
    browser: true,
    es6: true,
    jest: true,
    node: true,
  },
  extends: ['eslint:recommended', 'prettier', 'prettier/flowtype', 'plugin:node/recommended'],
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  plugins: ['flowtype', 'import', 'prettier', 'node'],
  settings: {
    flowtype: {
      onlyFilesWithFlowAnnotation: false,
    },
  },
  rules: {
    'prettier/prettier': [
      2,
      {
        bracketSpacing: true,
        jsxBracketSameLine: false,
        parser: 'flow',
        printWidth: 100,
        semi: true,
        singleQuote: true,
        tabWidth: 2,
        trailingComma: 'es5',
      },
    ],
    camelcase: [2, { properties: 'never' }],
    curly: 2,
    'dot-notation': 2,
    eqeqeq: [2, 'smart'],
    'flowtype/boolean-style': 2,
    'flowtype/define-flow-type': 2,
    'flowtype/sort-keys': 2,
    'flowtype/require-parameter-type': 0,
    'flowtype/require-return-type': 0,
    'flowtype/require-valid-file-annotation': [2, 'always', { annotationStyle: 'none' }],
    'flowtype/type-id-match': 0,
    'flowtype/use-flow-type': 2,
    'import/namespace': 2,
    'import/default': 0,
    'import/no-restricted-paths': 0,
    'import/export': 2,
    'import/no-named-as-default-member': 1,
    'import/no-deprecated': 2,
    'import/first': 2,
    'import/no-duplicates': 2,
    'import/no-namespace': 0,
    'import/extensions': [
      2,
      {
        js: 'never',
        json: 'always',
      },
    ],
    'import/order': [
      2,
      {
        'newlines-between': 'always',
        groups: ['builtin', 'external', 'parent', 'sibling', 'index'],
      },
    ],
    'no-console': 2,
    'node/no-unsupported-features/es-syntax': 0,
  },
};
