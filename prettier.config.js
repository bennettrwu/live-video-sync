/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  tabWidth: 2,
  useTabs: false,
  endOfLine: 'lf',
  printWidth: 80,

  semi: true,
  singleQuote: true,
  jsxSingleQuote: false,

  // Enforce import grouping and ordering
  importOrder: [
    '^react$',
    '<THIRD_PARTY_MODULES>',
    '^@live-video-sync/(.*)',
    '^#(src|tests)/(.*)',
    '^[./]',
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  plugins: ['@trivago/prettier-plugin-sort-imports'],
};

export default config;
