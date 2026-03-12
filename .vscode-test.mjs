import { defineConfig } from '@vscode/test-cli';
export default defineConfig({
  label: 'e2e',
  files: 'out/e2e-tests/**/*.test.js',
  extensionDevelopmentPath: '.',
  workspaceFolder: './test-fixtures/workspace',
  mocha: { ui: 'tdd', timeout: 30000 },
});
