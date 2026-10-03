import safeql from "@ts-safeql/eslint-plugin/config";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { projectService: true },
    },
  },
  safeql.configs.connections({
    // A throwaway database built from db/migrations, so the check
    // never depends on the state of the dev DB.
    connectionUrl: "postgres://user:password@localhost:5552/postgres",
    databaseName: "safeql_shadow",
    migrationsDir: "./db/migrations",
    targets: [{ tag: "sql", transform: "{type}[]" }],
    overrides: { types: { int8range: "string" } },
  }),
);
