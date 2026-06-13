import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "prefer-const": "warn",
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
  {
    files: ["src/lib/prisma-types.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "prefer-const": "off",
    },
  },
  {
    files: ["src/components/students/student-qr-image.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
];
