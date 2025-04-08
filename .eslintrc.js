module.exports = {
    parser: '@typescript-eslint/parser',
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'prettier'
    ],
    plugins: ['@typescript-eslint'],
    rules: {
      // Custom rules
    },
    env: {
      node: true,
      jest: true
    }
  };