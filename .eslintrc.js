module.exports = {
  'extends': [
    'airbnb-base',
  ],
  'parserOptions': {
    'ecmaVersion': 9,
    'sourceType': 'module',
  },
  'env': {
    'es6': true,
  },
  'plugins': [
    'import'
  ],
  'rules': {
    'array-callback-return': 'off',
    'arrow-body-style': 'off',
    'arrow-parens': 'off',
    'class-methods-use-this': 'off',
    'consistent-return': 'off',
    'func-names': 'off',
    'import/no-unresolved': [
      'error',
      {
        'caseSensitive': true,
        'commonjs': true,
        'ignore': ['^[^.]']
      }
    ],
    'max-len': 'off',
    'no-cond-assign': 'off',
    'no-confusing-arrow': 'off',
    'no-continue': 'off',
    'no-lonely-if': 'off',
    'no-loop-func': 'off',
    'no-mixed-operators': 'off',
    'no-new-func': 'off',
    'no-param-reassign': 'off',
    'no-plusplus': 'off',
    'no-restricted-globals': 'off',
    'no-restricted-syntax': 'off',
    'no-return-assign': 'off',
    'no-underscore-dangle': 'off',
    'no-unused-expressions': 'off',
    'no-use-before-define': 'off',
    'object-curly-newline': 'off',
    'prefer-destructuring': 'off',
    'prefer-template': 'off',
  },
  'globals': {
    'CustomEvent': true,
    'Touch': true,
    'TouchEvent': true,
  }
}
