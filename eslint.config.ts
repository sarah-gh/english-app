import pluginVue from 'eslint-plugin-vue';
import vueTsEslintConfig from '@vue/eslint-config-typescript';
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting';

export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },
  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
  },
  ...pluginVue.configs['flat/recommended'],
  {
    rules: {
      // ERROR
      'vue/no-mutating-props': 2,
      'vue/no-use-v-if-with-v-for': 2,
      'vue/require-prop-type-constructor': 2,
      'vue/no-export-in-script-setup': 2,
      'vue/no-reserved-props': 2,
      'vue/no-side-effects-in-computed-properties': 2,
      'vue/require-component-is': 2,
      'vue/require-v-for-key': 2,
      'vue/require-valid-default-prop': 2,
      'vue/component-name-in-template-casing': [2, 'PascalCase'],
      'vue/component-definition-name-casing': [2, 'PascalCase'],
      'vue/no-unused-vars': [
        2,
        {
          ignorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        2,
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // WARNING
      'vue/attributes-order': [
        1,
        {
          order: [
            'DEFINITION',
            'LIST_RENDERING',
            'CONDITIONALS',
            'RENDER_MODIFIERS',
            'GLOBAL',
            ['UNIQUE', 'SLOT'],
            'TWO_WAY_BINDING',
            'OTHER_DIRECTIVES',
            'OTHER_ATTR',
            'EVENTS',
            'CONTENT',
          ],
          alphabetical: false,
        },
      ],
      'no-console': [1, { allow: ['error', 'warn'] }],
      'vue/no-arrow-functions-in-watch': 1,
      'vue/no-unused-components': 1,
      'vue/require-toggle-inside-transition': 1,
      'vue/attribute-hyphenation': 1,
      // 'vue/multi-word-component-names': [
      //   1,
      //   {
      //     ignores: [''],
      //   },
      // ],
      // OFF
      'vue/html-self-closing': 0,
      'vue/html-indent': 0,
      'vue/singleline-html-element-content-newline': 0,
      'vue/max-attributes-per-line': 0,
      'vue/html-closing-bracket-newline': 0,
      'vue/multiline-html-element-content-newline': 0,
      'vue/no-multi-spaces': 0,
    },
  },
  {
    files: ['src/pages/**/*.vue'], // Adjust this path to target your specific directory
    rules: {
      'vue/multi-word-component-names': 0,
    },
  },
  ...vueTsEslintConfig(),
  skipFormatting,
];
