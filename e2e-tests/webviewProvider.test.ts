import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateExtension, sleep } from './helpers/activation';

suite('WebviewView Provider', () => {
  suiteSetup(async () => {
    await activateExtension();
  });

  test('パネルフォーカス可能', async () => {
    await assert.doesNotReject(async () => {
      await vscode.commands.executeCommand('pixel-agents.panelView.focus');
    }, 'panelView.focus should not throw');
  });

  test('連続フォーカスで安定', async () => {
    for (let i = 0; i < 3; i++) {
      await assert.doesNotReject(
        async () => {
          await vscode.commands.executeCommand('pixel-agents.panelView.focus');
        },
        `panelView.focus should not throw on attempt ${i + 1}`,
      );
      await sleep(500);
    }
  });

  test('フォーカス後にshowPanelも動作', async () => {
    await vscode.commands.executeCommand('pixel-agents.panelView.focus');
    await sleep(500);
    await assert.doesNotReject(async () => {
      await vscode.commands.executeCommand('pixel-agents.showPanel');
    }, 'showPanel should work after panelView.focus');
  });
});
