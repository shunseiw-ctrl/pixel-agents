import * as assert from 'assert';
import { activateExtension, focusPanelAndWait } from './helpers/activation';
import {
  backupLayoutFile,
  restoreLayoutFile,
  readLayoutFile,
  layoutDirExists,
  layoutFileExists,
} from './helpers/cleanup';

suite('Layout Persistence', () => {
  let backup: string | null = null;

  suiteSetup(async () => {
    backup = backupLayoutFile();
    await activateExtension();
    // Focus panel and wait for webview init + layout load
    await focusPanelAndWait(5000);
  });

  suiteTeardown(() => {
    restoreLayoutFile(backup);
  });

  test('レイアウトディレクトリ存在', () => {
    assert.ok(layoutDirExists(), '~/.pixel-agents/ should exist');
  });

  test('レイアウトファイル存在', () => {
    assert.ok(layoutFileExists(), 'layout.json should exist');
  });

  test('JSON構造が正しい', () => {
    const layout = readLayoutFile() as Record<string, unknown> | null;
    assert.ok(layout, 'layout.json should be parseable');
    assert.strictEqual(layout.version, 1, 'version should be 1');
    assert.ok(Array.isArray(layout.tiles), 'tiles should be an array');
  });

  test('必須フィールド完備', () => {
    const layout = readLayoutFile() as Record<string, unknown> | null;
    assert.ok(layout, 'layout.json should be parseable');
    assert.ok('cols' in layout, 'cols should exist');
    assert.ok('rows' in layout, 'rows should exist');
    assert.ok('tiles' in layout, 'tiles should exist');
    assert.ok('furniture' in layout, 'furniture should exist');
  });
});
