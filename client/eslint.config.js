import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import tseslint from "typescript-eslint";

export default [
  // Ignore build artifacts
  {
    ignores: ["dist/**", "node_modules/**"],
  },

  js.configs.recommended,

  ...pluginVue.configs["flat/recommended"],

  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,vue,js}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "vue/multi-word-component-names": "off",
      "quotes": ["error", "double", { "avoidEscape": true }],
      "vue/html-quotes": ["error", "double", { avoidEscape: true }],
    },
  },
];
