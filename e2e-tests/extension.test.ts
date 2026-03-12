import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateExtension } from './helpers/activation';

const EXTENSION_ID = 'pablodelucca.pixel-agents';

suite('Extension Activation', () => {
  test('拡張機能がインストール済み', () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `Extension ${EXTENSION_ID} should be found`);
  });

  test('アクティベーション成功', async () => {
    const ext = await activateExtension();
    assert.strictEqual(ext.isActive, true, 'Extension should be active');
  });

  test('WebviewViewProviderが登録済み', async () => {
    await activateExtension();
    await assert.doesNotReject(async () => {
      await vscode.commands.executeCommand('pixel-agents.panelView.focus');
    }, 'panelView.focus command should be executable');
  });

  test('二重アクティベーションで問題なし', async () => {
    const ext = await activateExtension();
    await ext.activate();
    assert.strictEqual(ext.isActive, true, 'Extension should still be active');
  });
});
